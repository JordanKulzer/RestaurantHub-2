export interface RestaurantPointer {
  id: string;
  source: "google";
  name: string;
  address: string | null;
}

export function toPointer(r: any): RestaurantPointer {
  return {
    id: r.id ?? r.restaurant_id,
    source: "google",
    name: r.name ?? r.restaurant_name ?? "Unknown",
    address: r.address ?? r.restaurant_address ?? null,
  };
}
