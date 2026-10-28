"use client";
import { RotateCcw, TriangleAlert } from "lucide-react";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="container page">
      <div className="empty">
        <span className="empty-icon">
          <TriangleAlert size={22} />
        </span>
        <h1>Bir şeyler yolunda gitmedi.</h1>
        <p>Sayfa şu anda yüklenemiyor. Lütfen biraz sonra tekrar deneyin.</p>
        <button className="button primary" onClick={reset}>
          <RotateCcw size={14} /> Tekrar dene
        </button>
      </div>
    </section>
  );
}
