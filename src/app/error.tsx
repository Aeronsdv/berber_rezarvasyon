"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="container empty">
      <h1>Bir şeyler yolunda gitmedi.</h1>
      <p>Sayfa şu anda yüklenemiyor. Lütfen biraz sonra tekrar deneyin.</p>
      <button className="button primary" onClick={reset}>
        Tekrar dene
      </button>
    </section>
  );
}
