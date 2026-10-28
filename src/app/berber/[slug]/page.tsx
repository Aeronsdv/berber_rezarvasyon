/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, ArrowLeft, Scissors, Star, Clock3 } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { Booking } from "@/components/booking";
import { FavoriteButton } from "@/components/ui";
import { DAYS, WEEK, clock, money } from "@/lib/time";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const s = await db.barbershop.findUnique({
    where: { slug: (await params).slug },
    select: { name: true, description: true },
  });
  return { title: s?.name ?? "Berber bulunamadı", description: s?.description };
}
export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    service?: string;
    staff?: string;
    date?: string;
    time?: string;
  }>;
}) {
  const { slug } = await params;
  const [shop, user, initial] = await Promise.all([
    db.barbershop.findUnique({
      where: { slug, isActive: true },
      include: {
        services: { where: { isActive: true }, orderBy: { price: "asc" } },
        staff: { where: { isActive: true } },
        hours: true,
        reviews: {
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        _count: { select: { reviews: true } },
      },
    }),
    currentUser(),
    searchParams,
  ]);
  if (!shop) notFound();
  const [favorite, ratings] = await Promise.all([
    user
      ? db.favorite.findUnique({
          where: {
            userId_barbershopId: { userId: user.id, barbershopId: shop.id },
          },
        })
      : null,
    db.review.aggregate({
      where: { barbershopId: shop.id },
      _avg: { rating: true },
    }),
  ]);
  return (
    <section className="container section">
      <Link className="back-link" href="/kesfet">
        <ArrowLeft size={15} /> Berberleri keşfet
      </Link>
      <div className="detail-cover">
        {shop.coverImage ? (
          <img src={shop.coverImage} alt={`${shop.name} salonu`} />
        ) : (
          <div className="detail-placeholder">
            <Scissors size={100} strokeWidth={0.8} />
          </div>
        )}
        <div className="detail-cover-shade" />
        <span className="detail-cover-label">USTA. SEÇKİSİ</span>
      </div>
      <div className="detail-layout">
        <div>
          <div className="row between">
            <span className="eyebrow">
              {shop.district} · {shop.city}
            </span>
            <FavoriteButton
              shopId={shop.id}
              saved={!!favorite}
              loggedIn={!!user}
            />
          </div>
          <h1 className="page-title">{shop.name}</h1>
          <div className="row wrap muted">
            <span className="rating">
              <Star size={16} fill="currentColor" />
              {ratings._avg.rating?.toFixed(1) ?? "Henüz puan yok"}{" "}
              <small>({shop._count.reviews} değerlendirme)</small>
            </span>
            <span>·</span>
            <span>{shop.staff.length} usta</span>
          </div>
          <p className="detail-description">
            {shop.description || "Ustanı seç, kendine zaman ayır."}
          </p>
          <div className="contact-row">
            <a
              href={`https://www.openstreetmap.org/?mlat=${shop.latitude}&mlon=${shop.longitude}#map=17/${shop.latitude}/${shop.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={18} />
              {shop.address}
            </a>
            <a href={`tel:${shop.phone.replace(/[^+\d]/g, "")}`}>
              <Phone size={17} />
              {shop.phone}
            </a>
          </div>
          <section className="detail-section">
            <h2>Biraz bakım, çok iyi his.</h2>
            <div className="service-list">
              {shop.services.map((s) => (
                <div key={s.id}>
                  <div>
                    <h3>{s.name}</h3>
                    <span className="muted row">
                      <Clock3 size={13} />
                      {s.durationMinutes} dakika
                    </span>
                  </div>
                  <strong>{money(s.price.toString())}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="detail-section">
            <h2>İşinin ustaları.</h2>
            <div className="staff-list">
              {shop.staff.map((s) => (
                <div key={s.id}>
                  {s.photo ? (
                    <img src={s.photo} alt={s.name} />
                  ) : (
                    <span className="staff-avatar">{s.name.slice(0, 1)}</span>
                  )}
                  <h3>{s.name}</h3>
                  <p>{s.title}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="detail-section">
            <h2>Çalışma saatleri</h2>
            <div className="hours-display">
              {WEEK.map((day) => {
                const h = shop.hours.find((h) => h.dayOfWeek === day);
                return (
                  <div key={day}>
                    <span>{DAYS[day]}</span>
                    <strong>
                      {!h || h.isClosed
                        ? "Kapalı"
                        : `${clock(h.openMin)} – ${clock(h.closeMin)}`}
                    </strong>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="detail-section">
            <h2>Ustasını bulanlar.</h2>
            <p className="muted">
              Yalnızca tamamlanmış randevulardan doğrulanmış yorumlar.
            </p>
            {shop.reviews.length ? (
              shop.reviews.map((r) => (
                <article className="review" key={r.id}>
                  <div className="row between">
                    <strong>
                      {r.customer.name?.split(" ")[0] ?? "Müşteri"}
                    </strong>
                    <span className="gold">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                  </div>
                  <p>{r.comment}</p>
                  <small className="muted">
                    Doğrulanmış randevu ·{" "}
                    {r.createdAt.toLocaleDateString("tr-TR", {
                      timeZone: "Europe/Istanbul",
                    })}
                  </small>
                </article>
              ))
            ) : (
              <p className="notice">
                Henüz yorum yok. İlk deneyimi sen paylaşabilirsin.
              </p>
            )}
          </section>
        </div>
        <Booking
          shopId={shop.id}
          slug={shop.slug}
          staff={shop.staff.map((s) => ({ id: s.id, name: s.name }))}
          services={shop.services.map((s) => ({
            id: s.id,
            name: s.name,
            price: s.price.toString(),
            durationMinutes: s.durationMinutes,
          }))}
          loggedIn={!!user}
          initial={initial}
        />
      </div>
    </section>
  );
}
