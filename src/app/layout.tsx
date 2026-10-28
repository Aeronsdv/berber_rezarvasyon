import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/header";
import { TabBar } from "@/components/nav";
import { InlineScript } from "@/components/inline-script";
import { currentUser } from "@/lib/session";
import "./globals.css";
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "USTA. — İyi bir kesimin başlangıcı",
    template: "%s | USTA.",
  },
  description:
    "Yakınındaki berberi keşfet. Ustanı, hizmetini ve sana uygun saati seç; randevun hazır.",
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};
// İlk boyamadan önce kayıtlı/sistem temasını uygular (tema yanıp sönmesini önler).
const themeScript = `try{var t=localStorage.getItem("usta-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  return (
    <html
      lang="tr"
      className={inter.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          İçeriğe geç
        </a>
        <Header />
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="footer-inner">
            <Link className="footer-brand" href="/">
              USTA<span className="dot">.</span>
            </Link>
            <p>Zamanın değerli. İyi bir ustaya ayır.</p>
            <nav aria-label="Alt menü">
              <Link href="/kesfet">Keşfet</Link>
              <Link href="/randevularim">Randevularım</Link>
              <Link href="/panel">İşletmeler için</Link>
            </nav>
            <span className="footer-meta">Türkiye · Europe/Istanbul</span>
          </div>
        </footer>
        <TabBar owner={!!user?.shops.length} />
      </body>
    </html>
  );
}
