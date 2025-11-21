import {
  getCachedPlace,
  getShortCache,
  setCachedPlace,
  setShortCache,
} from "./cache";
import { getLocationCached } from "./locationHelper";

const GOOGLE_PLACES_BASE =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

const DETAILS_BASE = "https://maps.googleapis.com/maps/api/place/details/json";

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY as string;

export interface RestaurantResult {
  id: string;
  name: string;
  rating: number;
  reviewCount?: number | null;
  price?: string | null;
  address: string;
  photo?: string | null;
  distance?: number | null;
  distanceMiles?: number | null;
  isOpen?: boolean | null;
  hours?: string[];
  googleMapsUrl?: string;
}

// --- Shared Distance Helpers ---
const EARTH_RADIUS_METERS = 6371000;

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

const metersToMiles = (m: number) => m * 0.000621371;

// -------------------------------------------------------------
// Convert Yelp-style category values → Google keyword filters
// Example: "burgers,tradamerican" → ["burgers","tradamerican"]
// -------------------------------------------------------------
function extractKeywords(categories: string[]): string[] {
  if (categories.length === 0) return [];

  return categories.flatMap((c) =>
    c
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

// -------------------------------------------------------------
// Nearby Search (HomeScreen)
// -------------------------------------------------------------
export async function fetchNearbyRestaurants({
  radiusMeters = 5000,
  minRating = 0,
  pageToken,
  categories = [],
}: {
  radiusMeters?: number;
  minRating?: number;
  pageToken?: string;
  categories?: string[];
}): Promise<{ results: RestaurantResult[]; nextToken: string | null }> {
  try {
    const { latitude, longitude } = await getLocationCached();

    const keywords = extractKeywords(categories);

    // Build base params once
    let params = `location=${latitude},${longitude}&radius=${radiusMeters}`;
    if (keywords.length > 0) {
      params += `&keyword=${encodeURIComponent(keywords.join(" "))}`;
    }

    let url: string;
    let cacheKey: string;

    // ---------------------------------------------------
    // PAGE TOKEN LOGIC (Google requires this special URL)
    // ---------------------------------------------------
    if (pageToken) {
      url = `${GOOGLE_PLACES_BASE}?pagetoken=${pageToken}&key=${API_KEY}`;
      cacheKey = `nearby:page:${pageToken}`;
    } else {
      url = `${GOOGLE_PLACES_BASE}?${params}&key=${API_KEY}`;

      cacheKey = `nearby:${latitude}:${longitude}:${radiusMeters}:${minRating}:${keywords.join(
        ","
      )}`;
    }

    const cached = getShortCache<{
      results: RestaurantResult[];
      nextToken: string | null;
    }>(cacheKey);
    if (cached) return cached;

    const res = await fetch(url);
    const data = await res.json();

    const formatted =
      data.results?.map((r: any) => {
        const lat = r.geometry?.location?.lat;
        const lon = r.geometry?.location?.lng;
        let distance: number | undefined;

        if (lat && lon) {
          const meters = getDistanceMeters(latitude, longitude, lat, lon);
          distance = metersToMiles(meters);
        }

        return {
          id: r.place_id,
          name: r.name,
          rating: r.rating,
          address: r.vicinity,
          photo:
            r.photos?.length > 0
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${r.photos[0].photo_reference}&key=${API_KEY}`
              : null,
          distance: distance ?? null,
        };
      }) ?? [];

    const result = {
      results: formatted,
      nextToken: data.next_page_token || null,
    };

    setShortCache(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Error fetching nearby restaurants:", error);
    return { results: [], nextToken: null };
  }
}

// -------------------------------------------------------------
// Shuffle / Filters → Random Google results
// -------------------------------------------------------------
export async function fetchShuffledRestaurants({
  distanceMiles = 5,
  minRating = 0,
  categories = [],
  limit = 5,
}: {
  distanceMiles?: number;
  minRating?: number;
  categories?: string[];
  limit?: number;
}): Promise<RestaurantResult[]> {
  try {
    const { latitude, longitude } = await getLocationCached();

    const radiusMeters = distanceMiles * 1609;

    const keywords = extractKeywords(categories);
    const keywordParam =
      keywords.length > 0
        ? `&keyword=${encodeURIComponent(keywords.join(" "))}`
        : "";

    const url = `${GOOGLE_PLACES_BASE}?location=${latitude.toFixed(
      6
    )},${longitude.toFixed(
      6
    )}&radius=${radiusMeters}&type=restaurant${keywordParam}&key=${API_KEY}`;

    const cacheKey = `shuffle:${latitude}:${longitude}:${distanceMiles}:${keywords.join(
      ","
    )}:${minRating}:${limit}`;
    const cached = getShortCache<RestaurantResult[]>(cacheKey);
    if (cached) return cached;

    console.log("🍽️ Fetching shuffled restaurants:", url);

    const res = await fetch(url);
    const data = await res.json();

    if (!data.results)
      throw new Error(data.error_message || "No results found");

    let filtered = data.results.filter(
      (r: any) => (r.rating || 0) >= minRating
    );
    const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, limit);

    const result = shuffled.map((r: any) => {
      const lat = r.geometry?.location?.lat;
      const lon = r.geometry?.location?.lng;

      let distance: number | null = null;

      if (lat && lon) {
        const meters = getDistanceMeters(latitude, longitude, lat, lon);
        distance = metersToMiles(meters);
      }

      return {
        id: r.place_id,
        name: r.name,
        rating: r.rating,
        address: r.vicinity,
        photo:
          r.photos?.length > 0
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${r.photos[0].photo_reference}&key=${API_KEY}`
            : null,
        distance,
      };
    });
    setShortCache(cacheKey, result);

    return result;
  } catch (err) {
    console.error("❌ Error fetching shuffled restaurants:", err);
    return [];
  }
}

// -------------------------------------------------------------
// Detailed Google Place Info (needed by unified fetcher)
// -------------------------------------------------------------
export async function fetchRestaurantDetails(placeId: string) {
  const cached = await getCachedPlace(placeId);
  if (cached) return cached;

  const fields = [
    "name",
    "formatted_address",
    "formatted_phone_number",
    "website",
    "photos",
    "rating",
    "opening_hours",
    "url",
    "types",
    "user_ratings_total",
    "geometry",
    "current_opening_hours",
  ].join(",");

  const detailsUrl = `${DETAILS_BASE}?place_id=${placeId}&fields=${fields}&key=${API_KEY}`;

  const res = await fetch(detailsUrl);
  const data = await res.json();

  if (!data.result) throw new Error("No details found");

  const r = data.result;
  const mapped = {
    id: placeId,
    name: r.name,
    address: r.formatted_address,
    phone: r.formatted_phone_number,
    website: r.website || null,
    rating: r.rating || 0,
    user_ratings_total: r.user_ratings_total ?? null,
    googleUrl: r.url,
    types: r.types || [],
    geometry: r.geometry || null,
    photos:
      r.photos?.map(
        (p: any) =>
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photo_reference}&key=${API_KEY}`
      ) || [],
    hours:
      r.current_opening_hours?.weekday_text ??
      r.opening_hours?.weekday_text ??
      [],
    isOpen:
      r.current_opening_hours?.open_now ?? r.opening_hours?.open_now ?? null,
  };

  await setCachedPlace(placeId, mapped);

  return mapped;
}

// -------------------------------------------------------------
// Text Search
// -------------------------------------------------------------
// -------------------------------------------------------------
// Text Search (with normalized cache keys)
// -------------------------------------------------------------
export async function fetchTextSearch(query: string) {
  try {
    const { latitude, longitude } = await getLocationCached();

    // Normalize user text → keyword tokens
    const normalizedTokens = query
      .toLowerCase()
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .sort();

    const cacheKey = `text:${normalizedTokens.join(",")}`;

    const cached = getShortCache<RestaurantResult[]>(cacheKey);
    if (cached) return cached;

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&location=${latitude},${longitude}&radius=10000&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    const result =
      data.results?.map((r: any) => {
        // Calculate distance
        const lat = r.geometry?.location?.lat;
        const lon = r.geometry?.location?.lng;
        let distanceMiles: number | null = null;

        if (lat && lon) {
          const meters = getDistanceMeters(latitude, longitude, lat, lon);
          distanceMiles = metersToMiles(meters);
        }

        return {
          id: r.place_id,
          name: r.name,
          rating: r.rating,
          reviewCount: r.user_ratings_total ?? null, // Add review count
          price: r.price_level ? "$".repeat(r.price_level) : null, // Add price
          address: r.formatted_address || r.vicinity,
          distanceMiles, // Add distance
          isOpen: r.opening_hours?.open_now ?? null, // Add open status
          hours: r.opening_hours?.weekday_text ?? [], // Add hours if available
          googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`, // Add Google Maps URL
          photo:
            r.photos?.length > 0
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${r.photos[0].photo_reference}&key=${API_KEY}`
              : null,
        };
      }) ?? [];

    setShortCache(cacheKey, result);

    return result;
  } catch (e) {
    console.error("fetchTextSearch:", e);
    return [];
  }
}
// -------------------------------------------------------------
// Autocomplete
// -------------------------------------------------------------
let AUTOCOMPLETE_SESSION_TOKEN = generateSessionToken();

function generateSessionToken() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function resetAutocompleteSession() {
  AUTOCOMPLETE_SESSION_TOKEN = generateSessionToken();
}
export async function fetchAutocomplete(query: string) {
  console.log("🔍 fetching autocomplete for:", query);

  // Use the global session token
  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
    `?input=${encodeURIComponent(query)}` +
    `&types=establishment` +
    `&components=country:us` +
    `&sessiontoken=${AUTOCOMPLETE_SESSION_TOKEN}` +
    `&key=${API_KEY}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log("📦 autocomplete response:", json);

    if (!json.predictions || json.predictions.length === 0) {
      return [];
    }

    return json.predictions.map((p: any) => ({
      id: p.place_id,
      name: p.description,
    }));
  } catch (err) {
    console.error("❌ autocomplete fetch failed:", err);
    return [];
  }
}
