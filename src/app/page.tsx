import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
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
  const openNow = shops.filter((s) => s.open).length;
  return (
    <>
      <section className="hero container">
        <div className="hero-copy rise">
          <span className="eyebrow">Bakımına zaman ayır</span>
          <h1>
            İyi bir kesim.
            <br />
            İyi bir <em>başlangıç.</em>
          </h1>
          <p>
            Mahallenin ustasını keşfet, sana uyan saati seç. Beklemek yok;
            sadece sana ayrılan zaman var.
          </p>
          <form className="hero-search" action="/kesfet">
            <MapPin size={17} />
            <label className="sr-only" htmlFor="hero-location">
              Şehir, ilçe veya berber adı
            </label>
            <input
              id="hero-location"
              name="q"
              placeholder="Şehir, ilçe veya berber adı"
              enterKeyHint="search"
            />
            <button className="button primary" type="submit">
              Berber bul
            </button>
          </form>
          <div className="hero-reassurance">
            <span>
              <ShieldCheck size={14} /> Ücretsiz rezervasyon
            </span>
            <span>
              <Clock3 size={14} /> Anlık müsaitlik
            </span>
            {openNow > 0 && (
              <span>
                <i className="green-dot" /> {openNow} berber şu an açık
              </span>
            )}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="device">
            <div className="device-card booking-preview">
              <div className="row between">
                <strong>Saat seç</strong>
                <small className="muted">Yarın</small>
              </div>
              <div className="preview-slots">
                {["10:00", "10:30", "11:15", "13:00", "14:30", "16:00"].map(
                  (t, i) => (
                    <span key={t} className={i === 4 ? "active" : ""}>
                      {t}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className="device-card confirm-preview">
              <span className="check-circle">
                <Check size={16} strokeWidth={3} />
              </span>
              <div>
                <strong>Randevun hazır</strong>
                <small>Yarın 14:30 · Saç & sakal</small>
              </div>
            </div>
            <div className="device-card staff-preview">
              <span className="mini-avatar">A</span>
              <div>
                <strong>Usta Ali</strong>
                <small>
                  <Star size={10} fill="currentColor" /> 4,9 · 120 yorum
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="promise-strip" aria-hidden="true">
        <div className="marquee">
          {Array.from({ length: 2 }, (_, k) => (
            <span key={k}>
              İYİ GÖRÜN. İYİ HİSSET. <i>✳</i> USTANI BUL. <i>✳</i> ZAMAN SANA
              KALSIN. <i>✳</i> İYİ GÖRÜN. İYİ HİSSET. <i>✳</i> USTANI BUL.{" "}
              <i>✳</i> ZAMAN SANA KALSIN. <i>✳</i>
            </span>
          ))}
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Bir sonraki durağın</span>
            <h2>Ustanı keşfet.</h2>
          </div>
          <Link className="text-link" href="/kesfet">
            Tümünü gör <ArrowRight size={15} />
          </Link>
        </div>
        {shops.length ? (
          <div className="shop-grid">
            {shops.slice(0, 3).map((shop) => (
              <div className="reveal" key={shop.id}>
                <ShopCard
                  shop={shop}
                  loggedIn={!!user}
                  saved={favorites.some((f) => f.barbershopId === shop.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <span className="empty-icon">
              <Scissors size={22} />
            </span>
            <h3>İlk ustalarımızı bekliyoruz.</h3>
            <p>İşletmeni ekle, müşterilerin seni burada keşfetsin.</p>
            <Link className="button primary" href="/panel/kurulum">
              Dükkânımı kaydet
            </Link>
          </div>
        )}
      </section>
      <section className="container section steps-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Üç adımda, tam zamanında</span>
            <h2>Randevu almak bu kadar kolay.</h2>
          </div>
        </div>
        <div className="steps">
          {[
            {
              n: "1",
              icon: MapPin,
              title: "Ustanı keşfet",
              text: "Haritada yakındaki berberleri gör, hizmetleri ve yorumları incele.",
            },
            {
              n: "2",
              icon: Scissors,
              title: "Saatini seç",
              text: "Hizmetini, ustanı ve takvimindeki en uygun boş saati seç.",
            },
            {
              n: "3",
              icon: Sparkles,
              title: "Koltuğun hazır",
              text: "Takvimine ekle, yol tarifini al. Gerisi ustanın işi.",
            },
          ].map((s) => (
            <div className="step reveal" key={s.n}>
              <span className="step-icon">
                <s.icon size={18} />
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <span className="step-n">{s.n}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="container section">
        <div className="owner-banner reveal">
          <div>
            <span className="eyebrow">Koltuğun hazır. Peki takvimin?</span>
            <h2>
              Sen sanatına odaklan.
              <br />
              Randevuların bize emanet.
            </h2>
            <ul className="feature-list">
              <li>
                <CalendarDays size={15} /> Canlı, usta bazlı günlük takvim
              </li>
              <li>
                <Users size={15} /> Ekip, mola ve özel çalışma saatleri
              </li>
              <li>
                <BellRing size={15} /> Otomatik hatırlatmalar
              </li>
              <li>
                <CalendarCheck2 size={15} /> Gelmeyen müşteri kontrolü
              </li>
            </ul>
            <Link className="button primary" href="/panel/kurulum">
              İşletmeni USTA’ya taşı <ArrowRight size={15} />
            </Link>
          </div>
          <div className="owner-preview" aria-hidden="true">
            <div className="op-head">
              <strong>Bugün</strong>
              <span className="live-indicator">
                <i /> Canlı
              </span>
            </div>
            {[
              ["09:30", "Mert K.", "Saç kesimi", "confirmed"],
              ["10:15", "Emre D.", "Sakal tıraşı", "completed"],
              ["11:00", "Can Y.", "Saç & sakal", "confirmed"],
            ].map(([t, n, s, st]) => (
              <div className={`op-row status-${st}`} key={t}>
                <b>{t}</b>
                <span>
                  {n}
                  <small>{s}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
