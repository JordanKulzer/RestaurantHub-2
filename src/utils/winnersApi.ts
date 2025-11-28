// src/utils/winnersApi.ts
import { RestaurantPointer } from "./restaurantPointers";
import { supabase } from "./supabaseClient";

export interface WinnerEntry {
  id: string;
  restaurant_id: string;
  name: string;
  address: string | null;
  source: "google" | "yelp";
  wonAt: string;
  category?: string;
}

export async function getWinners(): Promise<WinnerEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("shuffle_winners")
    .select("*")
    .eq("user_id", user.id)
    .order("won_at", { ascending: false });

  if (error) {
    console.error("Error loading winners:", error);
    return [];
  }

  return (data || []).map((w) => ({
    id: w.restaurant_id,
    restaurant_id: w.restaurant_id,
    name: w.restaurant_name,
    address: w.restaurant_address,
    source: w.restaurant_source as "google" | "yelp",
    wonAt: w.won_at,
    category: w.shuffle_category,
  }));
}

export async function addWinner(
  restaurant: {
    id: string;
    name: string;
    address: string | null;
    source: "google" | "yelp";
  },
  category?: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("shuffle_winners").insert({
    user_id: user.id,
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    restaurant_address: restaurant.address,
    restaurant_source: restaurant.source,
    shuffle_category: category,
  });

  if (error) {
    console.error("Error adding winner:", error);
    throw error;
  }
}

export async function removeWinner(restaurantId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("shuffle_winners")
    .delete()
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error("Error removing winner:", error);
    throw error;
  }
}

export async function clearWinners(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("shuffle_winners")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error clearing winners:", error);
    throw error;
  }
}

/**
 * Convert winners to RestaurantPointer format (for compatibility with existing code)
 */
export function winnersToPointers(winners: WinnerEntry[]): RestaurantPointer[] {
  return winners.map((w) => ({
    id: w.id,
    name: w.name,
    address: w.address,
    source: "google" as const, // RestaurantPointer only accepts "google"
  }));
}
