import { db } from "./db";
import { Prisma } from "@/generated/prisma/client";
import { bookingSchema, slotSchema } from "./validation";
import { addDays, today, weekday, instant } from "./time";
import { calculateSlots, canCancel } from "./scheduling";
import { AppError } from "./errors";
type Tx = Prisma.TransactionClient;
const active = ["PENDING", "CONFIRMED"] as const;
export async function serial<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: "Serializable",
        timeout: 15000,
      });
    } catch (e) {
      if ((e as { code?: string }).code === "P2034" && attempt < 3) continue;
      throw e;
    }
  }
}
export async function availability(
  raw: unknown,
  customerId?: string,
  tx: Tx = db,
  now = new Date(),
) {
  const q = slotSchema.parse(raw);
  const shop = await tx.barbershop.findUnique({
    where: { id: q.shopId },
    include: {
      hours: true,
      staff: {
        where: {
          isActive: true,
          ...(q.staffId !== "any" ? { id: q.staffId } : {}),
        },
        include: { hours: true, breaks: { where: { date: q.date } } },
      },
      services: { where: { id: q.serviceId, isActive: true } },
    },
  });
  if (!shop?.isActive)
    throw new AppError("Berber bulunamadı veya rezervasyona kapalı.", 404);
  if (
    q.date < today(now) ||
    q.date > addDays(today(now), shop.bookingWindowDays - 1)
  )
    throw new AppError("Önümüzdeki 30 gün içinden bir tarih seçin.");
  if (customerId) {
    const ban = await tx.customerBan.findUnique({
      where: { barbershopId_customerId: { barbershopId: shop.id, customerId } },
    });
    if (ban && (!ban.bannedUntil || ban.bannedUntil > now))
      throw new AppError(
        ban.bannedUntil
          ? `Bu berberden ${new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "long", timeStyle: "short" }).format(ban.bannedUntil)} tarihine kadar randevu alamazsınız.`
          : "Bu berberden randevu almanız süresiz kısıtlanmış.",
        403,
      );
  }
  const service = shop.services[0];
  if (!service) throw new AppError("Hizmet bulunamadı.", 404);
  const hours = shop.hours.find((h) => h.dayOfWeek === weekday(q.date));
  if (!hours || hours.isClosed)
    return { slots: [], closed: true, service, shop };
  const appointments = await tx.appointment.findMany({
    where: {
      staffId: { in: shop.staff.map((s) => s.id) },
      date: q.date,
      status: { not: "CANCELLED" },
    },
  });
  const slots = calculateSlots({
    date: q.date,
    duration: service.durationMinutes,
    step: service.durationMinutes,
    hours,
    now,
    staff: shop.staff.map((s) => ({
      id: s.id,
      hours: s.hours.find((h) => h.dayOfWeek === weekday(q.date)),
      busy: [...s.breaks, ...appointments.filter((a) => a.staffId === s.id)],
    })),
  });
  return { slots, closed: false, service, shop };
}
export async function book(customerId: string, raw: unknown, now = new Date()) {
  const q = bookingSchema.parse(raw);
  return serial(async (tx) => {
    const a = await availability(q, customerId, tx, now);
    const existing = await tx.appointment.findFirst({
      where: { customerId, date: q.date, status: { in: [...active] } },
    });
    if (existing)
      throw new AppError("Günde yalnızca 1 aktif randevu alabilirsiniz.", 409);
    const slot = a.slots.find((s) => s.startMin === q.startMin);
    if (!slot)
      throw new AppError(
        "Bu saat artık müsait değil. Başka bir saat seçin.",
        409,
      );
    const endsAt = instant(q.date, q.startMin + a.service.durationMinutes);
    const appointment = await tx.appointment.create({
      data: {
        barbershopId: q.shopId,
        customerId,
        serviceId: q.serviceId,
        staffId: slot.staffIds[0],
        date: q.date,
        startMin: q.startMin,
        endMin: q.startMin + a.service.durationMinutes,
        startsAt: instant(q.date, q.startMin),
        endsAt,
        serviceName: a.service.name,
        price: a.service.price,
      },
    });
    await tx.notification.createMany({
      data: [customerId, a.shop.ownerId].flatMap((recipient) => [
        {
          appointmentId: appointment.id,
          kind: "CONFIRMATION",
          recipient,
          scheduledAt: now,
        },
        {
          appointmentId: appointment.id,
          kind: "REMINDER",
          recipient,
          scheduledAt: new Date(
            Math.max(now.getTime(), appointment.startsAt.getTime() - 3600000),
          ),
        },
      ]),
      skipDuplicates: true,
    });
    return appointment;
  });
}
export async function changeAppointment(
  actorId: string,
  id: string,
  action: string,
  reason = "",
  banDays?: number,
  now = new Date(),
) {
  return serial(async (tx) => {
    const a = await tx.appointment.findUnique({
      where: { id },
      include: { barbershop: true },
    });
    if (!a || (a.customerId !== actorId && a.barbershop.ownerId !== actorId))
      throw new AppError("Randevu bulunamadı.", 404);
    const owner = a.barbershop.ownerId === actorId;
    if (!active.includes(a.status as (typeof active)[number]))
      throw new AppError("Bu randevu için işlem zaten yapılmış.", 409);
    if (action === "CANCELLED") {
      if (!owner && !canCancel(a.startsAt, now))
        throw new AppError("Son 2 saat içinde iptal için berberi arayın.", 403);
    } else {
      if (!owner) throw new AppError("Bu işlem için yetkiniz yok.", 403);
      if (!["COMPLETED", "NO_SHOW"].includes(action))
        throw new AppError("Geçersiz durum.");
      if (a.endsAt > now)
        throw new AppError("Randevu süresi bitmeden bu işlem yapılamaz.");
    }
    if (banDays !== undefined && action !== "NO_SHOW")
      throw new AppError(
        "Uzaklaştırma yalnızca gelmeyen müşteriye uygulanabilir.",
      );
    const result = await tx.appointment.update({
      where: { id },
      data: {
        status: action as "CANCELLED" | "COMPLETED" | "NO_SHOW",
        cancelReason: action === "CANCELLED" ? reason : null,
      },
    });
    if (banDays !== undefined) {
      if (![0, 3, 7, 30].includes(banDays))
        throw new AppError("Geçersiz uzaklaştırma süresi.");
      const bannedUntil =
        banDays === 0 ? null : new Date(now.getTime() + banDays * 86400000);
      await tx.customerBan.upsert({
        where: {
          barbershopId_customerId: {
            barbershopId: a.barbershopId,
            customerId: a.customerId,
          },
        },
        create: {
          barbershopId: a.barbershopId,
          customerId: a.customerId,
          bannedUntil,
          reason: reason || "Randevuya gelmedi.",
        },
        update: { bannedUntil, reason: reason || "Randevuya gelmedi." },
      });
    }
    return result;
  });
}
