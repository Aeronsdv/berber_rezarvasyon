/**
 * Zaman yardımcıları. Tüm randevular İstanbul yerel saatine göre tutulur
 * (tarih = "YYYY-MM-DD", saat = gün içindeki dakika). Türkiye 2016'dan beri
 * sabit UTC+3 kullandığı için mutlak zaman dönüşümü sabit ofsetle yapılır.
 */

export const TIME_ZONE = "Europe/Istanbul";
const TZ_OFFSET = "+03:00";

export const DAY_NAMES = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

/** Pazartesi'den başlayan gösterim sırası */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** İstanbul'a göre bugünün tarihi (YYYY-MM-DD) */
export function todayStr(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** İstanbul'a göre şu anki gün içi dakika */
export function nowMin(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function toInstant(date: string, min: number): Date {
  return new Date(`${date}T${minToTime(min)}:00${TZ_OFFSET}`);
}

export function isValidDateStr(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(`${date}T12:00:00Z`));
}

export function formatDateLong(date: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatDateShort(date: string): { day: string; num: string; month: string } {
  const d = new Date(`${date}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", ...o }).format(d);
  return { day: f({ weekday: "short" }), num: f({ day: "numeric" }), month: f({ month: "short" }) };
}

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price);
}
