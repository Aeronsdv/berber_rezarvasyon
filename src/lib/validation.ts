import { z } from "zod";
import { validDate } from "./time";
export const dateSchema = z
  .string()
  .refine(validDate, "Geçerli bir tarih seçin.");
const id = z.string().min(1).max(100);
export const photoSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .url()
      .max(2000)
      .refine((v) => v.startsWith("https://"), "Görsel adresi HTTPS olmalı."),
  ])
  .optional();
export const shopSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(2000).default(""),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .regex(/^\+?[\d\s()-]{10,20}$/, "Geçerli bir telefon girin."),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  coverImage: photoSchema,
  isActive: z.boolean().default(true),
});
export const hoursSchema = z
  .array(
    z
      .object({
        dayOfWeek: z.number().int().min(0).max(6),
        openMin: z.number().int().min(0).max(1439),
        closeMin: z.number().int().min(1).max(1439),
        isClosed: z.boolean(),
      })
      .refine(
        (h) => h.isClosed || h.openMin < h.closeMin,
        "Kapanış saati açılıştan sonra olmalı.",
      ),
  )
  .length(7)
  .refine(
    (h) => new Set(h.map((x) => x.dayOfWeek)).size === 7,
    "Her gün bir kez tanımlanmalı.",
  );
export const staffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(80),
  photo: photoSchema,
  isActive: z.boolean().default(true),
});
export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  durationMinutes: z.coerce
    .number()
    .int()
    .refine((duration) => [15, 30, 45, 60].includes(duration), "Süre 15, 30, 45 veya 60 dakika olmalı."),
  price: z.coerce
    .number()
    .min(0)
    .max(100000)
    .refine(
      (p) => Math.abs(p * 100 - Math.round(p * 100)) < 0.00001,
      "En fazla iki ondalık basamak kullanın.",
    ),
  isActive: z.boolean().default(true),
});
export const bookingSchema = z.object({
  shopId: id,
  serviceId: id,
  staffId: id.default("any"),
  date: dateSchema,
  startMin: z.number().int().min(0).max(1439),
});
export const slotSchema = bookingSchema.omit({ startMin: true });
export const breakSchema = z
  .object({
    staffId: id,
    date: dateSchema,
    startMin: z.number().int().min(0).max(1439),
    endMin: z.number().int().min(1).max(1439),
    reason: z.string().trim().max(100).default("Mola"),
  })
  .refine(
    (b) => b.startMin < b.endMin,
    "Mola bitişi başlangıçtan sonra olmalı.",
  );
export const reviewSchema = z.object({
  appointmentId: id,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(1000),
});
export function slugify(s: string) {
  return (
    s
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 65) || "berber"
  );
}
