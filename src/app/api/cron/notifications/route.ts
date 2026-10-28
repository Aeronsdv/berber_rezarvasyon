import { timingSafeEqual, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  const actual =
    req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (
    !expected ||
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return Response.json({ error: "Yetkisiz." }, { status: 401 });
  const url = process.env.NOTIFICATION_WEBHOOK_URL;
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!url || !secret)
    return Response.json(
      { error: "Bildirim sağlayıcısı yapılandırılmadı." },
      { status: 503 },
    );
  let sent = 0;
  const jobs = await db.notification.findMany({
    where: {
      sentAt: null,
      scheduledAt: { lte: new Date() },
      attempts: { lt: 5 },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
    },
    take: 30,
    orderBy: { scheduledAt: "asc" },
  });
  for (const job of jobs) {
    const lease = new Date(Date.now() + 120000);
    const claim = await db.notification.updateMany({
      where: {
        id: job.id,
        sentAt: null,
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
      },
      data: { lockedUntil: lease, attempts: { increment: 1 } },
    });
    if (!claim.count) continue;
    try {
      const appointment = await db.appointment.findUniqueOrThrow({
        where: { id: job.appointmentId },
        include: { barbershop: true },
      });
      if (
        !["PENDING", "CONFIRMED"].includes(appointment.status) ||
        appointment.startsAt < new Date()
      ) {
        await db.notification.update({
          where: { id: job.id },
          data: {
            sentAt: new Date(),
            lastError: "Randevu artık aktif değil; gönderilmedi.",
            lockedUntil: null,
          },
        });
        continue;
      }
      const user = await db.user.findUnique({
        where: { id: job.recipient },
        select: { phone: true, email: true, name: true },
      });
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
          "Idempotency-Key": job.id,
          "X-Request-Id": randomUUID(),
        },
        body: JSON.stringify({
          id: job.id,
          kind: job.kind,
          recipient: user,
          appointment: {
            id: appointment.id,
            shop: appointment.barbershop.name,
            phone: appointment.barbershop.phone,
            startsAt: appointment.startsAt,
            service: appointment.serviceName,
          },
        }),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });
      if (!response.ok) throw new Error(`Sağlayıcı HTTP ${response.status}`);
      await db.notification.update({
        where: { id: job.id },
        data: { sentAt: new Date(), lockedUntil: null, lastError: null },
      });
      sent++;
    } catch (error) {
      await db.notification.update({
        where: { id: job.id },
        data: {
          lastError: (error instanceof Error
            ? error.message
            : "Gönderilemedi"
          ).slice(0, 300),
          lockedUntil: new Date(Date.now() + 300000),
        },
      });
    }
  }
  return Response.json({ sent });
}
