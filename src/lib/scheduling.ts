import { instant } from "./time";
export type Interval = { startMin: number; endMin: number };
export type Hours = { openMin: number; closeMin: number; isClosed: boolean };
export type Slot = { startMin: number; staffIds: string[] };
export const overlaps = (a: Interval, b: Interval) =>
  a.startMin < b.endMin && b.startMin < a.endMin;
export function calculateSlots(input: {
  date: string;
  duration: number;
  step: number;
  hours: Hours;
  staff: { id: string; hours?: Hours; busy: Interval[] }[];
  now?: Date;
}): Slot[] {
  const { date, duration, step, hours, staff } = input;
  if (hours.isClosed || step < 1 || duration < 1) return [];
  const earliest = (input.now ?? new Date()).getTime() + 15 * 60_000;
  const slots: Slot[] = [];
  for (let t = hours.openMin; t + duration <= hours.closeMin; t += step) {
    if (instant(date, t).getTime() < earliest) continue;
    const staffIds = staff
      .filter(
        (s) =>
          (!s.hours ||
            (!s.hours.isClosed &&
              t >= s.hours.openMin &&
              t + duration <= s.hours.closeMin)) &&
          !s.busy.some((b) =>
            overlaps(b, { startMin: t, endMin: t + duration }),
          ),
      )
      .map((s) => s.id);
    if (staffIds.length) slots.push({ startMin: t, staffIds });
  }
  return slots;
}
export function canCancel(startsAt: Date, now = new Date()) {
  return startsAt.getTime() - now.getTime() >= 120 * 60_000;
}
