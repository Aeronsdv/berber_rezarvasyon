export const SERVICE_CATEGORIES = {
  HAIR: "Saç",
  BEARD: "Sakal",
  HAIR_BEARD: "Saç + Sakal",
  OTHER: "Diğer",
} as const;

export type ServiceCategory = keyof typeof SERVICE_CATEGORIES;

export const APPOINTMENT_STATUS = {
  CONFIRMED: "Onaylandı",
  COMPLETED: "Tamamlandı",
  NO_SHOW: "Gelmedi",
  CANCELLED: "İptal",
} as const;

export type AppointmentStatus = keyof typeof APPOINTMENT_STATUS;

/** Müşterinin randevusunu iptal edebileceği son süre (dakika) */
export const CANCEL_WINDOW_MIN = 120;

/** Aynı gün randevularında "şimdi"den sonra bırakılacak minimum pay (dakika) */
export const SAME_DAY_BUFFER_MIN = 15;

/** Bir müşterinin bir günde alabileceği maksimum randevu */
export const DAILY_LIMIT = 1;

export const BAN_OPTIONS = [
  { days: 1, label: "1 gün" },
  { days: 3, label: "3 gün" },
  { days: 7, label: "1 hafta" },
  { days: 30, label: "1 ay" },
  { days: 90, label: "3 ay" },
  { days: 0, label: "Süresiz" },
];

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

export function slugify(input: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u",
  };
  return input
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
}
