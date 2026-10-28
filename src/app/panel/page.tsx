import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Users,
  Scissors,
  Settings2,
  Clock3,
  Shield,
  CreditCard,
  Phone,
  Plus,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import {
  today,
  validDate,
  dateLabel,
  clock,
  money,
  weekday,
  addDays,
} from "@/lib/time";
import { AppointmentActions } from "@/components/appointment-actions";
import { OwnerSettings, RemoveButton } from "@/components/owner-forms";
import { LiveAgenda } from "@/components/live-agenda";
import { DateNav } from "@/components/date-nav";
import { CopyLink } from "@/components/ui";
const tabs = [
  { id: "agenda", label: "Randevu takvimi", short: "Takvim", icon: CalendarDays },
  { id: "services", label: "Hizmetler", short: "Hizmetler", icon: Scissors },
  { id: "staff", label: "Ustalar", short: "Ustalar", icon: Users },
  { id: "hours", label: "Çalışma saatleri", short: "Saatler", icon: Clock3 },
  { id: "shop", label: "İşletme bilgileri", short: "İşletme", icon: Settings2 },
  { id: "bans", label: "Uzaklaştırmalar", short: "Kısıtlar", icon: Shield },
  { id: "subscription", label: "Abonelik", short: "Abonelik", icon: CreditCard },
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
  const now = new Date();
  const todayStr = today(now);
  const date = params.date && validDate(params.date) ? params.date : todayStr;
  const shop = await db.barbershop.findFirstOrThrow({
    where: { id: selected.id, ownerId: user.id },
    include: {
      hours: true,
      staff: {
        include: {
          hours: true,
          breaks: {
            where: { date: { gte: todayStr } },
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
  const offset = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(date, -offset);
  const [appointments, weekCounts] =
    tab === "agenda"
      ? await Promise.all([
          db.appointment.findMany({
            where: { barbershopId: shop.id, date },
            include: {
              staff: true,
              customer: { select: { name: true, email: true, phone: true } },
            },
            orderBy: { startsAt: "asc" },
          }),
          db.appointment.groupBy({
            by: ["date"],
            where: {
              barbershopId: shop.id,
              date: { gte: monday, lte: addDays(monday, 6) },
              status: { not: "CANCELLED" },
            },
            _count: true,
          }),
        ])
      : [[], []];
  const hours = shop.hours.find((h) => h.dayOfWeek === weekday(date));
  const live = appointments.filter((a) => a.status !== "CANCELLED");
  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const earned = completed.reduce((s, a) => s + Number(a.price), 0);
  const expected = live
    .filter((a) => a.status !== "NO_SHOW")
    .reduce((s, a) => s + Number(a.price), 0);
  const isToday = date === todayStr;
  const upNext = isToday
    ? live.find(
        (a) =>
          (a.status === "CONFIRMED" || a.status === "PENDING") &&
          a.endsAt > now,
      )
    : undefined;
  const minutesTo = upNext
    ? Math.round((upNext.startsAt.getTime() - now.getTime()) / 60000)
    : 0;
  const activeStaff = shop.staff.filter((s) => s.isActive);
  const setup = [
    {
      done: shop.services.some((s) => s.isActive),
      label: "İlk hizmetini ekle",
      tab: "services",
    },
    { done: activeStaff.length > 0, label: "Ekibine bir usta ekle", tab: "staff" },
    { done: shop.hours.some((h) => !h.isClosed), label: "Çalışma saatlerini belirle", tab: "hours" },
    { done: !!shop.coverImage, label: "Vitrin görseli ekle", tab: "shop" },
    { done: shop.isActive, label: "İşletmeni yayına al", tab: "shop" },
  ];
  const setupDone = setup.filter((s) => s.done).length;
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
  const current = tabs.find((t) => t.id === tab)!;
  return (
    <div className="panel-shell container">
      <aside className="panel-sidebar">
        <div className="panel-shop">
          <span className="brand-mark">{shop.name.slice(0, 1)}</span>
          <div>
            <strong>{shop.name}</strong>
            <small className={shop.isActive ? "live" : ""}>
              <i /> {shop.isActive ? "Yayında" : "Yayında değil"}
            </small>
          </div>
        </div>
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
              aria-current={t.id === tab ? "page" : undefined}
              key={t.id}
              href={`/panel?shop=${shop.id}&tab=${t.id}`}
              aria-label={t.label}
            >
              <t.icon size={16} />
              <span className="full-label">{t.label}</span>
              <span className="short-label" aria-hidden="true">
                {t.short}
              </span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-actions">
          <Link className="button small" href={`/berber/${shop.slug}`}>
            Vitrini gör <ArrowUpRight size={13} />
          </Link>
          <CopyLink path={`/berber/${shop.slug}`} label="Linki kopyala" />
          <Link className="text-link small-link" href="/panel/kurulum">
            <Plus size={13} /> Yeni işletme ekle
          </Link>
        </div>
      </aside>
      <section className="panel-content">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Her şey yolunda, usta.</span>
            <h1>{current.label}</h1>
          </div>
          {tab === "agenda" && (
            <span className="live-indicator">
              <i />
              Canlı
            </span>
          )}
        </div>
        {tab === "agenda" ? (
          <>
            {setupDone < setup.length && (
              <div className="setup-card">
                <div className="row between">
                  <div>
                    <strong>Kurulumu tamamla</strong>
                    <p className="muted small">
                      Müşterilerin randevu alabilmesi için birkaç adım kaldı.
                    </p>
                  </div>
                  <span className="ring" style={{ "--p": setupDone / setup.length } as React.CSSProperties}>
                    {setupDone}/{setup.length}
                  </span>
                </div>
                <ul>
                  {setup.map((s) => (
                    <li key={s.label} className={s.done ? "done" : ""}>
                      <Link href={`/panel?shop=${shop.id}&tab=${s.tab}`}>
                        <span className="check">
                          {s.done && <Check size={11} strokeWidth={3} />}
                        </span>
                        {s.label}
                        {!s.done && <ChevronRight size={14} />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {upNext && (
              <div className="up-next">
                <span className="up-next-time">
                  <small>
                    {minutesTo > 0
                      ? minutesTo < 60
                        ? `${minutesTo} dk sonra`
                        : `${Math.floor(minutesTo / 60)} sa ${minutesTo % 60} dk sonra`
                      : "Şimdi"}
                  </small>
                  <strong>{clock(upNext.startMin)}</strong>
                </span>
                <div className="grow">
                  <span className="eyebrow">Sıradaki müşteri</span>
                  <strong>{upNext.customer.name ?? "Müşteri"}</strong>
                  <small className="muted">
                    {upNext.serviceName} · {upNext.staff.name}
                  </small>
                </div>
                {upNext.customer.phone && (
                  <a
                    className="icon-button"
                    href={`tel:${upNext.customer.phone}`}
                    aria-label="Müşteriyi ara"
                  >
                    <Phone size={15} />
                  </a>
                )}
              </div>
            )}
            <DateNav
              shopId={shop.id}
              date={date}
              counts={Object.fromEntries(
                weekCounts.map((w) => [w.date, w._count]),
              )}
            />
            <div className="stat-grid">
              <div>
                <span>Randevu</span>
                <strong>{live.length}</strong>
              </div>
              <div>
                <span>Tamamlanan</span>
                <strong>{completed.length}</strong>
              </div>
              <div>
                <span>Beklenen</span>
                <strong>{money(expected)}</strong>
              </div>
              <div>
                <span>Kazanılan</span>
                <strong className="positive">{money(earned)}</strong>
              </div>
            </div>
            <div className="agenda-toolbar">
              <h2>{dateLabel(date)}</h2>
              <span className="muted small">
                {!hours || hours.isClosed
                  ? "İşletme bu gün kapalı"
                  : `${clock(hours.openMin)} – ${clock(hours.closeMin)}`}
              </span>
            </div>
            {!shop.staff.length ? (
              <p className="notice">
                Takvime başlamak için Ustalar bölümünden ekibini ekle.
              </p>
            ) : (
              <LiveAgenda
                isToday={isToday}
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
            <h2 className="subheading">
              Randevu detayları{" "}
              <span className="count">{appointments.length}</span>
            </h2>
            {appointments.length === 0 && (
              <div className="empty compact">
                <span className="empty-icon">
                  <CalendarDays size={20} />
                </span>
                <p>Bu gün için henüz randevu yok.</p>
              </div>
            )}
            <div className="appointment-list">
              {appointments.map((a) => (
                <article
                  className={`appointment-card owner ${a.status === "CANCELLED" ? "muted-card" : ""}`}
                  id={`appointment-${a.id}`}
                  key={a.id}
                >
                  <span className="time-chip">
                    <strong>{clock(a.startMin)}</strong>
                    <small>{clock(a.endMin)}</small>
                  </span>
                  <div className="appointment-main">
                    <div className="row between">
                      <h3>{a.customer.name ?? "Müşteri"}</h3>
                      <span
                        className={`status status-${a.status.toLowerCase()}`}
                      >
                        {statuses[a.status]}
                      </span>
                    </div>
                    <p className="meta">
                      <span>{a.serviceName}</span>
                      <span>{a.staff.name}</span>
                      <strong>{money(a.price.toString())}</strong>
                    </p>
                    <p className="meta muted">
                      <span>{a.customer.email}</span>
                      {a.customer.phone && (
                        <a href={`tel:${a.customer.phone}`}>
                          <Phone size={11} /> {a.customer.phone}
                        </a>
                      )}
                    </p>
                    {a.cancelReason && (
                      <p className="muted small">Not: {a.cancelReason}</p>
                    )}
                    {["PENDING", "CONFIRMED"].includes(a.status) && (
                      <AppointmentActions
                        id={a.id}
                        owner
                        past={a.endsAt <= now}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : tab === "bans" ? (
          <div className="panel-box">
            <p className="muted small box-intro">
              Kısıtlamalar yalnızca bu işletmede geçerlidir. Gelmeyen
              müşterilere randevu üzerinden uygulanır.
            </p>
            {shop.bans.length === 0 && (
              <div className="empty compact">
                <span className="empty-icon">
                  <Shield size={20} />
                </span>
                <p>Uzaklaştırılmış müşteri yok.</p>
              </div>
            )}
            {shop.bans.map((b) => (
              <div className="list-row" key={b.id}>
                <span>
                  <strong>{b.customer.name}</strong>
                  <small>{b.reason}</small>
                  <small>
                    {b.bannedUntil
                      ? `${b.bannedUntil.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}${b.bannedUntil < now ? " · Süresi doldu" : " tarihine kadar"}`
                      : "Süresiz"}
                  </small>
                </span>
                <RemoveButton shopId={shop.id} id={b.id} action="unban" />
              </div>
            ))}
          </div>
        ) : tab === "subscription" ? (
          <div className="panel-box subscription-box">
            <span className="eyebrow">USTA İşletme</span>
            <h2>İşini büyütmeye yer aç.</h2>
            <p className="muted">
              Randevu, ekip, hizmet ve müşteri yönetimin bir arada.
            </p>
            <div className="plan-card">
              <div>
                <strong>
                  {shop.subscription?.status === "ACTIVE"
                    ? "Aktif abonelik"
                    : "14 günlük deneme planı"}
                </strong>
                <small className="muted">
                  Deneme bitişi:{" "}
                  {shop.subscription?.trialEndsAt.toLocaleDateString("tr-TR", {
                    timeZone: "Europe/Istanbul",
                  }) ?? "—"}
                </small>
              </div>
              <span className="status status-confirmed">
                {shop.subscription?.status === "ACTIVE" ? "Aktif" : "Deneme"}
              </span>
            </div>
            <ul className="feature-list">
              <li>
                <Check size={14} /> Sınırsız randevu ve usta
              </li>
              <li>
                <Check size={14} /> Canlı takvim ve molalar
              </li>
              <li>
                <Check size={14} /> Müşteri kısıtlama araçları
              </li>
            </ul>
            <p className="muted small">
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
