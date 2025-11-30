// src/utils/notesApi.ts
import { supabase } from "./supabaseClient";

export type RestaurantNote = {
  id: string;
  restaurant_id: string;
  user_id: string;
  source: string;
  note_text: string;
  created_at: string;
  updated_at: string;
  // ModernRestaurantCard also reads note.user_email if present,
  // but for personal notes we don't need it; it'll just omit that line.
};

export async function getRestaurantNotes(
  restaurantId: string,
  source: string
): Promise<RestaurantNote[]> {
  const { data, error } = await supabase
    .from("restaurant_notes")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("source", source)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addRestaurantNote(
  restaurantId: string,
  source: string,
  noteText: string
): Promise<RestaurantNote> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error("No authenticated user");

  const { data, error } = await supabase
    .from("restaurant_notes")
    .insert({
      restaurant_id: restaurantId,
      source,
      note_text: noteText,
      user_id: user.id,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as RestaurantNote;
}

export async function deleteRestaurantNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from("restaurant_notes")
    .delete()
    .eq("id", noteId);

  if (error) throw error;
}
