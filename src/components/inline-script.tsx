"use client";
// Sunucuda çalıştırılabilir, istemcide düz metin olarak render edilir:
// React'in <script> uyarısını önler, ilk boyamadan önce senkron çalışır.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
