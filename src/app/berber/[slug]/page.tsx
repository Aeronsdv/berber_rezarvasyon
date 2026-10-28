/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  Scissors,
  Star,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { Booking } from "@/components/booking";
import { FavoriteButton, ShareButton } from "@/components/ui";
import {
  DAYS,
  WEEK,
  clock,
  duration,
  instant,
  money,
  today,
  weekday,
} from "@/lib/time";
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
  const [favorite, ratings, distribution] = await Promise.all([
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
    db.review.groupBy({
      by: ["rating"],
      where: { barbershopId: shop.id },
      _count: true,
    }),
  ]);
  const now = new Date();
  const day = weekday(today(now));
  const todayHours = shop.hours.find((h) => h.dayOfWeek === day);
  const isOpen =
    !!todayHours &&
    !todayHours.isClosed &&
    now >= instant(today(now), todayHours.openMin) &&
    now < instant(today(now), todayHours.closeMin);
  const opensLater =
    !!todayHours &&
    !todayHours.isClosed &&
    now < instant(today(now), todayHours.openMin);
  const openLabel = isOpen
    ? `Açık · Kapanış ${clock(todayHours!.closeMin)}`
    : opensLater
      ? `Kapalı · Açılış ${clock(todayHours!.openMin)}`
      : "Şu an kapalı";
  const avg = ratings._avg.rating;
  const total = shop._count.reviews;
  const minPrice = shop.services[0]?.price;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
  return (
    <section className="container page shop-page">
      <Link className="back-link" href="/kesfet">
        <ChevronLeft size={16} /> Keşfet
      </Link>
      <div className={`detail-cover rise ${shop.coverImage ? "" : "no-image"}`}>
        {shop.coverImage ? (
          <img src={shop.coverImage} alt={`${shop.name} salonu`} />
        ) : (
          <div className="detail-placeholder">
            <Scissors size={64} strokeWidth={1} />
          </div>
        )}
        <div className="detail-cover-shade" />
        <div className="cover-actions">
          <ShareButton title={shop.name} path={`/berber/${shop.slug}`} />
          <FavoriteButton
            shopId={shop.id}
            saved={!!favorite}
            loggedIn={!!user}
          />
        </div>
      </div>
      <div className="detail-layout">
        <div className="detail-main">
          <header className="detail-header">
            <span className="eyebrow">
              {shop.district} · {shop.city}
            </span>
            <h1 className="page-title">{shop.name}</h1>
            <div className="fact-row">
              <span className={`pill ${isOpen ? "open" : ""}`}>
                <i />
                {openLabel}
              </span>
              <span className="fact">
                <Star size={13} fill="currentColor" className="star" />
                {avg ? avg.toFixed(1) : "Yeni"}
                <small>({total})</small>
              </span>
              <span className="fact">
                <Users size={13} /> {shop.staff.length} usta
              </span>
            </div>
          </header>
          {shop.description && (
            <p className="detail-description">{shop.description}</p>
          )}
          <div className="contact-row">
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              <span className="contact-icon">
                <Navigation size={15} />
              </span>
              <span>
                <strong>Yol tarifi</strong>
                <small>{shop.address}</small>
              </span>
            </a>
            <a href={`tel:${shop.phone.replace(/[^+\d]/g, "")}`}>
              <span className="contact-icon">
                <Phone size={15} />
              </span>
              <span>
                <strong>Ara</strong>
                <small>{shop.phone}</small>
              </span>
            </a>
          </div>
          <section className="detail-section">
            <h2>Hizmetler</h2>
            <div className="service-list">
              {shop.services.map((s) => (
                <Link
                  key={s.id}
                  href={`/berber/${shop.slug}?service=${s.id}#rezervasyon`}
                  scroll={false}
                  className="service-row"
                >
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      <Clock3 size={11} /> {duration(s.durationMinutes)}
                    </small>
                  </span>
                  <span className="service-price">
                    {money(s.price.toString())}
                    <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
          {shop.staff.length > 0 && (
            <section className="detail-section">
              <h2>İşinin ustaları</h2>
              <div className="staff-list">
                {shop.staff.map((s) => (
                  <Link
                    key={s.id}
                    href={`/berber/${shop.slug}?staff=${s.id}#rezervasyon`}
                    scroll={false}
                    className="staff-card"
                  >
                    {s.photo ? (
                      <img src={s.photo} alt={s.name} />
                    ) : (
                      <span className="staff-avatar">{s.name.slice(0, 1)}</span>
                    )}
                    <strong>{s.name}</strong>
                    <small>{s.title}</small>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="detail-section">
            <h2>Çalışma saatleri</h2>
            <div className="hours-display">
              {WEEK.map((d) => {
                const h = shop.hours.find((h) => h.dayOfWeek === d);
                return (
                  <div key={d} className={d === day ? "today" : ""}>
                    <span>{DAYS[d]}</span>
                    <strong>
                      {!h || h.isClosed
                        ? "Kapalı"
                        : `${clock(h.openMin)} – ${clock(h.closeMin)}`}
                    </strong>
                  </div>
                );
              })}
            </div>
            <a
              className="text-link small-link"
              href={`https://www.openstreetmap.org/?mlat=${shop.latitude}&mlon=${shop.longitude}#map=17/${shop.latitude}/${shop.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={13} /> Haritada gör
            </a>
          </section>
          <section className="detail-section">
            <h2>Değerlendirmeler</h2>
            {total > 0 && (
              <div className="rating-summary">
                <div className="rating-big">
                  <strong>{avg?.toFixed(1)}</strong>
                  <span className="stars-row">
                    {"★".repeat(Math.round(avg ?? 0))}
                    <span className="dim">
                      {"★".repeat(5 - Math.round(avg ?? 0))}
                    </span>
                  </span>
                  <small>{total} değerlendirme</small>
                </div>
                <div className="rating-bars">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const c =
                      distribution.find((d) => d.rating === n)?._count ?? 0;
                    return (
                      <div key={n}>
                        <span>{n}</span>
                        <i>
                          <b style={{ width: `${(c / total) * 100}%` }} />
                        </i>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="muted small">
              Yalnızca tamamlanmış randevulardan doğrulanmış yorumlar.
            </p>
            {shop.reviews.length ? (
              <div className="review-list">
                {shop.reviews.map((r) => (
                  <article className="review" key={r.id}>
                    <div className="row between">
                      <span className="row">
                        <span className="mini-avatar">
                          {(r.customer.name ?? "M").slice(0, 1)}
                        </span>
                        <strong>
                          {r.customer.name?.split(" ")[0] ?? "Müşteri"}
                        </strong>
                      </span>
                      <span className="stars-row small">
                        {"★".repeat(r.rating)}
                        <span className="dim">{"★".repeat(5 - r.rating)}</span>
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
                ))}
              </div>
            ) : (
              <p className="notice">
                Henüz yorum yok. İlk deneyimi sen paylaşabilirsin.
              </p>
            )}
          </section>
        </div>
        <Booking
          key={`${initial.service ?? ""}-${initial.staff ?? ""}`}
          shopId={shop.id}
          slug={shop.slug}
          staff={shop.staff.map((s) => ({
            id: s.id,
            name: s.name,
            title: s.title,
            photo: s.photo,
          }))}
          services={shop.services.map((s) => ({
            id: s.id,
            name: s.name,
            price: s.price.toString(),
            durationMinutes: s.durationMinutes,
          }))}
          loggedIn={!!user}
          initial={initial}
          closedDays={WEEK.filter((d) => {
            const h = shop.hours.find((h) => h.dayOfWeek === d);
            return !h || h.isClosed;
          })}
          windowDays={shop.bookingWindowDays}
        />
      </div>
      {shop.services.length > 0 && shop.staff.length > 0 && (
        <div className="mobile-cta">
          <div>
            <small>Başlangıç</small>
            <strong>{minPrice ? money(minPrice.toString()) : "—"}</strong>
          </div>
          <a className="button primary" href="#rezervasyon">
            Randevu al <ArrowRight size={15} />
          </a>
        </div>
      )}
    </section>
  );
}
