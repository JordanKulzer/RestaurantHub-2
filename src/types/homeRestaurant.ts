import { RestaurantCard } from "./restaurant";

export interface HomeRestaurant extends RestaurantCard {
  // Yelp Base-plan fields
  reviewCount?: number | null; // allowed
  price?: string | null; // allowed
  categories?: string | null; // allowed (string summary, safe)
  isOpen?: boolean | null; // safe: derived from Yelp "is_closed"
  hours?: string[]; // UI-only (Google / derived)

  // Google fields
  placeId?: string | null;

  // UI enhancements
  image?: string | null; // initial card photo
  photos?: string[]; // full Google photos
}
