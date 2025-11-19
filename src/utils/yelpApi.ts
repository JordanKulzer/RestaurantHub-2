// src/utils/yelpApi.ts
import { API_BASE_URL } from "./apiConfig";
import { RestaurantCard } from "../types/restaurant";

/**
 * Search Yelp via your backend.
 * Returns lightweight RestaurantCard objects (no photos yet).
 */
export async function fetchYelpRestaurants(
  lat: number,
  lon: number,
  term = "restaurants",
  categories?: string[]
): Promise<RestaurantCard[]> {
  try {
    const categoryQuery =
      categories && categories.length
        ? `&categories=${categories.join(",")}`
        : "";

    const res = await fetch(
      `${API_BASE_URL}/api/yelp/search?lat=${lat}&lon=${lon}&term=${encodeURIComponent(
        term
      )}${categoryQuery}`
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // Back-end already returns objects with:
    // { source: 'yelp', externalId, name, address, rating, reviewCount, price, distanceMiles, yelpUrl, photos: [], googleMapsUrl }
    // Map to RestaurantCard (id instead of externalId)
    return (data || []).map(
      (b: any): RestaurantCard => ({
        id: b.externalId,
        source: "yelp",
        name: b.name,
        address: b.address,
        rating: b.rating ?? null,
        reviewCount: b.reviewCount ?? null,
        price: b.price ?? null,
        distanceMiles: b.distanceMiles ?? null,
        photos: Array.isArray(b.photos) ? b.photos : [],
        yelpUrl: b.yelpUrl ?? null,
        googleMapsUrl: b.googleMapsUrl ?? null,
      })
    );
  } catch (err) {
    console.error("❌ Yelp fetch error:", err);
    return [];
  }
}

/**
 * Yelp details via your backend.
 * Your server hits Yelp's /businesses/{id}, then fetches Google photos.
 * It already returns a RestaurantCard-like object.
 */
export async function fetchYelpDetails(
  id: string
): Promise<RestaurantCard | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/yelp/business/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const b = await res.json();

    // Normalize again, same as search
    const card: RestaurantCard = {
      id: b.externalId ?? b.id ?? id,
      source: "yelp",
      name: b.name,
      address: b.address ?? null,
      rating: b.rating ?? null,
      reviewCount: b.reviewCount ?? null,
      price: b.price ?? null,
      distanceMiles: b.distanceMiles ?? null,
      photos: Array.isArray(b.photos) ? b.photos : [],
      yelpUrl: b.yelpUrl ?? null,
      googleMapsUrl: b.googleMapsUrl ?? null,
    };

    return card;
  } catch (err) {
    console.error("❌ Yelp details fetch error:", err);
    return null;
  }
}
