import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapLocation {
  id?: string;
  name: string;
  area_label: string;
  lat: number;
  lng: number;
}

export interface MapPinValue {
  lat: number;
  lng: number;
}

interface MapPinPickerProps {
  value: MapPinValue | null;
  onChange: (value: MapPinValue) => void;
  suggestedLocations?: MapLocation[];
  onSuggestedSelect?: (location: MapLocation) => void;
  className?: string;
}

const DEFAULT_CENTER: MapPinValue = { lat: 35.912, lng: 14.502 };

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;background:#004c22;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(0,0,0,.25)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const suggestedIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;background:#fe932c;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.2)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function MapClickHandler({ onChange }: { onChange: (value: MapPinValue) => void }) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export function MapPinPicker({
  value,
  onChange,
  suggestedLocations = [],
  onSuggestedSelect,
  className = "",
}: MapPinPickerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const center = value ?? DEFAULT_CENTER;

  const coordsLabel = useMemo(() => {
    if (!value) return "Tap the map to drop a pin";
    return `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`;
  }, [value]);

  if (!mounted) {
    return <div className={`h-64 rounded-xl bg-surface-container animate-pulse ${className}`} />;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="h-64 rounded-xl overflow-hidden border border-outline-variant/40 shadow-sm">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onChange={onChange} />
          {suggestedLocations.map((location) => (
            <Marker
              key={location.id ?? `${location.lat}-${location.lng}`}
              position={[location.lat, location.lng]}
              icon={suggestedIcon}
              eventHandlers={{
                click: () => {
                  onChange({ lat: location.lat, lng: location.lng });
                  onSuggestedSelect?.(location);
                },
              }}
            />
          ))}
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const marker = event.target as L.Marker;
                  const { lat, lng } = marker.getLatLng();
                  onChange({ lat, lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-label-sm text-on-surface-variant">{coordsLabel}</p>
      {suggestedLocations.length > 0 && (
        <p className="text-label-sm text-on-surface-variant">
          Orange dots are suggested places — tap one or drop your own green pin.
        </p>
      )}
    </div>
  );
}
