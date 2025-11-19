// googleCache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryCache = new Map<string, any>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

export async function getCachedPlace(id: string) {
  if (memoryCache.has(id)) return memoryCache.get(id);

  const raw = await AsyncStorage.getItem(`google_place_${id}`);
  if (!raw) return null;

  const { data, ts } = JSON.parse(raw);
  if (Date.now() - ts > CACHE_TTL_MS) return null;

  memoryCache.set(id, data);
  return data;
}

export async function setCachedPlace(id: string, data: any) {
  memoryCache.set(id, data);
  await AsyncStorage.setItem(
    `google_place_${id}`,
    JSON.stringify({ data, ts: Date.now() })
  );
}
