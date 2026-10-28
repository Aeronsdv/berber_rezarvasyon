import { requireUser } from "@/lib/session";
import { ShopEditor } from "@/components/owner-forms";
export const metadata = { title: "İşletmeni kaydet" };
export default async function Onboarding() {
  await requireUser("/panel/kurulum");
  return (
    <section className="container section narrow">
      <span className="eyebrow">İŞİNİN USTALARINA</span>
      <h1 className="page-title">Dükkânına yeni bir kapı aç.</h1>
      <p className="lead">
        İşletmeni tanıt, konumunu işaretle. Sonra ekibini ve hizmetlerini
        ekleyelim.
      </p>
      <div className="panel-box">
        <ShopEditor />
      </div>
    </section>
  );
}
