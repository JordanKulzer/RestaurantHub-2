import { API_BASE_URL } from "./apiConfig";

export async function fetchYelpRestaurants(
  lat: number,
  lon: number,
  term = "restaurants",
  categories?: string[]
) {
  try {
    const categoryQuery =
      categories && categories.length
        ? `&categories=${categories.join(",")}`
        : "";
    const res = await fetch(
      `${API_BASE_URL}/search?lat=${lat}&lon=${lon}&term=${encodeURIComponent(
        term
      )}${categoryQuery}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("❌ Yelp fetch error:", err);
    return [];
  }
}

export async function fetchYelpDetails(id: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/details/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("❌ Yelp details fetch error:", err);
    return null;
  }
}
