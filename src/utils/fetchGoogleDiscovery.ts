// src/utils/fetchGoogleDiscovery.ts

import { HomeRestaurant } from "../types/homeRestaurant";

const GOOGLE_PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY as string;

// ----------------------------------------------
// Utils
// ----------------------------------------------

const metersToMiles = (m: number) => m * 0.000621371;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  return res.json();
}

// ----------------------------------------------
// Map Google Result → HomeRestaurant
// ----------------------------------------------

function mapGoogleResult(r: any, lat: number, lon: number): HomeRestaurant {
  const plats = r.geometry?.location?.lat;
  const plng = r.geometry?.location?.lng;

  let distanceMiles: number | null = null;
  if (plats && plng) {
    const meters = getDistance(lat, lon, plats, plng);
    distanceMiles = parseFloat(metersToMiles(meters).toFixed(2));
  }

  const photo = r.photos?.[0]?.photo_reference
    ? `${GOOGLE_PLACES_BASE}/photo?maxwidth=400&photo_reference=${r.photos[0].photo_reference}&key=${API_KEY}`
    : null;

  return {
    id: r.place_id,
    source: "google",
    name: r.name,
    address: r.vicinity ?? null,
    rating: r.rating ?? null,
    reviewCount: r.user_ratings_total ?? null,
    distanceMiles,
    photos: photo ? [photo] : [],
    image: photo,
    googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
    price: null,
    categories: r.types ?? null,
    isOpen: r.opening_hours?.open_now ?? null,
    hours: [],
  };
}

// ----------------------------------------------
// Discovery (optimized single-call version)
// ----------------------------------------------

export async function fetchGoogleDiscovery({
  latitude,
  longitude,
  filters,
}: {
  latitude: number;
  longitude: number;
  filters: string[];
}): Promise<HomeRestaurant[]> {
  // Build category keyword string
  const categoryString = filters.length
    ? `&keyword=${encodeURIComponent(filters.join(" "))}`
    : "";

  // Single Nearby Search ranked by distance
  const url =
    `${GOOGLE_PLACES_BASE}/nearbysearch/json` +
    `?location=${latitude},${longitude}` +
    `&rankby=distance` +
    `&type=restaurant` +
    `${categoryString}` +
    `&key=${API_KEY}`;

  const data = await fetchJson(url);
  const rawResults = data.results ?? [];

  // Filter out places extremely far away (Google sometimes returns 20+ miles)
  const filtered = rawResults.filter((r: any) => {
    const plats = r.geometry?.location?.lat;
    const plng = r.geometry?.location?.lng;
    if (!plats || !plng) return false;

    const miles = metersToMiles(getDistance(latitude, longitude, plats, plng));
    return miles <= 15; // configurable cap
  });

  // Remove duplicates by place_id
  const unique = Array.from(
    filtered
      .reduce((map: Map<string, any>, r: any) => {
        map.set(r.place_id, r);
        return map;
      }, new Map())
      .values()
  );

  // Map to HomeRestaurant
  let mapped = unique.map((r) => mapGoogleResult(r, latitude, longitude));

  // Random shuffle
  mapped = mapped.sort(() => Math.random() - 0.5);

  return mapped;
}
