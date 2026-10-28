/* eslint-disable @next/next/no-img-element */
"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  MapPin,
  Navigation,
  Scissors,
  Trash2,
} from "lucide-react";
import { DAYS, WEEK, clock, dateLabel, minutes, today } from "@/lib/time";
import { Feedback, request, Submit } from "./ui";
const Map = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <div className="map-loading skeleton" />,
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
function Switch({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="switch-row">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        name={name}
        defaultChecked={defaultChecked}
      />
    </label>
  );
}
export function ShopEditor({ shop }: { shop?: Shop }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(0);
  const [cover, setCover] = useState(shop?.coverImage ?? "");
  const [point, setPoint] = useState({
    latitude: shop?.latitude ?? 41.0082,
    longitude: shop?.longitude ?? 28.9784,
  });
  const showLocation = !!shop || step === 1;
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
        <ol className="wizard-steps">
          {["İşletmen", "Konumun", "Ekip & hizmetler"].map((label, i) => (
            <li
              key={label}
              className={i === step ? "active" : i < step ? "done" : ""}
            >
              <span>
                {i < step ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      )}
      <div className="form-stack step-pane" hidden={!shop && step !== 0}>
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
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="https://…"
          />
          <small>Herkese açık bir HTTPS görsel adresi kullanın.</small>
        </label>
        {cover.startsWith("https://") && (
          <img className="cover-preview" src={cover} alt="Vitrin önizlemesi" />
        )}
      </div>
      <div className="form-stack step-pane" hidden={!showLocation}>
        <div className="form-grid">
          <label>
            Şehir
            <input
              name="city"
              required={showLocation}
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
              required={showLocation}
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
            required={showLocation}
            defaultValue={shop?.address}
            placeholder="Mahalle, cadde, bina no"
            maxLength={300}
            minLength={5}
          />
        </label>
        <div className="row between wrap">
          <p className="muted small row">
            <MapPin size={14} />
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
            <Navigation size={13} />
            Konumumu kullan
          </button>
        </div>
        {showLocation && (
          <div className="location-picker">
            <Map value={point} onChange={setPoint} />
          </div>
        )}
        <div className="form-grid coords">
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
        <Switch
          name="isActive"
          label="Yayında"
          hint="İşletmem keşifte görünsün ve randevu kabul etsin"
          defaultChecked={shop?.isActive ?? true}
        />
      </div>
      <Feedback error={error} message={message} />
      <div className="row form-actions">
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
              Konuma geç <ArrowRight size={15} />
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
  function copyFirstOpen() {
    const source = WEEK.map((d) => hours.find((h) => h.dayOfWeek === d)!).find(
      (h) => !h.isClosed,
    );
    if (!source) return;
    setHours(
      hours.map((h) =>
        h.isClosed
          ? h
          : { ...h, openMin: source.openMin, closeMin: source.closeMin },
      ),
    );
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
            <div
              className={`hours-row ${h.isClosed ? "closed" : ""}`}
              key={day}
            >
              <strong>{DAYS[day]}</strong>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                aria-label={`${DAYS[day]} açık`}
                checked={!h.isClosed}
                onChange={(e) => update(day, { isClosed: !e.target.checked })}
              />
              {h.isClosed ? (
                <span className="closed-label">Kapalı</span>
              ) : (
                <span className="time-range">
                  <input
                    aria-label={`${DAYS[day]} açılış`}
                    type="time"
                    value={clock(h.openMin)}
                    required
                    onChange={(e) =>
                      e.target.value &&
                      update(day, { openMin: minutes(e.target.value) })
                    }
                  />
                  <span className="muted">–</span>
                  <input
                    aria-label={`${DAYS[day]} kapanış`}
                    type="time"
                    value={clock(h.closeMin)}
                    required
                    onChange={(e) =>
                      e.target.value &&
                      update(day, { closeMin: minutes(e.target.value) })
                    }
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <Feedback error={error} message={message} />
      <div className="row wrap form-actions">
        <Submit busy={busy}>Saatleri kaydet</Submit>
        <button type="button" className="button" onClick={copyFirstOpen}>
          <Copy size={13} /> İlk açık günü tümüne uygula
        </button>
      </div>
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
  const [photo, setPhoto] = useState(staff?.photo ?? "");
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
          if (!item) {
            form.reset();
            setPhoto("");
          }
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
          placeholder={kind === "staff" ? "Örn. Ali Yılmaz" : "Örn. Saç kesimi"}
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
          <div className="photo-field">
            <span className="staff-avatar small">
              {photo.startsWith("https://") ? (
                <img src={photo} alt="" />
              ) : (
                (item?.name ?? "U").slice(0, 1)
              )}
            </span>
            <label>
              Fotoğraf adresi
              <input
                type="url"
                name="photo"
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                placeholder="https://…"
              />
            </label>
          </div>
        </>
      ) : (
        <div className="form-grid">
          <fieldset className="duration-field">
            <legend>Süre</legend>
            <div className="segmented full">
              {[15, 30, 45, 60].map((d) => (
                <label key={d}>
                  <input
                    type="radio"
                    name="durationMinutes"
                    value={d}
                    defaultChecked={(service?.durationMinutes ?? 30) === d}
                    required
                  />
                  <span>{d === 60 ? "1 sa" : `${d} dk`}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="price-field">
            Fiyat (₺)
            <input
              type="number"
              name="price"
              defaultValue={service?.price ?? "0"}
              min={0}
              max={100000}
              step="0.01"
              inputMode="decimal"
              required
            />
          </label>
        </div>
      )}
      <Switch
        name="isActive"
        label="Aktif"
        hint={
          kind === "staff"
            ? "Müşteriler bu ustayı seçebilsin"
            : "Hizmet randevuda listelensin"
        }
        defaultChecked={item?.isActive ?? true}
      />
      <Feedback error={error} message={message} />
      <div>
        <Submit busy={busy}>
          {item ? "Güncelle" : kind === "staff" ? "Usta ekle" : "Hizmet ekle"}
        </Submit>
      </div>
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
      <div className="form-grid three">
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
      <div>
        <Submit busy={busy}>Mola ekle</Submit>
      </div>
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
        className="button small danger"
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
        <Trash2 size={13} />
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
        <ShopEditor shop={shop} />
      </div>
    );
  if (tab === "hours")
    return (
      <div className="panel-box">
        <p className="muted small box-intro">
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
          <h2 className="box-title">Yeni hizmet</h2>
          <ResourceForm shopId={shop.id} kind="service" />
        </div>
        <div className="resource-list">
          <h2 className="box-title">
            Hizmet kataloğun <span className="count">{services.length}</span>
          </h2>
          {services.length === 0 && (
            <p className="notice">İlk hizmetini ekleyerek başla.</p>
          )}
          {services.map((s) => (
            <details className="resource-item" key={s.id}>
              <summary>
                <span className="resource-icon">
                  <Scissors size={15} />
                </span>
                <span className="resource-main">
                  {s.name}
                  <small>
                    <Clock3 size={11} /> {s.durationMinutes} dk · ₺{s.price}
                  </small>
                </span>
                <span className={`state-dot ${s.isActive ? "on" : ""}`}>
                  {s.isActive ? "Aktif" : "Pasif"}
                </span>
                <ChevronDown size={16} className="chev" />
              </summary>
              <div className="resource-body">
                <ResourceForm shopId={shop.id} kind="service" item={s} />
              </div>
            </details>
          ))}
        </div>
      </div>
    );
  return (
    <div className="settings-grid">
      <div className="panel-box">
        <h2 className="box-title">Ekibine bir usta ekle</h2>
        <ResourceForm shopId={shop.id} kind="staff" />
      </div>
      <div className="resource-list">
        <h2 className="box-title">
          Ustaların <span className="count">{staff.length}</span>
        </h2>
        {staff.length === 0 && (
          <p className="notice">
            Randevu alabilmek için en az bir aktif usta ekle.
          </p>
        )}
        {staff.map((s) => (
          <details className="resource-item" key={s.id}>
            <summary>
              <span className="resource-icon round">
                {s.photo ? <img src={s.photo} alt="" /> : s.name.slice(0, 1)}
              </span>
              <span className="resource-main">
                {s.name}
                <small>
                  {s.title}
                  {s.breaks.length > 0 && ` · ${s.breaks.length} planlı mola`}
                </small>
              </span>
              <span className={`state-dot ${s.isActive ? "on" : ""}`}>
                {s.isActive ? "Aktif" : "Pasif"}
              </span>
              <ChevronDown size={16} className="chev" />
            </summary>
            <div className="resource-body">
              <ResourceForm shopId={shop.id} kind="staff" item={s} />
              <details className="nested-details">
                <summary>
                  Ustaya özel çalışma saatleri
                  <ChevronDown size={14} className="chev" />
                </summary>
                <p className="muted small">
                  Özel saatler kaydedilene kadar dükkânın saatleri geçerlidir.
                </p>
                <HoursEditor
                  shopId={shop.id}
                  staffId={s.id}
                  initial={s.hours.length ? s.hours : hours}
                />
              </details>
              <details className="nested-details">
                <summary>
                  Molalar ve izinler
                  {s.breaks.length > 0 && (
                    <span className="count">{s.breaks.length}</span>
                  )}
                  <ChevronDown size={14} className="chev" />
                </summary>
                <BreakForm shopId={shop.id} staffId={s.id} />
                {s.breaks.map((b) => (
                  <div className="list-row" key={b.id}>
                    <span>
                      <strong>
                        {dateLabel(b.date)} · {clock(b.startMin)}–
                        {clock(b.endMin)}
                      </strong>
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
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
