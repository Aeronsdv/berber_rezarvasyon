"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, House, Store } from "lucide-react";

function useActive() {
  const path = usePathname();
  return (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

export function NavLinks({
  loggedIn,
  owner,
}: {
  loggedIn: boolean;
  owner: boolean;
}) {
  const active = useActive();
  const links = [
    { href: "/kesfet", label: "Berber keşfet" },
    ...(loggedIn ? [{ href: "/randevularim", label: "Randevularım" }] : []),
    { href: "/panel", label: owner ? "İşletme paneli" : "İşletmeler için" },
  ];
  return (
    <nav className="header-nav" aria-label="Ana menü">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={active(l.href) ? "active" : ""}
          aria-current={active(l.href) ? "page" : undefined}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobilde iOS tarzı alt sekme çubuğu. */
export function TabBar({ owner }: { owner: boolean }) {
  const active = useActive();
  const path = usePathname();
  // Berber sayfasında alt alanı rezervasyon çubuğuna bırak.
  if (path.startsWith("/berber/")) return null;
  const items = [
    { href: "/", label: "Ana sayfa", icon: House },
    { href: "/kesfet", label: "Keşfet", icon: Compass },
    { href: "/randevularim", label: "Randevular", icon: CalendarDays },
    { href: "/panel", label: owner ? "Panel" : "İşletme", icon: Store },
  ];
  return (
    <nav className="tab-bar" aria-label="Hızlı menü">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={active(i.href) ? "active" : ""}
          aria-current={active(i.href) ? "page" : undefined}
        >
          <i.icon size={21} strokeWidth={active(i.href) ? 2.3 : 1.8} />
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
