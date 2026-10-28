import { db } from "./db";
import { AppError } from "./errors";
import { reviewSchema } from "./validation";
export async function submitReview(customerId: string, raw: unknown) {
  const data = reviewSchema.parse(raw);
  const a = await db.appointment.findFirst({
    where: { id: data.appointmentId, customerId, status: "COMPLETED" },
  });
  if (!a)
    throw new AppError(
      "Yalnızca tamamlanan randevularınızı değerlendirebilirsiniz.",
      403,
    );
  return db.review.create({
    data: { ...data, customerId, barbershopId: a.barbershopId },
  });
}
