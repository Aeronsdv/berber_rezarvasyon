/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { MapPin, Star, ArrowUpRight, Scissors } from "lucide-react";
import type { ShopCardData } from "@/lib/catalog";
import { money } from "@/lib/time";
import { FavoriteButton } from "./ui";
export function ShopCard({
  shop,
  saved = false,
  loggedIn = false,
  distance,
}: {
  shop: ShopCardData;
  saved?: boolean;
  loggedIn?: boolean;
  distance?: number;
}) {
  return (
    <article className="shop-card">
      <div className="shop-cover">
        {shop.coverImage ? (
          <img
            src={shop.coverImage}
            alt={`${shop.name} salonu`}
            loading="lazy"
          />
        ) : (
          <div className="cover-placeholder">
            <Scissors size={55} strokeWidth={1} />
          </div>
        )}
        <span className={`pill cover-status ${shop.open ? "open" : ""}`}>
          <i />
          {shop.open ? "Şu an açık" : "Şu an kapalı"}
        </span>
        <div className="cover-favorite">
          <FavoriteButton shopId={shop.id} saved={saved} loggedIn={loggedIn} />
        </div>
      </div>
      <div className="shop-body">
        <div className="row between">
          <span className="eyebrow">
            {shop.district} · {shop.city}
          </span>
          <span className="rating">
            <Star size={13} fill="currentColor" />
            {shop.rating ? shop.rating.toFixed(1) : "Yeni"}
            {shop.reviewCount > 0 && <small>({shop.reviewCount})</small>}
          </span>
        </div>
        <Link href={`/berber/${shop.slug}`}>
          <h3>{shop.name}</h3>
        </Link>
        <p className="muted location">
          <MapPin size={14} />
          {distance !== undefined
            ? `${distance.toFixed(1)} km uzaklıkta`
            : shop.address}
        </p>
        <div className="tags">
          {shop.serviceNames.slice(0, 3).map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <div className="card-bottom">
          <div>
            {shop.price !== null ? (
              <>
                <strong>{money(shop.price)}</strong>
                <small>başlayan fiyatlarla</small>
              </>
            ) : (
              <small>Hizmetler yakında</small>
            )}
          </div>
          <Link className="card-link" href={`/berber/${shop.slug}`}>
            İncele <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
