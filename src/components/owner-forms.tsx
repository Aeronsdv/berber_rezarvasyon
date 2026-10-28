"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, Navigation } from "lucide-react";
import { DAYS, WEEK, clock, minutes, today } from "@/lib/time";
import { Feedback, request, Submit } from "./ui";
const Map = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <div className="map-loading">Harita yükleniyor…</div>,
});
type Shop = {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  latitude: number;
  longitude: number;
  coverImage: string | null;
  isActive: boolean;
};
type Hours = {
  dayOfWeek: number;
  openMin: number;
  closeMin: number;
  isClosed: boolean;
};
type Staff = {
  id: string;
  name: string;
  title: string;
  photo: string | null;
  isActive: boolean;
  hours: Hours[];
  breaks: {
    id: string;
    date: string;
    startMin: number;
    endMin: number;
    reason: string;
  }[];
};
type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  isActive: boolean;
};
const defaults: Hours[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  openMin: 540,
  closeMin: 1200,
  isClosed: dayOfWeek === 0,
}));
export function ShopEditor({ shop }: { shop?: Shop }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(0);
  const [point, setPoint] = useState({
    latitude: shop?.latitude ?? 41.0082,
    longitude: shop?.longitude ?? 28.9784,
  });
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (!shop && step === 0) {
          setStep(1);
          return;
        }
        const data = {
          name: f.get("name"),
          description: f.get("description"),
          address: f.get("address"),
          city: f.get("city"),
          district: f.get("district"),
          phone: f.get("phone"),
          coverImage: f.get("coverImage"),
          isActive: f.get("isActive") === "on",
          ...point,
        };
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const result = await request<{ id: string }>(
            shop ? `/api/owner/${shop.id}` : "/api/owner",
            shop ? { action: "shop", data } : data,
          );
          if (!shop) router.push(`/panel?shop=${result.id}&tab=services`);
          else setMessage("İşletme bilgileri kaydedildi.");
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {!shop && (
        <div className="wizard-steps">
          <span className={step === 0 ? "active" : ""}>01 · İşletmen</span>
          <span className={step === 1 ? "active" : ""}>02 · Konumun</span>
          <span>03 · Ekibin & hizmetlerin</span>
        </div>
      )}
      <div hidden={!shop && step !== 0}>
        <div className="form-grid">
          <label>
            İşletme adı
            <input
              name="name"
              required
              minLength={3}
              maxLength={100}
              defaultValue={shop?.name}
              placeholder="Örn. Köşe Berber"
            />
          </label>
          <label>
            İletişim telefonu
            <input
              name="phone"
              type="tel"
              required
              minLength={10}
              maxLength={20}
              defaultValue={shop?.phone}
              placeholder="+90 5xx xxx xx xx"
            />
          </label>
        </div>
        <label>
          İşletmeni tanıt
          <textarea
            name="description"
            maxLength={2000}
            defaultValue={shop?.description}
            placeholder="Seni ve dükkânını farklı kılan nedir?"
            rows={3}
          />
        </label>
        <label>
          Vitrin görseli adresi
          <input
            type="url"
            name="coverImage"
            defaultValue={shop?.coverImage ?? ""}
            placeholder="https://…"
          />
          <small>Herkese açık bir HTTPS görsel adresi kullanın.</small>
        </label>
      </div>
      <div hidden={!shop && step !== 1}>
        <div className="form-grid">
          <label>
            Şehir
            <input
              name="city"
              required={!!shop || step === 1}
              defaultValue={shop?.city}
              placeholder="İstanbul"
              maxLength={60}
              minLength={2}
            />
          </label>
          <label>
            İlçe
            <input
              name="district"
              required={!!shop || step === 1}
              defaultValue={shop?.district}
              placeholder="Kadıköy"
              maxLength={60}
              minLength={2}
            />
          </label>
        </div>
        <label>
          Açık adres
          <input
            name="address"
            required={!!shop || step === 1}
            defaultValue={shop?.address}
            placeholder="Mahalle, cadde, bina no"
            maxLength={300}
            minLength={5}
          />
        </label>
        <div className="row between wrap">
          <p className="muted row">
            <MapPin size={16} />
            Haritaya tıkla veya pini sürükle.
          </p>
          <button
            className="button small"
            type="button"
            onClick={() => {
              if (!navigator.geolocation) {
                setError("Konum desteklenmiyor.");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (p) =>
                  setPoint({
                    latitude: p.coords.latitude,
                    longitude: p.coords.longitude,
                  }),
                () => setError("Konum alınamadı. Haritada konum seçebilirsin."),
                { timeout: 10000 },
              );
            }}
          >
            <Navigation size={14} />
            Konumumu kullan
          </button>
        </div>
        {(!!shop || step === 1) && (
          <div className="location-picker">
            <Map value={point} onChange={setPoint} />
          </div>
        )}
        <div className="form-grid">
          <label>
            Enlem
            <input
              type="number"
              step="any"
              min={-90}
              max={90}
              value={point.latitude}
              onChange={(e) =>
                setPoint({ ...point, latitude: Number(e.target.value) })
              }
              required
            />
          </label>
          <label>
            Boylam
            <input
              type="number"
              step="any"
              min={-180}
              max={180}
              value={point.longitude}
              onChange={(e) =>
                setPoint({ ...point, longitude: Number(e.target.value) })
              }
              required
            />
          </label>
        </div>
      </div>
      <div hidden={!shop && step !== 1}>
<label className="checkbox">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={shop?.isActive ?? true}
          />{" "}
          İşletmem keşifte görünsün ve randevu kabul etsin
        </label>
      </div>
      <Feedback error={error} message={message} />
      <div className="row">
        {!shop && step === 1 && (
          <button type="button" className="button" onClick={() => setStep(0)}>
            Geri
          </button>
        )}
        <Submit busy={busy}>
          {shop ? (
            "Değişiklikleri kaydet"
          ) : step === 0 ? (
            <>
              Konuma geç <ArrowRight size={16} />
            </>
          ) : (
            "İşletmemi oluştur"
          )}
        </Submit>
      </div>
    </form>
  );
}
function HoursEditor({
  shopId,
  staffId,
  initial,
}: {
  shopId: string;
  staffId?: string;
  initial: Hours[];
}) {
  const [hours, setHours] = useState(initial.length === 7 ? initial : defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  function update(day: number, data: Partial<Hours>) {
    setHours(hours.map((h) => (h.dayOfWeek === day ? { ...h, ...data } : h)));
  }
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        try {
          await request(`/api/owner/${shopId}`, {
            action: staffId ? "staffHours" : "hours",
            id: staffId,
            data: hours,
          });
          setMessage("Çalışma saatleri kaydedildi.");
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="hours-editor">
        {WEEK.map((day) => {
          const h = hours.find((h) => h.dayOfWeek === day)!;
          return (
            <div className="hours-row" key={day}>
              <strong>{DAYS[day]}</strong>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!h.isClosed}
                  onChange={(e) => update(day, { isClosed: !e.target.checked })}
                />{" "}
                Açık
              </label>
              <input
                aria-label={`${DAYS[day]} açılış`}
                type="time"
                disabled={h.isClosed}
                value={clock(h.openMin)}
                required
                onChange={(e) =>
                  update(day, { openMin: minutes(e.target.value) })
                }
              />
              <span>—</span>
              <input
                aria-label={`${DAYS[day]} kapanış`}
                type="time"
                disabled={h.isClosed}
                value={clock(h.closeMin)}
                required
                onChange={(e) =>
                  update(day, { closeMin: minutes(e.target.value) })
                }
              />
            </div>
          );
        })}
      </div>
      <Feedback error={error} message={message} />
      <Submit busy={busy}>Saatleri kaydet</Submit>
    </form>
  );
}
function ResourceForm({
  shopId,
  kind,
  item,
}: {
  shopId: string;
  kind: "staff" | "service";
  item?: Staff | Service;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const staff = item && "title" in item ? item : undefined;
  const service = item && "price" in item ? item : undefined;
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        setError("");
        setMessage("");
        const data = {
          name: f.get("name"),
          isActive: f.get("isActive") === "on",
          ...(kind === "staff"
            ? { title: f.get("title"), photo: f.get("photo") }
            : {
                durationMinutes: Number(f.get("durationMinutes")),
                price: Number(f.get("price")),
              }),
        };
        try {
          await request(`/api/owner/${shopId}`, {
            action: kind,
            id: item?.id,
            data,
          });
          setMessage("Kaydedildi.");
          if (!item) form.reset();
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        {kind === "staff" ? "Ustanın adı soyadı" : "Hizmet adı"}
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={item?.name}
        />
      </label>
      {kind === "staff" ? (
        <>
          <label>
            Unvan
            <input
              name="title"
              defaultValue={staff?.title ?? "Berber"}
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label>
            Fotoğraf adresi
            <input
              type="url"
              name="photo"
              defaultValue={staff?.photo ?? ""}
              placeholder="https://…"
            />
          </label>
        </>
      ) : (
        <div className="form-grid">
          <label>
            Süre (dakika)
            <select
              name="durationMinutes"
              defaultValue={service?.durationMinutes ?? 30}
              required
            >
              <option value={15}>15 dakika</option>
              <option value={30}>30 dakika</option>
              <option value={45}>45 dakika</option>
              <option value={60}>1 saat</option>
            </select>
          </label>
          <label>
            Fiyat (₺)
            <input
              type="number"
              name="price"
              defaultValue={service?.price ?? "0"}
              min={0}
              max={100000}
              step="0.01"
              required
            />
          </label>
        </div>
      )}
      <label className="checkbox">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={item?.isActive ?? true}
        />{" "}
        Aktif
      </label>
      <Feedback error={error} message={message} />
      <Submit busy={busy}>
        {item ? "Güncelle" : kind === "staff" ? "Usta ekle" : "Hizmet ekle"}
      </Submit>
    </form>
  );
}
function BreakForm({ shopId, staffId }: { shopId: string; staffId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        setError("");
        try {
          await request(`/api/owner/${shopId}`, {
            action: "break",
            data: {
              staffId,
              date: f.get("date"),
              startMin: minutes(String(f.get("start"))),
              endMin: minutes(String(f.get("end"))),
              reason: f.get("reason"),
            },
          });
          form.reset();
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Mola tarihi
        <input
          type="date"
          name="date"
          min={today()}
          defaultValue={today()}
          required
        />
      </label>
      <div className="form-grid">
        <label>
          Başlangıç
          <input type="time" name="start" required defaultValue="12:00" />
        </label>
        <label>
          Bitiş
          <input type="time" name="end" required defaultValue="13:00" />
        </label>
      </div>
      <label>
        Açıklama
        <input name="reason" defaultValue="Mola" maxLength={100} />
      </label>
      <Feedback error={error} />
      <Submit busy={busy}>Mola ekle</Submit>
    </form>
  );
}
export function RemoveButton({
  shopId,
  id,
  action,
}: {
  shopId: string;
  id: string;
  action: "removeBreak" | "unban";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div>
      <button
        className="button small"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await request(`/api/owner/${shopId}`, { action, id });
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Kaldırılıyor…" : "Kaldır"}
      </button>
      <Feedback error={error} />
    </div>
  );
}
export function OwnerSettings({
  shop,
  staff,
  services,
  hours,
  tab,
}: {
  shop: Shop;
  staff: Staff[];
  services: Service[];
  hours: Hours[];
  tab: string;
}) {
  if (tab === "shop")
    return (
      <div className="panel-box">
        <h2>İşletme bilgileri</h2>
        <ShopEditor shop={shop} />
      </div>
    );
  if (tab === "hours")
    return (
      <div className="panel-box">
        <h2>Haftalık çalışma saatleri</h2>
        <p className="muted">
          Gece yarısını geçen vardiyalar desteklenmez. Mevcut randevularla
          çakışan değişiklikler engellenir.
        </p>
        <HoursEditor shopId={shop.id} initial={hours} />
      </div>
    );
  if (tab === "services")
    return (
      <div className="settings-grid">
        <div className="panel-box">
          <h2>Yeni hizmet</h2>
          <ResourceForm shopId={shop.id} kind="service" />
        </div>
        <div>
          <h2>Hizmet kataloğun</h2>
          {services.length === 0 && (
            <p className="notice">İlk hizmetini ekleyerek başla.</p>
          )}
          {services.map((s) => (
            <details className="resource-item" key={s.id}>
              <summary>
                {s.name}
                <span>
                  {s.durationMinutes} dk · ₺{s.price} ·{" "}
                  {s.isActive ? "Aktif" : "Pasif"}
                </span>
              </summary>
              <ResourceForm shopId={shop.id} kind="service" item={s} />
            </details>
          ))}
        </div>
      </div>
    );
  return (
    <div className="settings-grid">
      <div className="panel-box">
        <h2>Ekibine bir usta ekle</h2>
        <ResourceForm shopId={shop.id} kind="staff" />
      </div>
      <div>
        <h2>Ustaların</h2>
        {staff.length === 0 && (
          <p className="notice">
            Randevu alabilmek için en az bir aktif usta ekle.
          </p>
        )}
        {staff.map((s) => (
          <details className="resource-item" key={s.id}>
            <summary>
              {s.name}
              <span>
                {s.title} · {s.isActive ? "Aktif" : "Pasif"}
              </span>
            </summary>
            <ResourceForm shopId={shop.id} kind="staff" item={s} />
            <details className="nested-details">
              <summary>Ustaya özel çalışma saatleri</summary>
              <p className="muted">
                Özel saatler kaydedilene kadar dükkânın saatleri geçerlidir.
              </p>
              <HoursEditor
                shopId={shop.id}
                staffId={s.id}
                initial={s.hours.length ? s.hours : hours}
              />
            </details>
            <details className="nested-details">
              <summary>Molalar ve izinler</summary>
              <BreakForm shopId={shop.id} staffId={s.id} />
              {s.breaks.map((b) => (
                <div className="list-row" key={b.id}>
                  <span>
                    {b.date} · {clock(b.startMin)}–{clock(b.endMin)}
                    <small>{b.reason}</small>
                  </span>
                  <RemoveButton
                    shopId={shop.id}
                    id={b.id}
                    action="removeBreak"
                  />
                </div>
              ))}
            </details>
          </details>
        ))}
      </div>
    </div>
  );
}
