import Link from "next/link";
import { Scissors } from "lucide-react";
export default function NotFound() {
  return (
    <section className="container page">
      <div className="empty">
        <span className="empty-icon">
          <Scissors size={22} />
        </span>
        <span className="eyebrow">404</span>
        <h1>Burada bir randevu yok.</h1>
        <p>Aradığınız sayfa bulunamadı.</p>
        <Link className="button primary" href="/kesfet">
          Berberleri keşfet
        </Link>
      </div>
    </section>
  );
}
