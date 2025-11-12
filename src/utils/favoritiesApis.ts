import { supabase } from "./supabaseClient";

export async function getFavorites() {
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ getFavorites failed:", error);
    return [];
  }
  return data;
}

export async function toggleFavorite(restaurant: {
  id: string;
  name: string;
  address?: string;
  source?: "yelp" | "google";
}) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const source = restaurant.source ?? "yelp";

  const { data: existing, error: selectError } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurant.id)
    .eq("restaurant_source", source)
    .maybeSingle();

  if (selectError && selectError.code !== "PGRST116") {
    console.error("❌ toggleFavorite select failed:", selectError);
    return;
  }

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    return { isFavorite: false };
  } else {
    const { error: insertError } = await supabase.from("favorites").insert({
      user_id: user.id,
      restaurant_id: restaurant.id,
      restaurant_source: source,
      restaurant_name: restaurant.name,
      restaurant_address: restaurant.address ?? null,
    });
    if (insertError) throw insertError;
    return { isFavorite: true };
  }
}
