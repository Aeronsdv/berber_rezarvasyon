import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../../src/lib/db";
import { submitReview } from "../../src/lib/reviews";
import {
  book,
  availability,
  changeAppointment,
} from "../../src/lib/reservations";
import { createShop, manageShop } from "../../src/lib/owner";
import { addDays, today, instant } from "../../src/lib/time";
test("PostgreSQL reservation, ownership and concurrency guards", async (t) => {
  const prefix = `test-${randomUUID()}`;
  const users = await Promise.all(
    Array.from({ length: 9 }, (_, i) =>
      db.user.create({
        data: { email: `${prefix}-${i}@example.com`, name: `Test ${i}` },
      }),
    ),
  );
  const ids = users.map((u) => u.id);
  const shops: string[] = [];
  try {
    for (let i = 0; i < 2; i++) {
      const shop = await createShop(users[i].id, {
        name: `${prefix} ${i}`,
        address: "Test adresi 123",
        city: "İstanbul",
        district: "Kadıköy",
        phone: "+905550000000",
        latitude: 41,
        longitude: 29,
      });
      shops.push(shop.id);
      await manageShop(users[i].id, shop.id, {
        action: "hours",
        data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          openMin: 540,
          closeMin: 1200,
          isClosed: false,
        })),
      });
      await manageShop(users[i].id, shop.id, {
        action: "staff",
        data: { name: "Test Usta", title: "Berber" },
      });
      await manageShop(users[i].id, shop.id, {
        action: "service",
        data: { name: "Test Kesim", durationMinutes: 50, price: 123.45 },
      });
    }
    const staff = await Promise.all(
      shops.map((barbershopId) =>
        db.staff.findFirstOrThrow({ where: { barbershopId } }),
      ),
    );
    const services = await Promise.all(
      shops.map((barbershopId) =>
        db.service.findFirstOrThrow({ where: { barbershopId } }),
      ),
    );
    const date = addDays(today(), 2);
    const q = {
      shopId: shops[0],
      staffId: staff[0].id,
      serviceId: services[0].id,
      date,
      startMin: 540,
    };
    await t.test(
      "two customers racing for same staff slot yield one reservation",
      async () => {
        const results = await Promise.allSettled([
          book(users[2].id, q),
          book(users[3].id, q),
        ]);
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.equal(
          await db.appointment.count({ where: { barbershopId: shops[0] } }),
          1,
        );
      },
    );
    await t.test(
      "same customer racing across shops still has one daily reservation",
      async () => {
        const results = await Promise.allSettled([
          book(users[4].id, { ...q, startMin: 660 }),
          book(users[4].id, {
            ...q,
            shopId: shops[1],
            staffId: staff[1].id,
            serviceId: services[1].id,
          }),
        ]);
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      },
    );
    await t.test(
      "database rejects overlap even when bypassing booking service",
      async () => {
        const booked = await db.appointment.findFirstOrThrow({
          where: { barbershopId: shops[0], startMin: 540 },
        });
        const {
          id: _id,
          createdAt: _created,
          updatedAt: _updated,
          ...copy
        } = booked;
        void _id;
        void _created;
        void _updated;
        await assert.rejects(
          db.appointment.create({
            data: {
              ...copy,
              customerId: users[5].id,
              startMin: 555,
              endMin: 605,
              startsAt: instant(date, 555),
              endsAt: instant(date, 605),
            },
          }),
        );
      },
    );
    await t.test(
      "cross-shop service and staff references are rejected",
      async () => {
        await assert.rejects(
          book(users[5].id, { ...q, serviceId: services[1].id, startMin: 780 }),
        );
        await assert.rejects(
          book(users[5].id, { ...q, staffId: staff[1].id, startMin: 780 }),
        );
      },
    );
    await t.test("owners cannot edit another shop or staff", async () => {
      await assert.rejects(
        manageShop(users[1].id, shops[0], {
          action: "staff",
          id: staff[0].id,
          data: { name: "Injected", title: "Berber" },
        }),
      );
      await assert.rejects(
        manageShop(users[0].id, shops[0], {
          action: "staff",
          id: staff[1].id,
          data: { name: "Injected", title: "Berber" },
        }),
      );
    });
    await t.test("molalar and staff hours affect available slots", async () => {
      await manageShop(users[0].id, shops[0], {
        action: "break",
        data: {
          staffId: staff[0].id,
          date,
          startMin: 900,
          endMin: 960,
          reason: "Test",
        },
      });
      const a = await availability(q);
      assert.equal(
        a.slots.some((s) => s.startMin === 900),
        false,
      );
      await assert.rejects(
        manageShop(users[0].id, shops[0], {
          action: "break",
          data: { staffId: staff[0].id, date, startMin: 540, endMin: 600 },
        }),
      );
    });
    await t.test(
      "customer cancellation checks ownership and exactly 2 hours",
      async () => {
        const a = await book(users[6].id, { ...q, startMin: 780 });
        await assert.rejects(changeAppointment(users[7].id, a.id, "CANCELLED"));
        await assert.rejects(
          changeAppointment(
            users[6].id,
            a.id,
            "CANCELLED",
            "",
            undefined,
            new Date(a.startsAt.getTime() - 7199999),
          ),
        );
        await changeAppointment(
          users[6].id,
          a.id,
          "CANCELLED",
          "Test",
          undefined,
          new Date(a.startsAt.getTime() - 7200000),
        );
        await book(users[6].id, { ...q, startMin: 780 });
      },
    );
    await t.test(
      "no-show requires owner, past end time, enforces shop-specific permanent ban",
      async () => {
        const a = await book(users[7].id, { ...q, startMin: 1020 });
        await assert.rejects(changeAppointment(users[7].id, a.id, "NO_SHOW"));
        await assert.rejects(changeAppointment(users[0].id, a.id, "NO_SHOW"));
        await changeAppointment(
          users[0].id,
          a.id,
          "NO_SHOW",
          "Test",
          0,
          new Date(a.endsAt.getTime() + 1),
        );
        await assert.rejects(
          availability({ ...q, date: addDays(date, 1) }, users[7].id),
          /süresiz/,
        );
        await book(users[7].id, {
          ...q,
          date: addDays(date, 1),
          shopId: shops[1],
          serviceId: services[1].id,
          staffId: staff[1].id,
        });
      },
    );
    await t.test(
      "cancelled slots are released; service price snapshot survives edit",
      async () => {
        const a = await book(users[8].id, { ...q, startMin: 1140 });
        await manageShop(users[0].id, shops[0], {
          action: "service",
          id: services[0].id,
          data: { name: "New Service", durationMinutes: 30, price: 999 },
        });
        const persisted = await db.appointment.findUniqueOrThrow({
          where: { id: a.id },
        });
        assert.equal(Number(persisted.price), 123.45);
        assert.equal(persisted.endMin, 1190);
        await changeAppointment(users[8].id, a.id, "CANCELLED");
        assert.equal(
          (await availability(q)).slots.some((s) => s.startMin === 1140),
          true,
        );
      },
    );
    await t.test(
      "only completed owned appointments accept exactly one verified review",
      async () => {
        const a = await book(users[8].id, {
          ...q,
          date: addDays(date, 3),
          startMin: 540,
        });
        const review = {
          appointmentId: a.id,
          rating: 5,
          comment: "Test değerlendirme",
        };
        await assert.rejects(submitReview(users[8].id, review));
        await changeAppointment(
          users[0].id,
          a.id,
          "COMPLETED",
          "",
          undefined,
          new Date(a.endsAt.getTime() + 1),
        );
        await assert.rejects(submitReview(users[7].id, review));
        await assert.rejects(
          submitReview(users[8].id, { ...review, rating: 6 }),
        );
        await submitReview(users[8].id, review);
        await assert.rejects(submitReview(users[8].id, review));
        assert.equal(
          await db.review.count({ where: { appointmentId: a.id } }),
          1,
        );
      },
    );
    await t.test(
      "working hours cannot invalidate future reservations",
      async () => {
        await assert.rejects(
          manageShop(users[0].id, shops[0], {
            action: "hours",
            data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
              dayOfWeek,
              openMin: 1000,
              closeMin: 1200,
              isClosed: false,
            })),
          }),
          /çakışıyor/,
        );
      },
    );
  } finally {
    await db.notification.deleteMany({
      where: { appointment: { barbershopId: { in: shops } } },
    });
    await db.review.deleteMany({ where: { barbershopId: { in: shops } } });
    await db.appointment.deleteMany({ where: { barbershopId: { in: shops } } });
    await db.staff.deleteMany({ where: { barbershopId: { in: shops } } });
    await db.service.deleteMany({ where: { barbershopId: { in: shops } } });
    await db.barbershop.deleteMany({ where: { id: { in: shops } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
});
