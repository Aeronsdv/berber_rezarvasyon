import { catalog } from "@/lib/catalog";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Discovery } from "@/components/discovery";
export const metadata = { title: "Berber keşfet" };
export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [shops, user, search] = await Promise.all([
    catalog(),
    currentUser(),
    searchParams,
  ]);
  const favorites = user
    ? await db.favorite.findMany({ where: { userId: user.id } })
    : [];
  return (
    <section className="container page">
      <header className="page-head">
        <span className="eyebrow">Tarzının yeni adresi</span>
        <h1 className="page-title">İyi ustalar, yakınında.</h1>
        <p className="lead">Bir koltuktan fazlası. Kendine ayırdığın zaman.</p>
      </header>
      <Discovery
        shops={shops}
        favorites={favorites.map((f) => f.barbershopId)}
        loggedIn={!!user}
        initialQuery={typeof search.q === "string" ? search.q : ""}
      />
    </section>
  );
}
