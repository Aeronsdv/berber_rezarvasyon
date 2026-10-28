import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  Users,
  Scissors,
  Settings2,
  Clock3,
  Shield,
  CreditCard,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { today, validDate, dateLabel, clock, money, weekday } from "@/lib/time";
import { AppointmentActions } from "@/components/appointment-actions";
import { OwnerSettings, RemoveButton } from "@/components/owner-forms";
import { LiveAgenda } from "@/components/live-agenda";
const tabs = [
  { id: "agenda", label: "Randevu takvimi", icon: CalendarDays },
  { id: "services", label: "Hizmetler", icon: Scissors },
  { id: "staff", label: "Ustalar", icon: Users },
  { id: "hours", label: "Çalışma saatleri", icon: Clock3 },
  { id: "shop", label: "İşletme bilgileri", icon: Settings2 },
  { id: "bans", label: "Uzaklaştırmalar", icon: Shield },
  { id: "subscription", label: "Abonelik", icon: CreditCard },
];
const statuses = {
  PENDING: "Bekliyor",
  CONFIRMED: "Onaylandı",
  COMPLETED: "Tamamlandı",
  NO_SHOW: "Gelmedi",
  CANCELLED: "İptal",
};
export const metadata = { title: "İşletme paneli" };
export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; tab?: string; date?: string }>;
}) {
  const user = await requireUser();
  if (!user.shops.length) redirect("/panel/kurulum");
  const params = await searchParams;
  const selected =
    user.shops.find((s) => s.id === params.shop) ?? user.shops[0];
  const tab = tabs.some((t) => t.id === params.tab) ? params.tab! : "agenda";
  const date = params.date && validDate(params.date) ? params.date : today();
  const shop = await db.barbershop.findFirstOrThrow({
    where: { id: selected.id, ownerId: user.id },
    include: {
      hours: true,
      staff: {
        include: {
          hours: true,
          breaks: {
            where: { date: { gte: today() } },
            orderBy: { date: "asc" },
          },
        },
      },
      services: { orderBy: { name: "asc" } },
      subscription: true,
      bans: {
        include: { customer: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  const appointments =
    tab === "agenda"
      ? await db.appointment.findMany({
          where: { barbershopId: shop.id, date },
          include: {
            staff: true,
            customer: { select: { name: true, email: true, phone: true } },
          },
          orderBy: { startsAt: "asc" },
        })
      : [];
  const hours = shop.hours.find((h) => h.dayOfWeek === weekday(date));
  const total = appointments
    .filter((a) => a.status === "COMPLETED")
    .reduce((s, a) => s + Number(a.price), 0);
  const editableShop = {
    id: shop.id,
    name: shop.name,
    description: shop.description,
    address: shop.address,
    city: shop.city,
    district: shop.district,
    phone: shop.phone,
    latitude: shop.latitude,
    longitude: shop.longitude,
    coverImage: shop.coverImage,
    isActive: shop.isActive,
  };
  return (
    <div className="panel-shell container">
      <aside className="panel-sidebar">
        <span className="eyebrow">İŞLETME PANELİ</span>
        <h2>{shop.name}</h2>
        {user.shops.length > 1 && (
          <div className="shop-switcher">
            {user.shops.map((s) => (
              <Link
                className={s.id === shop.id ? "active" : ""}
                key={s.id}
                href={`/panel?shop=${s.id}`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}
        <nav aria-label="İşletme menüsü">
          {tabs.map((t) => (
            <Link
              className={t.id === tab ? "active" : ""}
              key={t.id}
              href={`/panel?shop=${shop.id}&tab=${t.id}`}
            >
              <t.icon size={18} />
              {t.label}
            </Link>
          ))}
        </nav>
        <Link className="button small" href={`/berber/${shop.slug}`}>
          Vitrini görüntüle <ArrowUpRight size={15} />
        </Link>
        <Link className="text-link" href="/panel/kurulum">
          + Yeni işletme ekle
        </Link>
      </aside>
      <section className="panel-content">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HER ŞEY YOLUNDA, USTA.</span>
            <h1>{tabs.find((t) => t.id === tab)?.label}</h1>
          </div>
          {tab === "agenda" && (
            <span className="live-indicator">
              <i />
              30 sn’de yenilenir
            </span>
          )}
        </div>
        {tab === "agenda" ? (
          <>
            <div className="stat-grid">
              <div>
                <span>Günün randevuları</span>
                <strong>
                  {appointments.filter((a) => a.status !== "CANCELLED").length}
                </strong>
              </div>
              <div>
                <span>Tamamlanan</span>
                <strong>
                  {appointments.filter((a) => a.status === "COMPLETED").length}
                </strong>
              </div>
              <div>
                <span>Tamamlanan hizmet tutarı</span>
                <strong>{money(total)}</strong>
              </div>
            </div>
            <div className="row between wrap agenda-toolbar">
              <h2>{dateLabel(date)}</h2>
              <form className="row" method="get">
                <input type="hidden" name="shop" value={shop.id} />
                <input
                  type="date"
                  aria-label="Takvim tarihi"
                  name="date"
                  defaultValue={date}
                  required
                />
                <button className="button small">Göster</button>
              </form>
            </div>
            {!shop.staff.length ? (
              <p className="notice">
                Takvime başlamak için Ustalar bölümünden ekibini ekle.
              </p>
            ) : (
              <LiveAgenda
                staff={shop.staff.map((s) => ({ id: s.id, name: s.name }))}
                appointments={appointments.map((a) => ({
                  id: a.id,
                  staffId: a.staffId,
                  startMin: a.startMin,
                  endMin: a.endMin,
                  serviceName: a.serviceName,
                  customer: a.customer.name ?? "Müşteri",
                  status: a.status,
                }))}
                openMin={Math.min(
                  hours?.openMin ?? 540,
                  ...appointments.map((a) => a.startMin),
                )}
                closeMin={Math.max(
                  hours?.closeMin ?? 1200,
                  ...appointments.map((a) => a.endMin),
                )}
              />
            )}
            <h2 className="subheading">Randevu detayları</h2>
            {appointments.length === 0 && (
              <p className="notice">Bu gün için henüz randevu yok.</p>
            )}
            {appointments.map((a) => (
              <article
                className="appointment-card"
                id={`appointment-${a.id}`}
                key={a.id}
              >
                <div className="row between">
                  <h3>
                    {clock(a.startMin)} · {a.customer.name ?? "Müşteri"}
                  </h3>
                  <span className={`status status-${a.status.toLowerCase()}`}>
                    {statuses[a.status]}
                  </span>
                </div>
                <p>
                  {a.serviceName} · {a.staff.name} · {money(a.price.toString())}
                </p>
                <p className="muted">
                  {a.customer.email}
                  {a.customer.phone && (
                    <>
                      {" "}
                      ·{" "}
                      <a href={`tel:${a.customer.phone}`}>{a.customer.phone}</a>
                    </>
                  )}
                </p>
                {["PENDING", "CONFIRMED"].includes(a.status) && (
                  <AppointmentActions
                    id={a.id}
                    owner
                    past={a.endsAt <= new Date()}
                  />
                )}
              </article>
            ))}
          </>
        ) : tab === "bans" ? (
          <div className="panel-box">
            <p className="muted">
              Kısıtlamalar yalnızca bu işletmede geçerlidir. Gelmeyen
              müşterilere randevu üzerinden uygulanır.
            </p>
            {shop.bans.length === 0 && <p>Uzaklaştırılmış müşteri yok.</p>}
            {shop.bans.map((b) => (
              <div className="list-row" key={b.id}>
                <div>
                  <strong>{b.customer.name}</strong>
                  <p>{b.reason}</p>
                  <small>
                    {b.bannedUntil
                      ? `${b.bannedUntil.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}${b.bannedUntil < new Date() ? " · Süresi doldu" : " tarihine kadar"}`
                      : "Süresiz"}
                  </small>
                </div>
                <RemoveButton shopId={shop.id} id={b.id} action="unban" />
              </div>
            ))}
          </div>
        ) : tab === "subscription" ? (
          <div className="panel-box subscription-box">
            <span className="eyebrow">USTA İŞLETME</span>
            <h2>İşini büyütmeye yer aç.</h2>
            <p>Randevu, ekip, hizmet ve müşteri yönetimin bir arada.</p>
            <div className="notice">
              <strong>
                {shop.subscription?.status === "ACTIVE"
                  ? "Aktif abonelik"
                  : "14 günlük deneme planı"}
              </strong>
              <p>
                Deneme bitişi:{" "}
                {shop.subscription?.trialEndsAt.toLocaleDateString("tr-TR", {
                  timeZone: "Europe/Istanbul",
                }) ?? "—"}
              </p>
            </div>
            <p className="muted">
              Ücretli abonelik ve ödeme alımı henüz açılmadı. Bu sürümde deneme
              süresi dolsa da panel erişimi devam eder; kart bilgisi istenmez.
            </p>
          </div>
        ) : (
          <OwnerSettings
            shop={editableShop}
            staff={shop.staff}
            services={shop.services.map((s) => ({
              ...s,
              price: s.price.toString(),
            }))}
            hours={shop.hours}
            tab={tab}
          />
        )}
      </section>
    </div>
  );
}
