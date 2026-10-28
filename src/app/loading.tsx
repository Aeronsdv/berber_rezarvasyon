export default function Loading() {
  return (
    <section className="container page loading-page" aria-busy="true">
      <span className="sr-only">Hazırlanıyor…</span>
      <div className="skeleton sk-eyebrow" />
      <div className="skeleton sk-title" />
      <div className="skeleton sk-line" />
      <div className="shop-grid">
        {Array.from({ length: 3 }, (_, i) => (
          <div className="skeleton sk-card" key={i} />
        ))}
      </div>
    </section>
  );
}
