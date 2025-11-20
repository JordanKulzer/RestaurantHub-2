// src/utils/favoritesApi.ts
import { supabase } from "./supabaseClient";
import { RestaurantPointer } from "./restaurantPointers";

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function getFavorites(): Promise<RestaurantPointer[]> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("favorites")
    .select(
      `
      id,
      restaurant_id,
      restaurant_name,
      restaurant_address,
      restaurant_source,
      notes,
      created_at
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    uuid: row.id, // real PK
    id: row.restaurant_id, // google place id
    name: row.restaurant_name ?? "",
    address: row.restaurant_address ?? null,
    source: (row.restaurant_source ?? "google") as "google",
    notes: row.notes ?? null,
  }));
}

export async function addFavorite(pointer: RestaurantPointer) {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("favorites")
    .upsert(
      {
        user_id: userId,
        restaurant_id: pointer.id,
        restaurant_name: pointer.name,
        restaurant_address: pointer.address,
        restaurant_source: pointer.source,
      },
      {
        onConflict: "user_id,restaurant_id",
      }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeFavorite(restaurantId: string) {
  const userId = await getUserId();

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId);

  if (error) throw error;
}

export async function isFavorite(restaurantId: string): Promise<boolean> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
