// src/utils/listsApi.ts
import { supabase } from "./supabaseClient";
import { RestaurantPointer } from "../utils/restaurantPointers";

// ------------------------------
// GET ALL LISTS (with item count)
// ------------------------------
export async function getLists() {
  const { data, error } = await supabase
    .from("lists")
    .select(
      `
      id,
      title,
      description,
      created_at,
      list_items ( id )
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Add placesCount to each list
  return (data ?? []).map((l: any) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    created_at: l.created_at,
    placesCount: Array.isArray(l.list_items) ? l.list_items.length : 0,
  }));
}

// ------------------------------
// CREATE NEW LIST
// ------------------------------
export async function createList(
  title: string,
  description: string | null = null
) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const { data, error } = await supabase
    .from("lists")
    .insert({
      owner_id: userId,
      title,
      description,
      is_shared: false,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: collabError } = await supabase
    .from("list_collaborators")
    .insert({
      list_id: data.id,
      user_id: userId,
      role: "owner",
    });

  if (collabError) {
    console.error("❌ Failed to add owner as collaborator:", collabError);
    throw collabError;
  }

  return data;
}

// ------------------------------
// GET ITEMS FOR A LIST
// ------------------------------
export async function getListItems(listId: string) {
  const { data, error } = await supabase
    .from("list_items")
    .select("*")
    .eq("list_id", listId);

  if (error) throw error;
  return data ?? [];
}

// ------------------------------
// ADD TO LIST
// ------------------------------
export async function addToList(listId: string, restaurant: RestaurantPointer) {
  const { data, error } = await supabase
    .from("list_items")
    .insert({
      list_id: listId,
      restaurant_id: restaurant.id,
      restaurant_source: restaurant.source,
      restaurant_name: restaurant.name,
      restaurant_address: restaurant.address,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ------------------------------
// REMOVE FROM LIST
// ------------------------------
export async function removeFromList(itemId: string) {
  const { error } = await supabase.from("list_items").delete().eq("id", itemId);

  if (error) throw error;
  return true;
}

// UPDATE LIST
export async function updateList(
  listId: string,
  updates: { title?: string; description?: string | null }
) {
  const { data, error } = await supabase
    .from("lists")
    .update(updates)
    .eq("id", listId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// DELETE LIST
export async function deleteList(listId: string) {
  const { error } = await supabase.from("lists").delete().eq("id", listId);

  if (error) throw error;
  return true;
}

// ADD COLLABORATOR
export async function addCollaborator(listId: string, userId: string) {
  const { data, error } = await supabase
    .from("list_collaborators")
    .insert({ list_id: listId, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// REMOVE COLLABORATOR
export async function removeCollaborator(collabId: string) {
  const { error } = await supabase
    .from("list_collaborators")
    .delete()
    .eq("id", collabId);

  if (error) throw error;
  return true;
}

export interface ListWithCount {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  placesCount: number;
}
