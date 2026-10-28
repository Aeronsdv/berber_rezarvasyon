"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const storageKey = "usta-theme";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.dataset.theme === "dark";
}

function saved() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function apply(theme: "light" | "dark", persist: boolean) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) =>
      m.setAttribute("content", theme === "dark" ? "#000000" : "#f5f5f7"),
    );
  if (persist) {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {}
  }
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  // Kullanıcı bir tercih kaydetmediyse sistem temasını canlı takip et.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      if (!saved()) apply(media.matches ? "dark" : "light", false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function toggleTheme(e: React.MouseEvent<HTMLButtonElement>) {
    const next = dark ? "light" : "dark";
    const doc = document as ViewTransitionDocument;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) {
      apply(next, true);
      return;
    }
    // Tıklanan noktadan dairesel geçiş (View Transitions API).
    const x = e.clientX || window.innerWidth - 40;
    const y = e.clientY || 28;
    const r = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    doc
      .startViewTransition(() => apply(next, true))
      .ready.then(() =>
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${r}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 480,
            easing: "cubic-bezier(.32,.72,0,1)",
            pseudoElement: "::view-transition-new(root)",
          },
        ),
      )
      .catch(() => {});
  }

  return (
    <button
      aria-label={dark ? "Açık temaya geç" : "Koyu temaya geç"}
      className="theme-toggle"
      onClick={toggleTheme}
      title={dark ? "Açık tema" : "Koyu tema"}
      type="button"
    >
      <span className="theme-icon" key={dark ? "sun" : "moon"}>
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
    </button>
  );
}
