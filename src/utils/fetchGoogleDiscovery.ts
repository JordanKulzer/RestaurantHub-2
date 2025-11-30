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
    price: r.price_level ? "$".repeat(r.price_level) : null,
    categories: r.types ?? null,
    isOpen: r.opening_hours?.open_now ?? null,
    hours: [],
  };
}

// ----------------------------------------------
// Discovery (with pagination for more variety!)
// ----------------------------------------------

export async function fetchGoogleDiscovery({
  latitude,
  longitude,
  filters,
  maxDistanceMiles,
}: {
  latitude: number;
  longitude: number;
  filters: string[];
  maxDistanceMiles?: number;
}): Promise<HomeRestaurant[]> {
  const categoryString = filters.length
    ? `&keyword=${encodeURIComponent(filters.join(" "))}`
    : "";

  // Use user's distance filter or default to 10 miles
  const miles =
    maxDistanceMiles && maxDistanceMiles > 0 ? maxDistanceMiles : 10;
  const radiusMeters = Math.round(miles * 1609.34);

  const baseUrl =
    `${GOOGLE_PLACES_BASE}/nearbysearch/json` +
    `?location=${latitude},${longitude}` +
    `&radius=${radiusMeters}` +
    `&type=restaurant` +
    `${categoryString}` +
    `&key=${API_KEY}`;

  let allResults: any[] = [];
  let nextPageToken: string | null = null;
  let pageCount = 0;
  const MAX_PAGES = 3; // Fetch up to 3 pages (60 results total)

  // Fetch multiple pages to get more variety
  do {
    const url = nextPageToken
      ? `${GOOGLE_PLACES_BASE}/nearbysearch/json?pagetoken=${nextPageToken}&key=${API_KEY}`
      : baseUrl;

    const data = await fetchJson(url);

    if (data.results && data.results.length > 0) {
      allResults = allResults.concat(data.results);
    }

    nextPageToken = data.next_page_token || null;
    pageCount++;

    // Google requires a short delay before fetching next page
    if (nextPageToken && pageCount < MAX_PAGES) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } while (nextPageToken && pageCount < MAX_PAGES);

  console.log(
    `📍 Fetched ${allResults.length} restaurants from ${pageCount} page(s)`
  );

  // Filter out results without location
  const filtered = allResults.filter((r: any) => {
    const plats = r.geometry?.location?.lat;
    const plng = r.geometry?.location?.lng;
    return plats && plng;
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

  // Random shuffle the ENTIRE pool before showing
  mapped = mapped.sort(() => Math.random() - 0.5);

  console.log(`✅ Returning ${mapped.length} unique restaurants after shuffle`);

  return mapped;
}
