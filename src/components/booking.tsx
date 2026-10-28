/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CalendarSearch,
  Check,
  Clock3,
  LoaderCircle,
  Sparkles,
  User,
} from "lucide-react";
import {
  addDays,
  clock,
  dateLabel,
  dayParts,
  duration as formatDuration,
  money,
  today,
  weekday,
} from "@/lib/time";
import { Feedback, request } from "./ui";
type Slot = { startMin: number };
const periods = [
  { label: "Sabah", test: (m: number) => m < 720 },
  { label: "Öğleden sonra", test: (m: number) => m >= 720 && m < 1020 },
  { label: "Akşam", test: (m: number) => m >= 1020 },
];
async function fetchSlots(
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<{ slots: Slot[]; closed: boolean }> {
  const r = await fetch(`/api/slots?${new URLSearchParams(params)}`, {
    signal,
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
}
export function Booking({
  shopId,
  slug,
  services,
  staff,
  loggedIn,
  initial,
  closedDays = [],
  windowDays = 30,
}: {
  shopId: string;
  slug: string;
  services: {
    id: string;
    name: string;
    durationMinutes: number;
    price: string;
  }[];
  staff: { id: string; name: string; title?: string; photo?: string | null }[];
  loggedIn: boolean;
  initial: { service?: string; staff?: string; date?: string; time?: string };
  closedDays?: number[];
  windowDays?: number;
}) {
  const router = useRouter();
  const first = today();
  const last = addDays(first, Math.max(1, windowDays) - 1);
  const [serviceId, setService] = useState(
    services.some((s) => s.id === initial.service)
      ? initial.service!
      : (services[0]?.id ?? ""),
  );
  const [staffId, setStaff] = useState(
    staff.some((s) => s.id === initial.staff) ? initial.staff! : "any",
  );
  const [date, setDate] = useState(
    initial.date && initial.date >= first && initial.date <= last
      ? initial.date
      : first,
  );
  const [selected, setSelected] = useState<number | null>(
    initial.time !== undefined ? Number(initial.time) : null,
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const service = services.find((s) => s.id === serviceId);
  const barber = staff.find((s) => s.id === staffId);
  const days = useMemo(
    () =>
      Array.from(
        { length: Math.max(1, windowDays) },
        (_, i) => addDays(first, i),
      ),
    [first, windowDays],
  );
  useEffect(() => {
    if (!serviceId) return;
    const controller = new AbortController();
    fetchSlots({ shopId, serviceId, staffId, date }, controller.signal)
      .then((data) => {
        setSlots(data.slots);
        setClosed(data.closed);
        setSelected((s) => (data.slots.some((x) => x.startMin === s) ? s : null));
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setSlots([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [shopId, serviceId, staffId, date, refresh]);
  // Hidrasyondan önce takvimden seçilmiş bir gün varsa onu benimse.
  useEffect(() => {
    const v = dateInput.current?.value;
    if (v && v !== date && v >= first && v <= last) {
      setLoading(true);
      setSelected(null);
      setDate(v);
    }
    // yalnızca ilk yüklemede
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Seçili günü şeridin görünür alanına kaydır, takvim alanını eşitle.
  useEffect(() => {
    if (dateInput.current && dateInput.current.value !== date)
      dateInput.current.value = date;
    strip.current
      ?.querySelector<HTMLElement>(`[data-date="${date}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [date]);
  function reset() {
    setSelected(null);
    setLoading(true);
    setError("");
    setSlots([]);
  }
  function pickDate(d: string) {
    if (d === date) return;
    reset();
    setDate(d);
  }
  async function findNext() {
    setSearching(true);
    setError("");
    try {
      for (let d = addDays(date, 1); d <= last; d = addDays(d, 1)) {
        if (closedDays.includes(weekday(d))) continue;
        const data = await fetchSlots({ shopId, serviceId, staffId, date: d });
        if (data.slots.length) {
          pickDate(d);
          return;
        }
      }
      setError("Önümüzdeki günlerde bu seçim için boş saat bulunamadı.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }
  if (!services.length || !staff.length)
    return (
      <aside className="booking-panel" id="rezervasyon">
        <span className="empty-icon">
          <CalendarDays size={20} />
        </span>
        <h2>Randevular yakında.</h2>
        <p className="muted">
          Bu işletme henüz ekibini veya hizmetlerini tamamlamadı.
        </p>
      </aside>
    );
  const done = [!!serviceId, true, !!date, selected !== null];
  const grouped = periods
    .map((p) => ({ ...p, slots: slots.filter((s) => p.test(s.startMin)) }))
    .filter((p) => p.slots.length);
  return (
    <aside className="booking-panel" id="rezervasyon">
      <div className="booking-head">
        <div>
          <span className="eyebrow">Kendine bir saat ayır</span>
          <h2>Randevunu oluştur.</h2>
        </div>
        <div className="progress-dots" aria-hidden="true">
          {done.map((d, i) => (
            <i key={i} className={d ? "on" : ""} />
          ))}
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (selected === null || !service || busy) return;
          if (!loggedIn) {
            const callback = `/berber/${slug}?${new URLSearchParams({ service: serviceId, staff: staffId, date, time: String(selected) })}#rezervasyon`;
            router.push(`/giris?callbackUrl=${encodeURIComponent(callback)}`);
            return;
          }
          setBusy(true);
          setError("");
          try {
            await request("/api/appointments", {
              shopId,
              serviceId,
              staffId,
              date,
              startMin: selected,
            });
            router.push("/randevularim?created=1");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
            setSelected(null);
            setRefresh((x) => x + 1);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="booking-step">
          <legend>Hizmet</legend>
          <div className="option-list" role="radiogroup" aria-label="Hizmet">
            {services.map((s) => (
              <label
                key={s.id}
                className={`option ${serviceId === s.id ? "active" : ""}`}
              >
                <input
                  type="radio"
                  name="service"
                  value={s.id}
                  checked={serviceId === s.id}
                  onChange={() => {
                    reset();
                    setService(s.id);
                  }}
                />
                <span className="option-check">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="option-main">
                  <strong>{s.name}</strong>
                  <small>
                    <Clock3 size={11} /> {formatDuration(s.durationMinutes)}
                  </small>
                </span>
                <span className="option-price">{money(s.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="booking-step">
          <legend>Usta</legend>
          <div className="staff-picker" role="radiogroup" aria-label="Usta">
            {[{ id: "any", name: "Fark etmez", title: "İlk müsait", photo: null }, ...staff].map(
              (s) => (
                <label
                  key={s.id}
                  className={`staff-chip ${staffId === s.id ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="staff"
                    value={s.id}
                    checked={staffId === s.id}
                    onChange={() => {
                      reset();
                      setStaff(s.id);
                    }}
                  />
                  <span className="staff-face">
                    {s.id === "any" ? (
                      <Sparkles size={17} />
                    ) : s.photo ? (
                      <img src={s.photo} alt="" />
                    ) : (
                      s.name.slice(0, 1)
                    )}
                  </span>
                  <span className="staff-name">
                    {s.id === "any" ? s.name : s.name.split(" ").slice(-1)[0]}
                  </span>
                </label>
              ),
            )}
          </div>
        </fieldset>
        <fieldset className="booking-step">
          <legend>
            Gün
            <label className="date-native" title="Takvimden seç">
              <CalendarSearch size={14} />
              <span className="sr-only">Takvimden seç</span>
              <input
                ref={dateInput}
                aria-label="Randevu tarihi"
                type="date"
                min={first}
                max={last}
                defaultValue={date}
                onChange={(e) => {
                  if (e.target.value) pickDate(e.target.value);
                }}
                required
              />
            </label>
          </legend>
          <div className="date-strip" ref={strip}>
            {days.map((d) => {
              const p = dayParts(d);
              const off = closedDays.includes(weekday(d));
              return (
                <button
                  type="button"
                  key={d}
                  data-date={d}
                  className={`date-pill ${d === date ? "active" : ""}`}
                  aria-pressed={d === date}
                  aria-label={`${dateLabel(d)}${off ? ", kapalı" : ""}`}
                  disabled={off}
                  onClick={() => pickDate(d)}
                >
                  <small>{d === first ? "Bugün" : p.weekday}</small>
                  <strong>{p.day}</strong>
                  <small>{off ? "Kapalı" : p.month}</small>
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="booking-step slot-field">
          <legend>Saat</legend>
          {loading ? (
            <div className="slots skeleton-slots" role="status" aria-label="Saatler kontrol ediliyor">
              {Array.from({ length: 8 }, (_, i) => (
                <span className="skeleton" key={i} />
              ))}
            </div>
          ) : closed || (!slots.length && !error) ? (
            <div className="slot-empty">
              <p>
                {closed
                  ? "İşletme bu gün kapalı."
                  : "Bu seçim için boş saat kalmadı."}
              </p>
              <button
                type="button"
                className="button small tinted"
                disabled={searching}
                onClick={findNext}
              >
                {searching ? (
                  <LoaderCircle size={14} className="spin" />
                ) : (
                  <CalendarSearch size={14} />
                )}
                {searching ? "Aranıyor…" : "İlk boş günü bul"}
              </button>
            </div>
          ) : (
            grouped.map((g) => (
              <div className="slot-group" key={g.label}>
                <small>{g.label}</small>
                <div className="slots">
                  {g.slots.map((s) => (
                    <button
                      type="button"
                      className={selected === s.startMin ? "active" : ""}
                      aria-pressed={selected === s.startMin}
                      key={s.startMin}
                      onClick={() => setSelected(s.startMin)}
                    >
                      {clock(s.startMin)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </fieldset>
        <Feedback error={error} />
        {selected !== null && service && (
          <div className="booking-summary">
            <div className="summary-time">
              <strong>{clock(selected)}</strong>
              <span>{dateLabel(date)}</span>
            </div>
            <dl>
              <div>
                <dt>
                  <Clock3 size={13} /> {service.name}
                </dt>
                <dd>{formatDuration(service.durationMinutes)}</dd>
              </div>
              <div>
                <dt>
                  <User size={13} /> Usta
                </dt>
                <dd>{barber?.name ?? "İlk müsait usta"}</dd>
              </div>
              <div className="total">
                <dt>Toplam</dt>
                <dd>{money(service.price)}</dd>
              </div>
            </dl>
          </div>
        )}
        <button
          className="button primary full large"
          disabled={
            busy ||
            loading ||
            selected === null ||
            !slots.some((s) => s.startMin === selected)
          }
        >
          {busy && <LoaderCircle size={16} className="spin" />}
          {busy
            ? "Randevu oluşturuluyor…"
            : loggedIn
              ? "Randevuyu onayla"
              : "Giriş yap ve devam et"}
          {!busy && <ArrowRight size={16} />}
        </button>
        <p className="booking-footnote">
          <Check size={13} /> Ücretsiz rezervasyon · Ödeme işletmede · 2 saat
          öncesine kadar iptal
        </p>
      </form>
    </aside>
  );
}
