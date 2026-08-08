import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ActivityMeetingMapProps {
  lat: number;
  lng: number;
  className?: string;
}

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;background:#004c22;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(0,0,0,.25)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export function ActivityMeetingMap({ lat, lng, className = "h-48" }: ActivityMeetingMapProps) {
  return (
    <div className={`bg-surface-container rounded-xl overflow-hidden w-full relative ${className}`}>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
