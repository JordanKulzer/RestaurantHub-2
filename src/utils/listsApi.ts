// src/utils/listsApi.ts
import { supabase } from "./supabaseClient";

export async function getLists() {
  const { data, error } = await supabase
    .from("lists")
    .select("id, title, description, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ getLists failed:", error);
    return [];
  }
  return data;
}

export async function createList(
  name: string,
  restaurant?: {
    id: string;
    name: string;
    address?: string;
    source?: "yelp" | "google";
  }
) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const { data: list, error } = await supabase
    .from("lists")
    .insert({
      owner_id: user.id,
      title: name,
    })
    .select("*")
    .single();

  if (error) throw error;

  if (restaurant) {
    await supabase.from("list_items").insert({
      list_id: list.id,
      restaurant_id: restaurant.id,
      restaurant_source: restaurant.source ?? "yelp",
      restaurant_name: restaurant.name,
      restaurant_address: restaurant.address ?? null,
    });
  }

  // also add owner as member (for collab later)
  await supabase.from("list_members").insert({
    list_id: list.id,
    user_id: user.id,
    role: "owner",
  });

  return list;
}

export async function addToList(
  listId: string,
  restaurant: {
    id: string;
    name: string;
    address?: string;
    source?: "yelp" | "google";
  }
) {
  const { data, error } = await supabase
    .from("list_items")
    .insert({
      list_id: listId,
      restaurant_id: restaurant.id,
      restaurant_source: restaurant.source ?? "yelp",
      restaurant_name: restaurant.name,
      restaurant_address: restaurant.address ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
