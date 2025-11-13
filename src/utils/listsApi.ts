// src/utils/listsApi.ts
import { supabase } from "./supabaseClient";

export interface ListWithCount {
  id: string;
  title: string;
  description?: string | null;
  created_at: string;
  placesCount: number;
}

/**
 * Return all lists the current user belongs to,
 * along with a count of places in each list.
 */
export async function getLists(): Promise<ListWithCount[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("❌ getLists: auth.getUser failed:", userError);
    return [];
  }

  if (!user) {
    console.warn("⚠️ getLists called with no authenticated user");
    return [];
  }

  // 1) Get all lists where the user is a member
  const { data, error } = await supabase
    .from("list_members")
    .select("list_id, lists(id, title, description, created_at)")
    .eq("user_id", user.id);

  if (error) {
    console.error("❌ getLists: list_members query failed:", error);
    return [];
  }

  const baseLists = data?.map((row: any) => row.lists).filter(Boolean) ?? [];

  // 2) For each list, fetch count of items
  const withCounts: ListWithCount[] = [];

  for (const list of baseLists) {
    const { count, error: countError } = await supabase
      .from("list_items")
      .select("id", { count: "exact", head: true })
      .eq("list_id", list.id);

    if (countError) {
      console.error("❌ getLists: list_items count failed:", countError);
    }

    withCounts.push({
      id: list.id,
      title: list.title,
      description: list.description ?? null,
      created_at: list.created_at,
      placesCount: count ?? 0,
    });
  }

  // Newest first
  withCounts.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return withCounts;
}

/**
 * Create a new empty list owned by the current user.
 * Optionally attach an initial restaurant (we're not using that yet here).
 */
export async function createList(
  name: string,
  restaurant?: {
    id: string;
    name: string;
    address?: string;
    source?: "yelp" | "google";
  }
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
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

  // add owner as member
  const { error: memberError } = await supabase.from("list_members").insert({
    list_id: list.id,
    user_id: user.id,
    role: "owner",
  });
  if (memberError) {
    console.error("⚠️ createList: list_members insert failed:", memberError);
  }

  if (restaurant) {
    const { error: itemError } = await supabase.from("list_items").insert({
      list_id: list.id,
      restaurant_id: restaurant.id,
      restaurant_source: restaurant.source ?? "yelp",
      restaurant_name: restaurant.name,
      restaurant_address: restaurant.address ?? null,
    });
    if (itemError) {
      console.error(
        "⚠️ createList: initial list_items insert failed:",
        itemError
      );
    }
  }

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
