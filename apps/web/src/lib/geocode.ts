export interface ReverseGeocodeResult {
  areaLabel: string;
  placeName?: string;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestSuggestedLocation(
  lat: number,
  lng: number,
  locations: Array<{ lat: number; lng: number; area_label: string; name: string }>,
  maxMeters = 400,
) {
  let closest: (typeof locations)[number] | null = null;
  let closestDistance = Infinity;

  for (const location of locations) {
    const distance = haversineMeters(lat, lng, location.lat, location.lng);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = location;
    }
  }

  return closest && closestDistance <= maxMeters ? closest : null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "14");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "ActivityMatch/1.0 (activity-match-app)",
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    name?: string;
    address?: Record<string, string>;
  };

  const address = data.address ?? {};
  const areaLabel =
    address.suburb ||
    address.neighbourhood ||
    address.quarter ||
    address.town ||
    address.city ||
    address.village ||
    address.municipality ||
    address.county ||
    address.state;

  if (!areaLabel) return null;

  const placeName =
    data.name ||
    address.amenity ||
    address.building ||
    address.leisure ||
    address.tourism ||
    (address.road ? [address.road, address.house_number].filter(Boolean).join(" ") : undefined);

  return {
    areaLabel,
    placeName: placeName || undefined,
  };
}

export async function resolvePinLocation(
  lat: number,
  lng: number,
  suggestedLocations: Array<{ lat: number; lng: number; area_label: string; name: string }>,
): Promise<ReverseGeocodeResult | null> {
  const nearby = nearestSuggestedLocation(lat, lng, suggestedLocations);
  if (nearby) {
    return { areaLabel: nearby.area_label, placeName: nearby.name };
  }
  return reverseGeocode(lat, lng);
}
