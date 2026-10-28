"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Check, Clock3 } from "lucide-react";
import { addDays, clock, dateLabel, money, today } from "@/lib/time";
import { Feedback, request } from "./ui";
export function Booking({
  shopId,
  slug,
  services,
  staff,
  loggedIn,
  initial,
}: {
  shopId: string;
  slug: string;
  services: {
    id: string;
    name: string;
    durationMinutes: number;
    price: string;
  }[];
  staff: { id: string; name: string }[];
  loggedIn: boolean;
  initial: { service?: string; staff?: string; date?: string; time?: string };
}) {
  const router = useRouter();
  const [serviceId, setService] = useState(
    services.some((s) => s.id === initial.service)
      ? initial.service!
      : (services[0]?.id ?? ""),
  );
  const [staffId, setStaff] = useState(
    staff.some((s) => s.id === initial.staff) ? initial.staff! : "any",
  );
  const [date, setDate] = useState(
    initial.date &&
      initial.date >= today() &&
      initial.date <= addDays(today(), 29)
      ? initial.date
      : today(),
  );
  const [selected, setSelected] = useState<number | null>(
    initial.time !== undefined ? Number(initial.time) : null,
  );
  const [slots, setSlots] = useState<{ startMin: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const service = services.find((s) => s.id === serviceId);
  useEffect(() => {
    if (!serviceId) return;
    const controller = new AbortController();
    fetch(
      `/api/slots?${new URLSearchParams({ shopId, serviceId, staffId, date })}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        setSlots(data.slots);
        setClosed(data.closed);
        setSelected((s) =>
          data.slots.some((x: { startMin: number }) => x.startMin === s)
            ? s
            : null,
        );
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
  function reset() {
    setSelected(null);
    setLoading(true);
    setError("");
    setSlots([]);
  }
  if (!services.length || !staff.length)
    return (
      <aside className="booking-panel">
        <h2>Randevular yakında.</h2>
        <p>Bu işletme henüz ekibini veya hizmetlerini tamamlamadı.</p>
      </aside>
    );
  return (
    <aside className="booking-panel" id="rezervasyon">
      <span className="eyebrow">KENDİNE BİR SAAT AYIR</span>
      <h2>Randevunu oluştur.</h2>
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
        <label>
          01 · Hizmet seç
          <select
            value={serviceId}
            onChange={(e) => {
              reset();
              setService(e.target.value);
            }}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.durationMinutes} dk · {money(s.price)}
              </option>
            ))}
          </select>
        </label>
        <label>
          02 · Ustanı seç
          <select
            value={staffId}
            onChange={(e) => {
              reset();
              setStaff(e.target.value);
            }}
          >
            <option value="any">Fark etmez · İlk müsait usta</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          03 · Gününü seç
          <input
            aria-label="Randevu tarihi"
            type="date"
            min={today()}
            max={addDays(today(), 29)}
            value={date}
            onChange={(e) => {
              if (e.target.value) {
                reset();
                setDate(e.target.value);
              }
            }}
            required
          />
        </label>
        <fieldset className="slot-field">
          <legend>04 · Müsait saatler</legend>
          {loading ? (
            <p className="muted" role="status">
              Saatler kontrol ediliyor…
            </p>
          ) : (
            <>
              {closed ? (
                <p className="notice">
                  İşletme bu gün kapalı. Başka bir gün seçebilirsin.
                </p>
              ) : !slots.length && !error ? (
                <p className="notice">
                  Bu seçim için boş saat yok. Başka bir gün veya usta seç.
                </p>
              ) : (
                <div className="slots">
                  {slots.map((s) => (
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
              )}
            </>
          )}
        </fieldset>
        <Feedback error={error} />
        {selected !== null && service && (
          <div className="booking-summary">
            <div>
              <CalendarDays size={16} />
              {dateLabel(date)} · {clock(selected)}
            </div>
            <div>
              <Clock3 size={16} />
              {service.durationMinutes} dakika
              <strong>{money(service.price)}</strong>
            </div>
          </div>
        )}
        <button
          className="button primary full"
          disabled={
            busy ||
            loading ||
            selected === null ||
            !slots.some((s) => s.startMin === selected)
          }
        >
          {busy
            ? "Randevu oluşturuluyor…"
            : loggedIn
              ? "Randevuyu onayla"
              : "Giriş yap ve devam et"}
          <ArrowRight size={17} />
        </button>
        <p className="booking-footnote">
          <Check size={14} /> Rezervasyon ücretsizdir. Ödeme işletmede yapılır.
          <br />
          Günde 1 aktif randevu. Son 2 saate kadar iptal edebilirsin.
        </p>
      </form>
    </aside>
  );
}
