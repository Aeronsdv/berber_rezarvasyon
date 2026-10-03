import "server-only";
import { db } from "@/lib/db";
import { SAME_DAY_BUFFER_MIN } from "@/lib/constants";
import { addDays, dayOfWeek, minToTime, nowMin, todayStr } from "@/lib/time";

export type Slot = {
  time: string;
  startMin: number;
  /** Bu saatte boş olan ustalar */
  staffIds: string[];
};

export type SlotQuery = {
  shopId: string;
  serviceId: string;
  /** "any" = fark etmez */
  staffId: string;
  date: string;
};

export type SlotResult =
  | { ok: true; slots: Slot[]; closed: boolean; duration: number }
  | { ok: false; error: string };

type Interval = { startMin: number; endMin: number };

const overlaps = (a: Interval, b: Interval) => a.startMin < b.endMin && b.startMin < a.endMin;

/**
 * Bir gün için müsait başlangıç saatlerini hesaplar:
 * çalışma saatleri → hizmet süresi kadar ardışık boşluk → ustanın mevcut randevuları çıkarılır.
 */
export async function computeSlots(q: SlotQuery): Promise<SlotResult> {
  const shop = await db.barbershop.findUnique({
    where: { id: q.shopId },
    select: {
      id: true,
      slotInterval: true,
      bookingWindowDays: true,
      hours: true,
      staff: { where: { isActive: true }, select: { id: true } },
      services: { where: { id: q.serviceId, isActive: true }, select: { durationMinutes: true } },
    },
  });
  if (!shop) return { ok: false, error: "Berber bulunamadı." };

  const service = shop.services[0];
  if (!service) return { ok: false, error: "Hizmet bulunamadı." };
  const duration = service.durationMinutes;

  const today = todayStr();
  const lastDay = addDays(today, shop.bookingWindowDays - 1);
  if (q.date < today || q.date > lastDay) {
    return { ok: false, error: "Bu tarih için randevu alınamaz." };
  }

  const hours = shop.hours.find((h) => h.dayOfWeek === dayOfWeek(q.date));
  if (!hours || hours.isClosed) return { ok: true, slots: [], closed: true, duration };

  const staffIds =
    q.staffId === "any"
      ? shop.staff.map((s) => s.id)
      : shop.staff.filter((s) => s.id === q.staffId).map((s) => s.id);
  if (staffIds.length === 0) return { ok: false, error: "Usta bulunamadı." };

  const booked = await db.appointment.findMany({
    where: { staffId: { in: staffIds }, date: q.date, status: { not: "CANCELLED" } },
    select: { staffId: true, startMin: true, endMin: true },
  });

  const busyByStaff = new Map<string, Interval[]>();
  for (const b of booked) {
    const list = busyByStaff.get(b.staffId) ?? [];
    list.push(b);
    busyByStaff.set(b.staffId, list);
  }

  const earliest = q.date === today ? nowMin() + SAME_DAY_BUFFER_MIN : 0;
  const step = Math.max(5, shop.slotInterval);
  const slots: Slot[] = [];

  for (let t = hours.openMin; t + duration <= hours.closeMin; t += step) {
    if (t < earliest) continue;
    const candidate = { startMin: t, endMin: t + duration };
    const free = staffIds.filter(
      (id) => !(busyByStaff.get(id) ?? []).some((b) => overlaps(b, candidate)),
    );
    if (free.length > 0) slots.push({ time: minToTime(t), startMin: t, staffIds: free });
  }

  return { ok: true, slots, closed: false, duration };
}
