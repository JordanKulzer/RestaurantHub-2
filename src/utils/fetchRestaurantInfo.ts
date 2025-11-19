// src/utils/fetchRestaurantInfo.ts

import { RestaurantCard, RestaurantSource } from "../types/restaurant";
import { fetchYelpDetails } from "./yelpApi";
import { fetchRestaurantDetails as fetchGoogleDetails } from "./placesApi";

/**
 * Unified, fully-compliant fetcher that returns normalized RestaurantCard objects.
 *
 * source: "yelp" | "google" | "custom"
 * id: Yelp business id OR Google place_id
 */
export async function fetchRestaurantInfo(
  source: RestaurantSource,
  id: string
): Promise<RestaurantCard | null> {
  if (!id || !source) return null;

  // -------------------------------------------------------------
  // YELP → uses your backend at /api/yelp/business/:id
  // Photos come from Google (server-side). No Yelp photos stored.
  // -------------------------------------------------------------
  if (source === "yelp") {
    const raw = await fetchYelpDetails(id);
    if (!raw) return null;

    const card: RestaurantCard = {
      id: raw.id,
      source: "yelp",
      name: raw.name,
      address: raw.address ?? null,
      rating: raw.rating ?? null,
      reviewCount: raw.reviewCount ?? null,
      price: raw.price ?? null,
      distanceMiles: raw.distanceMiles ?? null,
      photos: Array.isArray(raw.photos) ? raw.photos : [],
      yelpUrl: raw.yelpUrl ?? null,
      googleMapsUrl: raw.googleMapsUrl ?? null,
    };

    return card;
  }

  // -------------------------------------------------------------
  // GOOGLE → uses Google Places Details
  // Must ensure fetchRestaurantDetails() returns user_ratings_total
  // -------------------------------------------------------------
  if (source === "google") {
    const r = await fetchGoogleDetails(id);
    if (!r) return null;

    const card: RestaurantCard = {
      id: r.id,
      source: "google",
      name: r.name,
      address: r.address ?? null,
      rating: r.rating ?? null,
      reviewCount: r.user_ratings_total ?? null, // MUST be added in placesApi.ts
      price: null, // optional: r.price_level
      distanceMiles: null,
      photos: Array.isArray(r.photos) ? r.photos : [],
      googleMapsUrl: r.googleUrl ?? null,
      yelpUrl: null,
      hours: r.hours ?? [],
      isOpen: r.isOpen ?? null,
    };

    return card;
  }

  // -------------------------------------------------------------
  // CUSTOM SOURCE (future local restaurants)
  // -------------------------------------------------------------
  if (source === "custom") {
    console.warn("⚠️ CUSTOM restaurant source not implemented yet");
    return null;
  }

  return null;
}
