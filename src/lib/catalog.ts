import { db } from "./db";
import { today, weekday, instant } from "./time";
export async function catalog() {
  const now = new Date();
  const shops = await db.barbershop.findMany({
    where: { isActive: true },
    include: {
      services: { where: { isActive: true }, orderBy: { price: "asc" } },
      hours: true,
      reviews: { select: { rating: true } },
      _count: { select: { staff: { where: { isActive: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return shops.map((s) => {
    const hours = s.hours.find((h) => h.dayOfWeek === weekday(today(now)));
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      address: s.address,
      city: s.city,
      district: s.district,
      latitude: s.latitude,
      longitude: s.longitude,
      coverImage: s.coverImage,
      serviceNames: s.services.map((x) => x.name),
      price: s.services[0] ? Number(s.services[0].price) : null,
      staffCount: s._count.staff,
      rating: s.reviews.length
        ? s.reviews.reduce((n, x) => n + x.rating, 0) / s.reviews.length
        : null,
      reviewCount: s.reviews.length,
      open:
        !!hours &&
        !hours.isClosed &&
        now >= instant(today(now), hours.openMin) &&
        now < instant(today(now), hours.closeMin),
    };
  });
}
export type ShopCardData = Awaited<ReturnType<typeof catalog>>[number];
