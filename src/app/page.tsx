import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Scissors,
  Clock3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { catalog } from "@/lib/catalog";
import { ShopCard } from "@/components/shop-card";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
export default async function Home() {
  const [shops, user] = await Promise.all([catalog(), currentUser()]);
  const favorites = user
    ? await db.favorite.findMany({ where: { userId: user.id } })
    : [];
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-line" /> BAKIMINA ZAMAN AYIR
          </span>
          <h1>
            İyi bir kesim.
            <br />
            İyi bir <em>başlangıç.</em>
          </h1>
          <p>
            Mahallenin ustasını keşfet, sana uyan saati seç.
            <br className="desktop" /> Beklemek yok. Sadece sana ayrılan zaman
            var.
          </p>
          <form className="hero-search" action="/kesfet">
            <MapPin size={20} />
            <label className="sr-only" htmlFor="hero-location">
              Şehir, ilçe veya berber adı
            </label>
            <input
              id="hero-location"
              name="q"
              placeholder="Şehir, ilçe veya berber adı"
            />
            <button className="button primary" type="submit">
              Berber bul <ArrowUpRight size={18} />
            </button>
          </form>
          <div className="hero-reassurance">
            <span>
              <ShieldCheck size={15} /> Ücretsiz rezervasyon
            </span>
            <span>
              <Clock3 size={15} /> Sana uygun saatler
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-lines" />
          <span className="art-top">USTALIK, DETAYLARDA SAKLI.</span>
          <div className="scissors-emblem">
            <Scissors strokeWidth={0.65} />
            <span>THE ART OF GROOMING</span>
          </div>
          <div className="art-caption">
            <span>
              GELENEKTEN GELEN USTALIK
              <br />
              <strong>Bugünün ritmine uygun.</strong>
            </span>
            <span className="art-star">✳</span>
          </div>
          <div className="floating-note">
            <span className="check-circle">✓</span>
            <div>
              <strong>Bir sonraki iyi görünümün</strong>
              <small>bir randevu uzağında.</small>
            </div>
          </div>
        </div>
      </section>
      <div className="promise-strip">
        <span>İYİ GÖRÜN. İYİ HİSSET.</span>
        <i>✳</i>
        <span>USTANI BUL.</span>
        <i>✳</i>
        <span>ZAMAN SANA KALSIN.</span>
        <i>✳</i>
        <span>İYİ GÖRÜN. İYİ HİSSET.</span>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BİR SONRAKİ DURAĞIN</span>
            <h2>Ustanı keşfet.</h2>
            <p>Tarzına ve programına uyan berberlerle tanış.</p>
          </div>
          <Link className="text-link" href="/kesfet">
            Tüm berberler <ArrowRight size={18} />
          </Link>
        </div>
        {shops.length ? (
          <div className="shop-grid">
            {shops.slice(0, 3).map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                loggedIn={!!user}
                saved={favorites.some((f) => f.barbershopId === shop.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty bordered">
            <Scissors size={36} />
            <h3>İlk ustalarımızı bekliyoruz.</h3>
            <p>İşletmeni ekle, müşterilerin seni burada keşfetsin.</p>
            <Link className="button" href="/panel/kurulum">
              Dükkânımı kaydet <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <section className="container steps-section">
        <div>
          <span className="eyebrow">ÜÇ ADIMDA, TAM ZAMANINDA</span>
          <h2>
            Randevu almak
            <br />
            bu kadar kolay.
          </h2>
        </div>
        <div className="steps">
          {[
            {
              n: "01",
              icon: MapPin,
              title: "Ustanı keşfet",
              text: "Haritada yakındaki berberleri gör, hizmetleri ve yorumları incele.",
            },
            {
              n: "02",
              icon: Scissors,
              title: "Kendine zaman ayır",
              text: "Hizmetini, ustanı ve takvimindeki en uygun saati seç.",
            },
            {
              n: "03",
              icon: Sparkles,
              title: "Yeni görünümüne merhaba",
              text: "Randevu saatinde koltuğun hazır. Gerisi ustanın işi.",
            },
          ].map((s) => (
            <div className="step" key={s.n}>
              <div className="row between">
                <s.icon size={24} />
                <span>{s.n}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="container owner-banner">
        <div>
          <span className="eyebrow">KOLTUĞUN HAZIR. PEKİ TAKVİMİN?</span>
          <h2>
            Sen sanatına odaklan.
            <br />
            Randevuların bize emanet.
          </h2>
          <p>Dükkânını, ekibini ve randevularını tek yerden yönet.</p>
        </div>
        <Link className="button primary" href="/panel/kurulum">
          İşletmeni USTA’ya taşı <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
