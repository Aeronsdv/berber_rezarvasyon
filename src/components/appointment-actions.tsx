"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Feedback, request, Submit } from "./ui";
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
  return (
    <div className="appointment-actions">
      <div className="row wrap">
        {owner && past && (
          <>
            <button
              className="button small"
              onClick={() => setMode("COMPLETED")}
            >
              Tamamlandı
            </button>
            <button
              className="button small danger"
              onClick={() => setMode("NO_SHOW")}
            >
              Gelmedi
            </button>
          </>
        )}
        {(owner || canCancel) && (
          <button className="text-button" onClick={() => setMode("CANCELLED")}>
            Randevuyu iptal et
          </button>
        )}
        {reviewable && (
          <button className="button small" onClick={() => setMode("REVIEW")}>
            Deneyimini değerlendir
          </button>
        )}
      </div>
      {mode && (
        <form
          className="inline-form"
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
          {mode === "REVIEW" ? (
            <>
              <label>
                Puanın
                <select name="rating">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} yıldız
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Yorumun
                <textarea
                  name="comment"
                  required
                  minLength={3}
                  maxLength={1000}
                />
              </label>
            </>
          ) : (
            <>
              <p>
                {mode === "COMPLETED"
                  ? "Randevuyu tamamlandı olarak işaretle."
                  : mode === "NO_SHOW"
                    ? "Müşteri gelmedi olarak işaretlenecek."
                    : "Randevun iptal edilecek ve saat yeniden açılacak."}
              </p>
              {mode !== "COMPLETED" && (
                <label>
                  {mode === "CANCELLED" ? "İptal nedeni" : "Açıklama"}
                  <input name="reason" maxLength={500} />
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
            <Submit busy={busy}>Onayla</Submit>
            <button
              type="button"
              className="text-button"
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
          required
        />
      </label>
      <Submit busy={busy}>Kaydet</Submit>
      <Feedback error={error} message={message} />
    </form>
  );
}
