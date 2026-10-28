"use client";
import { useEffect } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
const pin = L.divIcon({
  className: "usta-pin",
  html: '<span aria-hidden="true">✂</span>',
  iconSize: [38, 44],
  iconAnchor: [19, 42],
});
type Point = { latitude: number; longitude: number };
type MapShop = Point & {
  id: string;
  name: string;
  slug: string;
  address: string;
  open?: boolean;
  rating?: number | null;
};
function View({ points, center }: { points: Point[]; center?: Point }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.latitude, center.longitude], 13);
    else if (points.length)
      map.fitBounds(
        points.map((p) => [p.latitude, p.longitude] as [number, number]),
        { padding: [45, 45], maxZoom: 14 },
      );
  }, [points, center, map]);
  return null;
}
function ClickPin({ onChange }: { onChange: (p: Point) => void }) {
  useMapEvents({
    click(e) {
      onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}
export default function Map({
  shops = [],
  value,
  onChange,
  center,
}: {
  shops?: MapShop[];
  value?: Point;
  onChange?: (p: Point) => void;
  center?: Point;
}) {
  return (
    <MapContainer
      center={[41.015, 28.979]}
      zoom={12}
      scrollWheelZoom={false}
      className="map-canvas"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <View points={shops} center={value ?? center} />
      {shops.map((s) => (
        <Marker key={s.id} position={[s.latitude, s.longitude]} icon={pin}>
          <Popup>
            <strong>{s.name}</strong>
            <p>{s.address}</p>
            <p>
              {s.open ? "Şu an açık" : "Şu an kapalı"}
              {s.rating ? ` · ★ ${s.rating.toFixed(1)}` : ""}
            </p>
            <Link href={`/berber/${s.slug}`}>Randevu al →</Link>
          </Popup>
        </Marker>
      ))}
      {value && (
        <Marker
          icon={pin}
          position={[value.latitude, value.longitude]}
          draggable={!!onChange}
          eventHandlers={{
            dragend(e) {
              const p = e.target.getLatLng();
              onChange?.({ latitude: p.lat, longitude: p.lng });
            },
          }}
        />
      )}
      {onChange && <ClickPin onChange={onChange} />}
    </MapContainer>
  );
}
