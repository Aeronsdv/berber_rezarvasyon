import Link from "next/link";
import { Scissors, LogOut } from "lucide-react";
import { currentUser } from "@/lib/session";
import { signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinks } from "@/components/nav";
export async function Header() {
  const user = await currentUser();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="USTA. ana sayfa">
          <span className="brand-mark">
            <Scissors size={15} strokeWidth={2.2} />
          </span>
          <span className="brand-word">
            USTA<span className="dot">.</span>
          </span>
        </Link>
        <NavLinks loggedIn={!!user} owner={!!user?.shops.length} />
        <div className="header-user">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                className="avatar"
                href="/randevularim"
                title={user.name ?? "Hesabım"}
                aria-label="Randevularım"
              >
                {user.name?.slice(0, 1).toLocaleUpperCase("tr-TR") ?? "U"}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  className="icon-button plain"
                  aria-label="Çıkış yap"
                  title="Çıkış yap"
                >
                  <LogOut size={16} />
                </button>
              </form>
            </>
          ) : (
            <Link className="button small primary" href="/giris">
              Giriş yap
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
