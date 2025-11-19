// src/types/restaurant.ts

export type RestaurantSource = "yelp" | "google" | "custom";

/**
 * The lightweight pointer you store in Supabase.
 * Matches columns like restaurant_id, restaurant_source, etc.
 */
export interface RestaurantPointer {
  restaurant_id: string; // Yelp business id OR Google place_id
  restaurant_source: RestaurantSource;
  restaurant_name?: string | null;
  restaurant_address?: string | null;
}

/**
 * The normalized shape that UI components can rely on.
 * This is what your APIs should return.
 */
export interface RestaurantCard {
  id: string; // Yelp business id OR Google place_id
  source: RestaurantSource;

  name: string;
  address?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  price?: string | null;
  distanceMiles?: number | null;
  hours?: string[];
  isOpen?: boolean | null;

  // Photos: for Yelp, these should be from Google or the single Yelp profile photo
  photos?: string[];

  // Source-specific URLs
  yelpUrl?: string | null;
  googleMapsUrl?: string | null;
}
