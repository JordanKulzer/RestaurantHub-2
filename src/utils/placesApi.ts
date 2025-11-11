import * as Location from "expo-location";
import { categoryTypeMap } from "../constants/categoryType";

const GOOGLE_PLACES_BASE =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY as string;

export interface RestaurantResult {
  id: string;
  name: string;
  rating: number;
  address: string;
  photo?: string | null;
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

/**
 * Fetch nearby restaurants for the HomeScreen (with pagination).
 */
export async function fetchNearbyRestaurants({
  radiusMeters = 5000,
  type,
  minRating = 0,
  pageToken,
  categories = [],
}: {
  radiusMeters?: number;
  type?: string;
  minRating?: number;
  pageToken?: string;
  categories?: string[];
}): Promise<{ results: RestaurantResult[]; nextToken: string | null }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission not granted");

  const { coords } = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = coords;

  // 🧭 Determine what 'type' and 'keyword' to use
  let matchedType: string | undefined;
  let extraKeywords: string[] = [];

  if (categories.length > 0) {
    const mapped = categories.map((c) => categoryTypeMap[c.toLowerCase()]);
    const types = mapped.map((m) => m?.type).filter(Boolean) as string[];
    const keywords = mapped.map((m) => m?.keyword).filter(Boolean) as string[];

    // Use first type if consistent, otherwise no explicit type
    const uniqueTypes = [...new Set(types)];
    matchedType = uniqueTypes.length === 1 ? uniqueTypes[0] : undefined;
    extraKeywords = keywords;
  }

  // 🚫 Don’t default to “restaurant” — let Google decide based on category
  let params = `location=${latitude},${longitude}&radius=${radiusMeters}`;

  if (matchedType) params += `&type=${matchedType}`;
  if (extraKeywords.length > 0)
    params += `&keyword=${encodeURIComponent(extraKeywords.join(" "))}`;
  if (pageToken) params = `pagetoken=${pageToken}`;

  const url = `${GOOGLE_PLACES_BASE}?${params}&key=${API_KEY}`;
  console.log("🍽️ Fetching nearby restaurants:", url);

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
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${r.photos[0].photo_reference}&key=${API_KEY}`
            : null,
        distance,
      };
    }) ?? [];

  return { results: formatted, nextToken: data.next_page_token || null };
}

/**
 * Fetch shuffled restaurants for the ShuffleScreen.
 * Applies filters (category, rating, distance) and returns a randomized set.
 */
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
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted")
      throw new Error("Location permission not granted");

    const position = await Location.getCurrentPositionAsync({})?.catch(
      () => null
    );
    const latitude = position?.coords?.latitude;
    const longitude = position?.coords?.longitude;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      console.error("❌ Invalid or missing coordinates:", position);
      throw new Error("Unable to get valid location coordinates");
    }

    const radiusMeters = distanceMiles * 1609;

    let matchedType = "restaurant";
    let extraKeywords: string[] = [];

    if (categories.length > 0) {
      const mapped = categories.map((c) => categoryTypeMap[c.toLowerCase()]);

      const uniqueTypes = [
        ...new Set(mapped.map((m) => m?.type || "restaurant")),
      ];
      matchedType = uniqueTypes.length === 1 ? uniqueTypes[0] : "restaurant";

      extraKeywords = mapped.map((m) => m?.keyword).filter(Boolean) as string[];
    }

    const keywordParam =
      extraKeywords.length > 0
        ? `&keyword=${encodeURIComponent(extraKeywords.join(" "))}`
        : "";

    const url = `${GOOGLE_PLACES_BASE}?location=${latitude.toFixed(
      6
    )},${longitude.toFixed(
      6
    )}&radius=${radiusMeters}&type=${matchedType}${keywordParam}&key=${API_KEY}`;

    console.log("🍽️ Fetching shuffled restaurants:", url);

    const res = await fetch(url);
    const data = await res.json();

    if (!data.results)
      throw new Error(data.error_message || "No results found");

    let filtered = data.results.filter(
      (r: any) => (r.rating || 0) >= minRating
    );
    const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, limit);

    return shuffled.map((r: any) => {
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
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${r.photos[0].photo_reference}&key=${API_KEY}`
            : null,
        distance,
      };
    });
  } catch (err) {
    console.error("❌ Error fetching shuffled restaurants:", err);
    return [];
  }
}

/**
 * Fetch detailed restaurant info by place_id
 */
export async function fetchRestaurantDetails(placeId: string) {
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,photos,rating,opening_hours,url,types&key=${API_KEY}`;
  const res = await fetch(detailsUrl);
  const data = await res.json();
  console.log("🧾 Details API Response:", data);

  if (!data.result) throw new Error("No details found");

  const r = data.result;
  return {
    id: placeId,
    name: r.name,
    address: r.formatted_address,
    phone: r.formatted_phone_number,
    website: r.website || null,
    rating: r.rating || 0,
    googleUrl: r.url,
    types: r.types || [],
    photos:
      r.photos?.map(
        (p: any) =>
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${API_KEY}`
      ) || [],
    hours: r.opening_hours?.weekday_text || [],
  };
}

/**
 * Text-based search (search by name or category)
 */
export async function fetchTextSearch(query: string) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission not granted");

  const { coords } = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = coords;

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&location=${latitude},${longitude}&radius=10000&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return (
    data.results?.map((r: any) => ({
      id: r.place_id,
      name: r.name,
      rating: r.rating,
      address: r.formatted_address || r.vicinity,
      photo:
        r.photos?.length > 0
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${r.photos[0].photo_reference}&key=${API_KEY}`
          : null,
    })) ?? []
  );
}

/*
 * Fetch autocomplete suggestions for a query
 */
export async function fetchAutocomplete(query: string) {
  console.log("🔍 fetching autocomplete for:", query);

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    query
  )}&types=establishment&components=country:us&key=${API_KEY}`;

  console.log("➡️ URL:", url);

  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log("📦 autocomplete response:", json);

    if (!json.predictions || json.predictions.length === 0) {
      console.warn("⚠️ no predictions returned");
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
