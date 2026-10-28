"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Map as MapIcon,
  LayoutGrid,
  Navigation,
  Heart,
} from "lucide-react";
import type { ShopCardData } from "@/lib/catalog";
import { distanceKm } from "@/lib/time";
import { ShopCard } from "./shop-card";
const Map = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <div className="map-loading">Harita yükleniyor…</div>,
});
export function Discovery({
  shops,
  favorites,
  loggedIn,
  initialQuery,
}: {
  shops: ShopCardData[];
  favorites: string[];
  loggedIn: boolean;
  initialQuery: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [view, setView] = useState("list");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [center, setCenter] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [geoError, setGeoError] = useState("");
  const points = useMemo(
    () =>
      shops
        .filter(
          (s) =>
            (!city || s.city === city) &&
            (!district || s.district === district) &&
            (!onlyFavorites || favorites.includes(s.id)) &&
            (!openOnly || s.open) &&
            `${s.name} ${s.city} ${s.district} ${s.serviceNames.join(" ")}`
              .toLocaleLowerCase("tr-TR")
              .includes(q.toLocaleLowerCase("tr-TR")),
        )
        .map((s) => ({
          ...s,
          distance: center ? distanceKm(center, s) : undefined,
        }))
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)),
    [shops, q, city, district, onlyFavorites, favorites, openOnly, center],
  );
  return (
    <>
      <div className="filter-panel">
        <label className="search-field">
          <Search size={19} />
          <span className="sr-only">Berber veya hizmet ara</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Berber, konum veya hizmet ara…"
          />
        </label>
        <label>
          <span className="sr-only">Şehir</span>
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setDistrict("");
            }}
          >
            <option value="">Tüm şehirler</option>
            {[...new Set(shops.map((s) => s.city))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">İlçe</span>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="">Tüm ilçeler</option>
            {[
              ...new Set(
                shops
                  .filter((s) => !city || s.city === city)
                  .map((s) => s.district),
              ),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          className="button"
          onClick={() => {
            setGeoError("");
            if (!navigator.geolocation) {
              setGeoError("Tarayıcınız konum desteği sunmuyor.");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (p) =>
                setCenter({
                  latitude: p.coords.latitude,
                  longitude: p.coords.longitude,
                }),
              () =>
                setGeoError(
                  "Konum alınamadı. Tarayıcı iznini kontrol edebilir veya şehir seçebilirsiniz.",
                ),
              { timeout: 10000 },
            );
          }}
        >
          <Navigation size={16} /> Yakınımda
        </button>
      </div>
      {geoError && (
        <p role="alert" className="notice error">
          {geoError}
        </p>
      )}
      <div className="discovery-toolbar">
        <div className="row wrap">
          <button
            className={`chip ${openOnly ? "active" : ""}`}
            aria-pressed={openOnly}
            onClick={() => setOpenOnly(!openOnly)}
          >
            <span className="green-dot" /> Şu an açık
          </button>
          {loggedIn && (
            <button
              className={`chip ${onlyFavorites ? "active" : ""}`}
              aria-pressed={onlyFavorites}
              onClick={() => setOnlyFavorites(!onlyFavorites)}
            >
              <Heart size={14} /> Favorilerim
            </button>
          )}
          <span className="muted">{points.length} berber bulundu</span>
        </div>
        <div className="segmented">
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <LayoutGrid size={16} /> Liste
          </button>
          <button
            className={view === "map" ? "active" : ""}
            onClick={() => setView("map")}
          >
            <MapIcon size={16} /> Harita
          </button>
        </div>
      </div>
      {view === "map" && (
        <div className="discovery-map">
          <Map shops={points} center={center} />
        </div>
      )}
      {points.length ? (
        <div className="shop-grid">
          {points.map((s) => (
            <ShopCard
              key={s.id}
              shop={s}
              loggedIn={loggedIn}
              saved={favorites.includes(s.id)}
              distance={s.distance}
            />
          ))}
        </div>
      ) : (
        <div className="empty bordered">
          <MapPin size={32} />
          <h3>Aradığın usta henüz burada değil.</h3>
          <p>Farklı bir konum dene veya filtreleri temizle.</p>
          <button
            className="button"
            onClick={() => {
              setQ("");
              setCity("");
              setDistrict("");
              setOpenOnly(false);
              setOnlyFavorites(false);
            }}
          >
            Filtreleri temizle
          </button>
        </div>
      )}
    </>
  );
}
