import Link from "next/link";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { clock, dateLabel, money } from "@/lib/time";
import { canCancel } from "@/lib/scheduling";
import {
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
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireUser("/randevularim");
  const { created } = await searchParams;
  const appointments = await db.appointment.findMany({
    where: { customerId: user.id },
    include: { barbershop: true, staff: true, review: true },
    orderBy: { startsAt: "desc" },
    take: 100,
  });
  return (
    <section className="container section narrow">
      <span className="eyebrow">SANA AYRILAN ZAMAN</span>
      <h1 className="page-title">Randevularım.</h1>
      <p className="lead">
        Merhaba {user.name?.split(" ")[0] ?? ""}, sıradaki iyi görünümün burada.
      </p>
      {created && (
        <p className="notice success" role="status">
          Randevun oluşturuldu. Saatinde görüşmek üzere!
        </p>
      )}
      <ProfilePhone phone={user.phone} />
      {appointments.length ? (
        <div className="appointment-list">
          {appointments.map((a) => {
            const active = ["PENDING", "CONFIRMED"].includes(a.status);
            return (
              <article className="appointment-card" key={a.id}>
                <div className="row between">
                  <Link href={`/berber/${a.barbershop.slug}`}>
                    <h2>{a.barbershop.name}</h2>
                  </Link>
                  <span className={`status status-${a.status.toLowerCase()}`}>
                    {statuses[a.status]}
                  </span>
                </div>
                <p>
                  {a.serviceName} · {a.staff.name}
                  <strong className="appointment-price">
                    {money(a.price.toString())}
                  </strong>
                </p>
                <div className="row wrap muted">
                  <span>
                    <CalendarDays size={15} />
                    {dateLabel(a.date)}
                  </span>
                  <span>
                    <Clock3 size={15} />
                    {clock(a.startMin)} – {clock(a.endMin)}
                  </span>
                </div>
                <p className="muted location">
                  <MapPin size={14} />
                  {a.barbershop.address}
                </p>
                {a.cancelReason && (
                  <p className="muted">İptal nedeni: {a.cancelReason}</p>
                )}
                {active && !canCancel(a.startsAt) && (
                  <p className="notice">
                    İptal süresi doldu. İşletmeye ulaş:{" "}
                    <a href={`tel:${a.barbershop.phone}`}>
                      {a.barbershop.phone}
                    </a>
                  </p>
                )}
                <AppointmentActions
                  id={a.id}
                  canCancel={active && canCancel(a.startsAt)}
                  reviewable={a.status === "COMPLETED" && !a.review}
                />
                {a.review && (
                  <p className="gold">
                    {"★".repeat(a.review.rating)} · Değerlendirmen kaydedildi.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty bordered">
          <CalendarDays size={36} />
          <h2>Takviminde kendine yer aç.</h2>
          <p>Henüz bir randevun yok.</p>
          <Link className="button primary" href="/kesfet">
            Ustanı keşfet
          </Link>
        </div>
      )}
    </section>
  );
}
