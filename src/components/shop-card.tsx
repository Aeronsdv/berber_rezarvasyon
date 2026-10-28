/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { MapPin, Star, Scissors } from "lucide-react";
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
            <Scissors size={34} strokeWidth={1.4} />
          </div>
        )}
        <span className={`pill cover-status ${shop.open ? "open" : ""}`}>
          <i />
          {shop.open ? "Açık" : "Kapalı"}
        </span>
        <div className="cover-favorite">
          <FavoriteButton shopId={shop.id} saved={saved} loggedIn={loggedIn} />
        </div>
      </div>
      <div className="shop-body">
        <div className="row between">
          <Link className="stretched" href={`/berber/${shop.slug}`}>
            <h3>{shop.name}</h3>
          </Link>
          <span className="rating">
            <Star size={12} fill="currentColor" />
            {shop.rating ? shop.rating.toFixed(1) : "Yeni"}
            {shop.reviewCount > 0 && <small>({shop.reviewCount})</small>}
          </span>
        </div>
        <p className="location">
          <MapPin size={13} />
          {distance !== undefined
            ? `${distance.toFixed(1)} km · ${shop.district}`
            : `${shop.district}, ${shop.city}`}
        </p>
        <div className="card-bottom">
          <div className="tags">
            {shop.serviceNames.slice(0, 2).map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          {shop.price !== null ? (
            <span className="from-price">
              <small>başlangıç</small>
              <strong>{money(shop.price)}</strong>
            </span>
          ) : (
            <small className="muted">Yakında</small>
          )}
        </div>
      </div>
    </article>
  );
}
