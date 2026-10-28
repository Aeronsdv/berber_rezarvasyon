import Link from "next/link";
import { Scissors, ShieldCheck, ArrowRight } from "lucide-react";
import { signIn, googleEnabled, devLoginEnabled } from "@/auth";
export const metadata = { title: "Giriş yap" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const candidate = params.callbackUrl;
  const callback =
    typeof candidate === "string" &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes("\\")
      ? candidate
      : "/randevularim";
  return (
    <section className="auth-wrap">
      <div className="auth-card">
        <span className="brand-mark large">
          <Scissors size={34} />
        </span>
        <span className="eyebrow">İYİ Kİ GELDİN</span>
        <h1>Kendine zaman ayır.</h1>
        <p>
          Randevularını ve favori ustalarını
          <br />
          tek bir hesapla yönet.
        </p>
        {params.error && (
          <p role="alert" className="notice error">
            Giriş tamamlanamadı. Lütfen tekrar deneyin.
          </p>
        )}
        {googleEnabled ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: callback });
            }}
          >
            <button className="button google full">
              <span className="google-g">G</span> Google ile devam et{" "}
              <ArrowRight size={17} />
            </button>
          </form>
        ) : (
          <p className="notice">Google ile giriş henüz etkinleştirilmedi.</p>
        )}
        <div className="auth-note">
          <ShieldCheck size={17} />
          <span>
            Tek hesap. Hem müşteri hem işletme sahibi olarak kullanabilirsin.
          </span>
        </div>
        {devLoginEnabled && (
          <details className="dev-login">
            <summary>Geliştirici girişi · yalnızca yerel ortam</summary>
            <form
              action={async (form) => {
                "use server";
                await signIn("dev", {
                  email: form.get("email"),
                  name: form.get("name"),
                  redirectTo: callback,
                });
              }}
            >
              <label>
                Adın
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Ad Soyad"
                  required
                />
              </label>
              <label>
                E-posta
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@example.com"
                  required
                />
              </label>
              <button className="button full">
                Geliştirici olarak giriş yap
              </button>
            </form>
          </details>
        )}
        <Link className="text-link" href="/kesfet">
          Giriş yapmadan keşfet →
        </Link>
      </div>
    </section>
  );
}
