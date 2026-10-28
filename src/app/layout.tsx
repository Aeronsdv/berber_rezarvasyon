import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/header";
import "./globals.css";
import "./theme.css";
const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-montserrat",
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
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={montserrat.variable} data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          İçeriğe geç
        </a>
        <Header />
        <main id="main">{children}</main>
        <footer className="site-footer">
          <Link className="footer-brand" href="/">
            USTA<span className="gold">.</span>
          </Link>
          <p>Zamanın değerli. İyi bir ustaya ayır.</p>
          <span>Türkiye · Europe/Istanbul</span>
        </footer>
      </body>
    </html>
  );
}
