"use client";
import { useState } from "react";
import { Check, Copy, Heart, LoaderCircle, Share } from "lucide-react";
import { useRouter } from "next/navigation";
export async function request<T = Record<string, unknown>>(
  url: string,
  data: unknown,
  method = "POST",
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "İşlem tamamlanamadı.");
  return body;
}
export function Feedback({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          <Check size={15} />
          {message}
        </p>
      )}
    </>
  );
}
export function Submit({
  busy,
  children,
  busyText = "Kaydediliyor…",
  className = "",
}: {
  busy: boolean;
  children: React.ReactNode;
  busyText?: string;
  className?: string;
}) {
  return (
    <button
      className={`button primary ${className}`}
      disabled={busy}
      type="submit"
    >
      {busy && <LoaderCircle size={16} className="spin" />}
      {busy ? busyText : children}
    </button>
  );
}
export function StarInput({
  name = "rating",
  defaultValue = 5,
}: {
  name?: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const labels = ["", "Kötü", "İdare eder", "İyi", "Çok iyi", "Mükemmel"];
  return (
    <fieldset className="star-input" onMouseLeave={() => setHover(0)}>
      <legend>Puanın</legend>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={(hover || value) >= n ? "on" : ""}
            onMouseEnter={() => setHover(n)}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => setValue(n)}
            />
            <span aria-hidden="true">★</span>
            <span className="sr-only">{n} yıldız</span>
          </label>
        ))}
        <small>{labels[hover || value]}</small>
      </div>
    </fieldset>
  );
}
export function FavoriteButton({
  shopId,
  saved,
  loggedIn,
}: {
  shopId: string;
  saved: boolean;
  loggedIn: boolean;
}) {
  const [value, setValue] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="favorite">
      <button
        className={`icon-button ${value ? "selected" : ""}`}
        disabled={busy}
        aria-label={value ? "Favorilerden çıkar" : "Favorilere ekle"}
        aria-pressed={value}
        onClick={async () => {
          if (!loggedIn) {
            router.push(
              `/giris?callbackUrl=${encodeURIComponent(location.pathname)}`,
            );
            return;
          }
          setBusy(true);
          setError("");
          const next = !value;
          setValue(next);
          try {
            await request("/api/favorites", {
              barbershopId: shopId,
              saved: next,
            });
            router.refresh();
          } catch (e) {
            setValue(!next);
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Heart size={17} fill={value ? "currentColor" : "none"} />
      </button>
      {error && (
        <p className="favorite-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function ShareButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="icon-button"
      aria-label="Paylaş"
      title="Paylaş"
      onClick={async () => {
        const url = `${location.origin}${path}`;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
          } catch {}
          return;
        }
        await navigator.clipboard?.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? <Check size={17} /> : <Share size={17} />}
    </button>
  );
}
export function CopyLink({ path, label }: { path: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="button small ghost"
      onClick={async () => {
        await navigator.clipboard?.writeText(`${location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Kopyalandı" : label}
    </button>
  );
}
