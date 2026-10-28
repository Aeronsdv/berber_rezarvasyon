"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Star, UserX, X } from "lucide-react";
import { Feedback, request, StarInput, Submit } from "./ui";
export function AppointmentActions({
  id,
  owner = false,
  canCancel = false,
  past = false,
  reviewable = false,
}: {
  id: string;
  owner?: boolean;
  canCancel?: boolean;
  past?: boolean;
  reviewable?: boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("");
  const router = useRouter();
  async function change(action: string, form: FormData) {
    setError("");
    setBusy(true);
    try {
      await request(
        `/api/appointments/${id}`,
        {
          action,
          reason: String(form.get("reason") ?? ""),
          ...(action === "NO_SHOW" && form.get("banDays") !== "none"
            ? { banDays: Number(form.get("banDays")) }
            : {}),
        },
        "PATCH",
      );
      setMode("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!(owner || canCancel || reviewable)) return null;
  return (
    <div className="appointment-actions">
      {!mode && (
        <div className="row wrap">
          {owner && past && (
            <>
              <button
                className="button small success"
                onClick={() => setMode("COMPLETED")}
              >
                <Check size={14} /> Tamamlandı
              </button>
              <button
                className="button small danger"
                onClick={() => setMode("NO_SHOW")}
              >
                <UserX size={14} /> Gelmedi
              </button>
            </>
          )}
          {reviewable && (
            <button
              className="button small tinted"
              onClick={() => setMode("REVIEW")}
            >
              <Star size={14} /> Deneyimini değerlendir
            </button>
          )}
          {(owner || canCancel) && (
            <button
              className="text-button danger"
              onClick={() => setMode("CANCELLED")}
            >
              Randevuyu iptal et
            </button>
          )}
        </div>
      )}
      {mode && (
        <form
          className={`inline-form ${mode === "REVIEW" ? "" : "confirm"}`}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            if (mode === "REVIEW") {
              setBusy(true);
              setError("");
              try {
                await request("/api/reviews", {
                  appointmentId: id,
                  rating: Number(form.get("rating")),
                  comment: form.get("comment"),
                });
                setMode("");
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            } else await change(mode, form);
          }}
        >
          <div className="inline-form-head">
            <strong>
              {mode === "REVIEW"
                ? "Deneyimin nasıldı?"
                : mode === "COMPLETED"
                  ? "Randevu tamamlandı mı?"
                  : mode === "NO_SHOW"
                    ? "Müşteri gelmedi mi?"
                    : "Randevu iptal edilsin mi?"}
            </strong>
            <button
              type="button"
              className="icon-button plain"
              aria-label="Kapat"
              onClick={() => {
                setMode("");
                setError("");
              }}
            >
              <X size={15} />
            </button>
          </div>
          {mode === "REVIEW" ? (
            <>
              <StarInput />
              <label>
                Yorumun
                <textarea
                  name="comment"
                  required
                  minLength={3}
                  maxLength={1000}
                  rows={3}
                  placeholder="Usta, hizmet, ortam…"
                />
              </label>
            </>
          ) : (
            <>
              <p className="muted small">
                {mode === "COMPLETED"
                  ? "Randevu tamamlandı olarak işaretlenecek."
                  : mode === "NO_SHOW"
                    ? "Müşteri gelmedi olarak işaretlenecek."
                    : "Randevu iptal edilecek ve saat yeniden açılacak."}
              </p>
              {mode !== "COMPLETED" && (
                <label>
                  {mode === "CANCELLED" ? "İptal nedeni" : "Açıklama"}
                  <input
                    name="reason"
                    maxLength={500}
                    placeholder="İsteğe bağlı"
                  />
                </label>
              )}
              {mode === "NO_SHOW" && (
                <label>
                  Bu dükkândan uzaklaştır
                  <select name="banDays">
                    <option value="none">Uzaklaştırma uygulama</option>
                    <option value="3">3 gün</option>
                    <option value="7">7 gün</option>
                    <option value="30">30 gün</option>
                    <option value="0">Süresiz</option>
                  </select>
                </label>
              )}
            </>
          )}
          <div className="row">
            <Submit
              busy={busy}
              busyText="İşleniyor…"
              className={mode === "CANCELLED" || mode === "NO_SHOW" ? "destructive" : ""}
            >
              Onayla
            </Submit>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => {
                setMode("");
                setError("");
              }}
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}
      <Feedback error={error} />
    </div>
  );
}
export function AddToCalendar({
  title,
  start,
  end,
  location,
  description,
}: {
  title: string;
  start: string;
  end: string;
  location: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className="button small"
      onClick={() => {
        const stamp = (iso: string) =>
          new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
        const ics = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//USTA//Randevu//TR",
          "BEGIN:VEVENT",
          `UID:${stamp(start)}-${Math.random().toString(36).slice(2)}@usta`,
          `DTSTAMP:${stamp(new Date().toISOString())}`,
          `DTSTART:${stamp(start)}`,
          `DTEND:${stamp(end)}`,
          `SUMMARY:${esc(title)}`,
          `LOCATION:${esc(location)}`,
          `DESCRIPTION:${esc(description)}`,
          "BEGIN:VALARM",
          "TRIGGER:-PT1H",
          "ACTION:DISPLAY",
          "DESCRIPTION:Randevun 1 saat sonra",
          "END:VALARM",
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\r\n");
        const url = URL.createObjectURL(
          new Blob([ics], { type: "text/calendar;charset=utf-8" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "usta-randevu.ics";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      <CalendarPlus size={14} /> Takvime ekle
    </button>
  );
}
export function ProfilePhone({ phone }: { phone: string | null }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="profile-phone"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        setMessage("");
        try {
          await request("/api/profile", { phone: data.get("phone") }, "PATCH");
          setMessage("Telefon numaran kaydedildi.");
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        İletişim numaran
        <input
          type="tel"
          name="phone"
          defaultValue={phone ?? ""}
          placeholder="+90 5xx xxx xx xx"
          autoComplete="tel"
          required
        />
      </label>
      <Submit busy={busy}>Kaydet</Submit>
      <Feedback error={error} message={message} />
    </form>
  );
}
