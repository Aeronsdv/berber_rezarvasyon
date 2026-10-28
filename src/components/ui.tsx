"use client";
import { useState } from "react";
import { Heart, LoaderCircle } from "lucide-react";
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
          {message}
        </p>
      )}
    </>
  );
}
export function Submit({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button className="button primary" disabled={busy} type="submit">
      {busy && <LoaderCircle size={16} className="spin" />}
      {busy ? "Kaydediliyor…" : children}
    </button>
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
    <div>
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
          try {
            await request("/api/favorites", {
              barbershopId: shopId,
              saved: !value,
            });
            setValue(!value);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Heart size={19} fill={value ? "currentColor" : "none"} />
      </button>
      <Feedback error={error} />
    </div>
  );
}
