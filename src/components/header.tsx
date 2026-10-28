import Link from "next/link";
import { Scissors, ArrowUpRight } from "lucide-react";
import { currentUser } from "@/lib/session";
import { signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
export async function Header() {
  const user = await currentUser();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Scissors size={23} />
          </span>
          <span>
            USTA<span className="gold">.</span>
            <small>İYİ BİR KESİMİN BAŞLANGICI</small>
          </span>
        </Link>
        <nav aria-label="Ana menü">
          <Link href="/kesfet">Berber keşfet</Link>
          {user && <Link href="/randevularim">Randevularım</Link>}
          <Link className="owner-link" href="/panel">
            İşletmeler için <ArrowUpRight size={14} />
          </Link>
        </nav>
        <div className="header-user">
          <ThemeToggle />
          {user ? (
            <>
              <span className="avatar">
                {user.name?.slice(0, 1).toLocaleUpperCase("tr-TR") ?? "U"}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-button">Çıkış yap</button>
              </form>
            </>
          ) : (
            <Link className="button small" href="/giris">
              Giriş yap <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
