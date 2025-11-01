import * as Location from "expo-location";

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

/**
 * Fetch nearby restaurants for the HomeScreen (with pagination).
 */
export async function fetchNearbyRestaurants({
  radiusMeters = 5000,
  type = "restaurant",
  minRating = 0,
  pageToken,
}: {
  radiusMeters?: number;
  type?: string;
  minRating?: number;
  pageToken?: string;
}): Promise<{ results: RestaurantResult[]; nextToken: string | null }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission not granted");

  const { coords } = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = coords;

  const params = pageToken
    ? `pagetoken=${pageToken}`
    : `location=${latitude},${longitude}&radius=${radiusMeters}&type=${type}`;

  const url = `${GOOGLE_PLACES_BASE}?${params}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  const formatted =
    data.results?.map((r: any) => ({
      id: r.place_id,
      name: r.name,
      rating: r.rating,
      address: r.vicinity,
      photo:
        r.photos?.length > 0
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${r.photos[0].photo_reference}&key=${API_KEY}`
          : null,
    })) ?? [];

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
    // 1️⃣ Location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Location permission not granted");
    }

    const { coords } = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = coords;

    const radiusMeters = distanceMiles * 1609;

    const keywordParam =
      categories.length > 0
        ? `&keyword=${encodeURIComponent(categories.join("|"))}`
        : "";

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radiusMeters}&type=restaurant${keywordParam}&key=${API_KEY}`;

    console.log("🍽️ Fetching shuffled restaurants:", url);

    const res = await fetch(url);
    const data = await res.json();

    if (!data.results)
      throw new Error(data.error_message || "No results found");

    // 2️⃣ Filter + randomize
    let filtered = data.results.filter(
      (r: any) => (r.rating || 0) >= minRating
    );

    // If multiple categories → match at least one keyword
    if (categories.length > 1) {
      filtered = filtered.filter((r: any) =>
        categories.some((c) =>
          (r.types || []).some((t: string) => t.includes(c))
        )
      );
    }

    // Shuffle + limit
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    const limited = shuffled.slice(0, limit);

    // 3️⃣ Map to your unified restaurant type
    return limited.map((r: any) => ({
      id: r.place_id,
      name: r.name,
      rating: r.rating,
      address: r.vicinity,
      photo:
        r.photos?.length > 0
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${r.photos[0].photo_reference}&key=${API_KEY}`
          : null,
    }));
  } catch (err) {
    console.error("❌ Error fetching shuffled restaurants:", err);
    return [];
  }
}

/**
 * Fetch detailed restaurant info by place_id
 */
export async function fetchRestaurantDetails(placeId: string) {
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,photos,rating,opening_hours,url&key=${API_KEY}`;
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
    googleUrl: r.url, // link to Google Maps
    photos:
      r.photos?.map(
        (p: any) =>
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${API_KEY}`
      ) || [],
    hours: r.opening_hours?.weekday_text || [],
  };
}
