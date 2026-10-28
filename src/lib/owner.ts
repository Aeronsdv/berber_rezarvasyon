import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "./errors";
import { serial } from "./reservations";
import {
  shopSchema,
  hoursSchema,
  staffSchema,
  serviceSchema,
  breakSchema,
  slugify,
} from "./validation";
import { today, weekday } from "./time";
import { overlaps } from "./scheduling";
export async function owned(
  tx: Prisma.TransactionClient,
  userId: string,
  shopId: string,
) {
  const shop = await tx.barbershop.findFirst({
    where: { id: shopId, ownerId: userId },
  });
  if (!shop) throw new AppError("İşletme bulunamadı.", 404);
  return shop;
}
export async function createShop(userId: string, raw: unknown) {
  const data = shopSchema.parse(raw);
  return serial(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: "OWNER" } });
    return tx.barbershop.create({
      data: {
        ...data,
        ownerId: userId,
        slug: `${slugify(data.name)}-${randomUUID().slice(0, 8)}`,
        hours: {
          create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            dayOfWeek,
            openMin: 540,
            closeMin: 1200,
            isClosed: dayOfWeek === 0,
          })),
        },
        subscription: {
          create: { trialEndsAt: new Date(Date.now() + 14 * 86400000) },
        },
      },
    });
  });
}
export async function manageShop(userId: string, shopId: string, raw: unknown) {
  const command = z
    .object({
      action: z.enum([
        "shop",
        "hours",
        "staff",
        "staffHours",
        "service",
        "break",
        "removeBreak",
        "unban",
      ]),
      id: z.string().max(100).optional(),
      data: z.unknown(),
    })
    .parse(raw);
  return serial(async (tx) => {
    await owned(tx, userId, shopId);
    const future = () =>
      tx.appointment.findMany({
        where: {
          barbershopId: shopId,
          endsAt: { gt: new Date() },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });
    if (command.action === "shop")
      return tx.barbershop.update({
        where: { id: shopId },
        data: shopSchema.parse(command.data),
      });
    if (command.action === "hours" || command.action === "staffHours") {
      const hours = hoursSchema.parse(command.data);
      if (command.action === "staffHours") {
        if (
          !command.id ||
          !(await tx.staff.findFirst({
            where: { id: command.id, barbershopId: shopId },
          }))
        )
          throw new AppError("Usta bulunamadı.", 404);
      }
      const appointments = (await future()).filter(
        (a) => command.action === "hours" || a.staffId === command.id,
      );
      if (
        appointments.some((a) => {
          const h = hours.find((h) => h.dayOfWeek === weekday(a.date))!;
          return h.isClosed || a.startMin < h.openMin || a.endMin > h.closeMin;
        })
      )
        throw new AppError(
          "Yeni çalışma saatleri mevcut randevularla çakışıyor. Önce ilgili randevuları yönetin.",
          409,
        );
      for (const h of hours) {
        if (command.action === "hours")
          await tx.workingHours.upsert({
            where: {
              barbershopId_dayOfWeek: {
                barbershopId: shopId,
                dayOfWeek: h.dayOfWeek,
              },
            },
            create: { ...h, barbershopId: shopId },
            update: h,
          });
        else
          await tx.staffHours.upsert({
            where: {
              staffId_dayOfWeek: {
                staffId: command.id!,
                dayOfWeek: h.dayOfWeek,
              },
            },
            create: { ...h, staffId: command.id! },
            update: h,
          });
      }
      return { ok: true };
    }
    if (command.action === "staff") {
      const data = staffSchema.parse(command.data);
      if (!command.id)
        return tx.staff.create({ data: { ...data, barbershopId: shopId } });
      if (
        !(await tx.staff.findFirst({
          where: { id: command.id, barbershopId: shopId },
        }))
      )
        throw new AppError("Usta bulunamadı.", 404);
      if (
        !data.isActive &&
        (await future()).some((a) => a.staffId === command.id)
      )
        throw new AppError("Ustanın gelecek randevularını önce yönetin.", 409);
      return tx.staff.update({ where: { id: command.id }, data });
    }
    if (command.action === "service") {
      const data = serviceSchema.parse(command.data);
      if (!command.id)
        return tx.service.create({ data: { ...data, barbershopId: shopId } });
      if (
        !(await tx.service.findFirst({
          where: { id: command.id, barbershopId: shopId },
        }))
      )
        throw new AppError("Hizmet bulunamadı.", 404);
      return tx.service.update({ where: { id: command.id }, data });
    }
    if (command.action === "break") {
      const data = breakSchema.parse(command.data);
      if (data.date < today())
        throw new AppError("Geçmiş güne mola eklenemez.");
      if (
        !(await tx.staff.findFirst({
          where: { id: data.staffId, barbershopId: shopId },
        }))
      )
        throw new AppError("Usta bulunamadı.", 404);
      const booked = await tx.appointment.findMany({
        where: {
          staffId: data.staffId,
          date: data.date,
          status: { not: "CANCELLED" },
        },
      });
      if (booked.some((a) => overlaps(a, data)))
        throw new AppError("Bu mola mevcut bir randevuyla çakışıyor.", 409);
      return tx.staffBreak.create({ data });
    }
    if (!command.id) throw new AppError("Kayıt seçilmedi.");
    if (command.action === "removeBreak") {
      const result = await tx.staffBreak.deleteMany({
        where: { id: command.id, staff: { barbershopId: shopId } },
      });
      if (!result.count) throw new AppError("Mola bulunamadı.", 404);
      return { ok: true };
    }
    const result = await tx.customerBan.deleteMany({
      where: { id: command.id, barbershopId: shopId },
    });
    if (!result.count) throw new AppError("Kısıtlama bulunamadı.", 404);
    return { ok: true };
  });
}
