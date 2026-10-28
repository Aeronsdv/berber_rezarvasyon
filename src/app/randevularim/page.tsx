import Link from "next/link";
import {
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Star,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import {
  clock,
  dateLabel,
  dayParts,
  money,
  relativeDay,
  today,
} from "@/lib/time";
import { canCancel } from "@/lib/scheduling";
import {
  AddToCalendar,
  AppointmentActions,
  ProfilePhone,
} from "@/components/appointment-actions";
const statuses = {
  PENDING: "Bekliyor",
  CONFIRMED: "Onaylandı",
  COMPLETED: "Tamamlandı",
  NO_SHOW: "Gelmedi",
  CANCELLED: "İptal edildi",
};
export const metadata = { title: "Randevularım" };
export default async function Appointments({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; view?: string }>;
}) {
  const user = await requireUser("/randevularim");
  const { created, view } = await searchParams;
  const appointments = await db.appointment.findMany({
    where: { customerId: user.id },
    include: { barbershop: true, staff: true, review: true },
    orderBy: { startsAt: "desc" },
    take: 100,
  });
  const now = new Date();
  const day = today(now);
  const isActive = (s: string) => s === "PENDING" || s === "CONFIRMED";
  const upcoming = appointments
    .filter((a) => a.date >= day && (!isActive(a.status) || a.endsAt > now))
    .reverse();
  const past = appointments.filter((a) => !upcoming.includes(a));
  const next = upcoming.find((a) => isActive(a.status));
  const showPast = view === "past";
  const list = showPast ? past : upcoming.filter((a) => a !== next);
  const awaitingReview = past.filter(
    (a) => a.status === "COMPLETED" && !a.review,
  ).length;
  return (
    <section className="container page narrow">
      <header className="page-head">
        <span className="eyebrow">Sana ayrılan zaman</span>
        <h1 className="page-title">Randevularım.</h1>
        <p className="lead">
          Merhaba {user.name?.split(" ")[0] ?? ""}, sıradaki iyi görünümün
          burada.
        </p>
      </header>
      {created && (
        <p className="notice success celebrate" role="status">
          <span className="check-circle">
            <Check size={14} strokeWidth={3} />
          </span>
          Randevun oluşturuldu. Saatinde görüşmek üzere!
        </p>
      )}
      {next && !showPast && (
        <article className="next-card rise">
          <div className="next-when">
            <span className="next-date">
              <small>{dayParts(next.date).month}</small>
              <strong>{dayParts(next.date).day}</strong>
            </span>
            <div>
              <span className="eyebrow">Sıradaki randevun</span>
              <h2>
                {relativeDay(next.date, day)} · {clock(next.startMin)}
              </h2>
              <p className="muted small">
                {dateLabel(next.date)} · {clock(next.startMin)}–
                {clock(next.endMin)}
              </p>
            </div>
            <span className={`status status-${next.status.toLowerCase()}`}>
              {statuses[next.status]}
            </span>
          </div>
          <div className="next-body">
            <Link href={`/berber/${next.barbershop.slug}`} className="next-shop">
              <strong>{next.barbershop.name}</strong>
              <span className="muted small">
                {next.serviceName} · {next.staff.name} ·{" "}
                {money(next.price.toString())}
              </span>
            </Link>
            <p className="muted small location">
              <MapPin size={13} />
              {next.barbershop.address}
            </p>
          </div>
          <div className="next-actions">
            <a
              className="button small"
              href={`https://www.google.com/maps/dir/?api=1&destination=${next.barbershop.latitude},${next.barbershop.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation size={14} /> Yol tarifi
            </a>
            <a
              className="button small"
              href={`tel:${next.barbershop.phone.replace(/[^+\d]/g, "")}`}
            >
              <Phone size={14} /> Ara
            </a>
            <AddToCalendar
              title={`${next.serviceName} · ${next.barbershop.name}`}
              start={next.startsAt.toISOString()}
              end={next.endsAt.toISOString()}
              location={next.barbershop.address}
              description={`Usta: ${next.staff.name}`}
            />
          </div>
          {!canCancel(next.startsAt) && (
            <p className="notice">
              İptal süresi doldu. Değişiklik için işletmeyi arayabilirsin.
            </p>
          )}
          <AppointmentActions id={next.id} canCancel={canCancel(next.startsAt)} />
        </article>
      )}
      <div className="list-head">
        <div className="segmented" role="tablist" aria-label="Randevu listesi">
          <Link
            href="/randevularim"
            className={!showPast ? "active" : ""}
            role="tab"
            aria-selected={!showPast}
          >
            Yaklaşan <span className="count">{upcoming.length}</span>
          </Link>
          <Link
            href="/randevularim?view=past"
            className={showPast ? "active" : ""}
            role="tab"
            aria-selected={showPast}
          >
            Geçmiş <span className="count">{past.length}</span>
          </Link>
        </div>
        {awaitingReview > 0 && !showPast && (
          <Link className="text-link small-link" href="/randevularim?view=past">
            <Star size={13} /> {awaitingReview} değerlendirme bekliyor
          </Link>
        )}
      </div>
      {list.length ? (
        <div className="appointment-list">
          {list.map((a, i) => {
            const active = isActive(a.status);
            const p = dayParts(a.date);
            return (
              <article
                className={`appointment-card ${a.status === "CANCELLED" ? "muted-card" : ""}`}
                key={a.id}
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="date-chip">
                  <small>{p.month}</small>
                  <strong>{p.day}</strong>
                </span>
                <div className="appointment-main">
                  <div className="row between">
                    <Link href={`/berber/${a.barbershop.slug}`}>
                      <h2>{a.barbershop.name}</h2>
                    </Link>
                    <span className={`status status-${a.status.toLowerCase()}`}>
                      {statuses[a.status]}
                    </span>
                  </div>
                  <p className="meta">
                    <span>
                      <Clock3 size={12} />
                      {p.weekday} {clock(a.startMin)}
                    </span>
                    <span>{a.serviceName}</span>
                    <span>{a.staff.name}</span>
                    <strong>{money(a.price.toString())}</strong>
                  </p>
                  {a.cancelReason && (
                    <p className="muted small">İptal nedeni: {a.cancelReason}</p>
                  )}
                  {a.review && (
                    <p className="stars-row small">
                      {"★".repeat(a.review.rating)}
                      <span className="dim">
                        {"★".repeat(5 - a.review.rating)}
                      </span>
                      <span className="muted"> · Değerlendirmen kaydedildi</span>
                    </p>
                  )}
                  <div className="row wrap card-actions">
                    {!active && (
                      <Link
                        className="button small"
                        href={`/berber/${a.barbershop.slug}?service=${a.serviceId}&staff=${a.staffId}#rezervasyon`}
                      >
                        <RotateCcw size={13} /> Tekrar randevu al
                      </Link>
                    )}
                  </div>
                  <AppointmentActions
                    id={a.id}
                    canCancel={active && canCancel(a.startsAt)}
                    reviewable={a.status === "COMPLETED" && !a.review}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        !(next && !showPast) && (
          <div className="empty">
            <span className="empty-icon">
              <CalendarDays size={22} />
            </span>
            <h2>
              {showPast
                ? "Henüz geçmiş randevun yok."
                : "Takviminde kendine yer aç."}
            </h2>
            <p>
              {showPast
                ? "Tamamlanan randevuların burada görünecek."
                : "Henüz yaklaşan bir randevun yok."}
            </p>
            <Link className="button primary" href="/kesfet">
              Ustanı keşfet
            </Link>
          </div>
        )
      )}
      <section className="settings-card">
        <h2 className="box-title">Hatırlatmalar</h2>
        <p className="muted small">
          Randevu hatırlatmaları için telefon numaranı ekle.
        </p>
        <ProfilePhone phone={user.phone} />
      </section>
    </section>
  );
}
