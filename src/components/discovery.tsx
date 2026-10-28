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
  X,
  LoaderCircle,
} from "lucide-react";
import type { ShopCardData } from "@/lib/catalog";
import { distanceKm } from "@/lib/time";
import { ShopCard } from "./shop-card";
const Map = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <div className="map-loading skeleton" />,
});
type Sort = "recommended" | "distance" | "rating" | "price";
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
  const [sort, setSort] = useState<Sort>("recommended");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [locating, setLocating] = useState(false);
  const [center, setCenter] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [geoError, setGeoError] = useState("");
  const points = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr-TR");
    const list = shops
      .filter(
        (s) =>
          (!city || s.city === city) &&
          (!district || s.district === district) &&
          (!onlyFavorites || favorites.includes(s.id)) &&
          (!openOnly || s.open) &&
          `${s.name} ${s.city} ${s.district} ${s.serviceNames.join(" ")}`
            .toLocaleLowerCase("tr-TR")
            .includes(needle),
      )
      .map((s) => ({
        ...s,
        distance: center ? distanceKm(center, s) : undefined,
      }));
    const by: Record<Sort, (a: (typeof list)[0], b: (typeof list)[0]) => number> = {
      recommended: (a, b) =>
        Number(b.open) - Number(a.open) ||
        (a.distance ?? 0) - (b.distance ?? 0) ||
        (b.rating ?? 0) - (a.rating ?? 0),
      distance: (a, b) => (a.distance ?? 0) - (b.distance ?? 0),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      price: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
    };
    return list.sort(by[sort]);
  }, [shops, q, city, district, onlyFavorites, favorites, openOnly, center, sort]);
  const filtered = !!(q || city || district || openOnly || onlyFavorites);
  function clear() {
    setQ("");
    setCity("");
    setDistrict("");
    setOpenOnly(false);
    setOnlyFavorites(false);
  }
  return (
    <>
      <div className="filter-panel">
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Berber veya hizmet ara</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Berber, semt veya hizmet ara"
            type="search"
            enterKeyHint="search"
          />
          {q && (
            <button
              type="button"
              className="clear-search"
              aria-label="Aramayı temizle"
              onClick={() => setQ("")}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <label className="select-field">
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
        <label className="select-field">
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
          className={`button ${center ? "tinted" : ""}`}
          disabled={locating}
          onClick={() => {
            setGeoError("");
            if (!navigator.geolocation) {
              setGeoError("Tarayıcınız konum desteği sunmuyor.");
              return;
            }
            setLocating(true);
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setCenter({
                  latitude: p.coords.latitude,
                  longitude: p.coords.longitude,
                });
                setSort("distance");
                setLocating(false);
              },
              () => {
                setLocating(false);
                setGeoError(
                  "Konum alınamadı. Tarayıcı iznini kontrol edebilir veya şehir seçebilirsiniz.",
                );
              },
              { timeout: 10000 },
            );
          }}
        >
          {locating ? (
            <LoaderCircle size={15} className="spin" />
          ) : (
            <Navigation size={15} />
          )}
          Yakınımda
        </button>
      </div>
      {geoError && (
        <p role="alert" className="notice error">
          {geoError}
        </p>
      )}
      <div className="discovery-toolbar">
        <div className="chips">
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
              <Heart size={13} /> Favorilerim
            </button>
          )}
          <label className="chip select-chip">
            <span className="sr-only">Sırala</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="recommended">Önerilen</option>
              <option value="distance" disabled={!center}>
                En yakın
              </option>
              <option value="rating">En yüksek puan</option>
              <option value="price">En uygun fiyat</option>
            </select>
          </label>
          {filtered && (
            <button className="chip ghost" onClick={clear}>
              <X size={13} /> Temizle
            </button>
          )}
        </div>
        <div className="toolbar-end">
          <span className="muted small" aria-live="polite">
            {points.length} berber
          </span>
          <div className="segmented" role="group" aria-label="Görünüm">
            <button
              className={view === "list" ? "active" : ""}
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <LayoutGrid size={14} /> Liste
            </button>
            <button
              className={view === "map" ? "active" : ""}
              aria-pressed={view === "map"}
              onClick={() => setView("map")}
            >
              <MapIcon size={14} /> Harita
            </button>
          </div>
        </div>
      </div>
      {view === "map" && (
        <div className="discovery-map">
          <Map shops={points} center={center} />
        </div>
      )}
      {points.length ? (
        <div className="shop-grid">
          {points.map((s, i) => (
            <div className="rise" style={{ "--i": i } as React.CSSProperties} key={s.id}>
              <ShopCard
                shop={s}
                loggedIn={loggedIn}
                saved={favorites.includes(s.id)}
                distance={s.distance}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <span className="empty-icon">
            <MapPin size={22} />
          </span>
          <h3>Aradığın usta henüz burada değil.</h3>
          <p>Farklı bir konum dene veya filtreleri temizle.</p>
          <button className="button" onClick={clear}>
            Filtreleri temizle
          </button>
        </div>
      )}
    </>
  );
}
