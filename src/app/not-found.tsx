import Link from "next/link";
export default function NotFound() {
  return (
    <section className="container empty">
      <span className="eyebrow">404</span>
      <h1>Burada bir randevu yok.</h1>
      <p>Aradığınız sayfa bulunamadı.</p>
      <Link className="button primary" href="/kesfet">
        Berberleri keşfet
      </Link>
    </section>
  );
}
