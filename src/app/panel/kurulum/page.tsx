import { requireUser } from "@/lib/session";
import { ShopEditor } from "@/components/owner-forms";
export const metadata = { title: "İşletmeni kaydet" };
export default async function Onboarding() {
  await requireUser("/panel/kurulum");
  return (
    <section className="container page narrow">
      <header className="page-head">
        <span className="eyebrow">İşinin ustalarına</span>
        <h1 className="page-title">Dükkânına yeni bir kapı aç.</h1>
        <p className="lead">
          İşletmeni tanıt, konumunu işaretle. Sonra ekibini ve hizmetlerini
          ekleyelim. 14 gün ücretsiz, kart gerekmez.
        </p>
      </header>
      <div className="panel-box rise">
        <ShopEditor />
      </div>
    </section>
  );
}
