// src/utils/cache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * ------------------------------------------------------------
 * PERSISTENT CACHE (AsyncStorage)
 * Used for: Google Place Details → long-term stable data
 * TTL: 3 days
 * ------------------------------------------------------------
 */

const PERSISTENT_TTL = 1000 * 60 * 60 * 24 * 3; // 3 days
const persistentMemoryCache = new Map<string, any>();

// Long-term cached place details
export async function getCachedPlace(id: string) {
  if (persistentMemoryCache.has(id)) return persistentMemoryCache.get(id);

  const raw = await AsyncStorage.getItem(`google_place_${id}`);
  if (!raw) return null;

  const { data, ts } = JSON.parse(raw);
  if (Date.now() - ts > PERSISTENT_TTL) return null;

  persistentMemoryCache.set(id, data);
  return data;
}

export async function setCachedPlace(id: string, data: any) {
  persistentMemoryCache.set(id, data);
  await AsyncStorage.setItem(
    `google_place_${id}`,
    JSON.stringify({ data, ts: Date.now() })
  );
}

/**
 * ------------------------------------------------------------
 * SHORT-TERM MEMORY TTL CACHE
 * Used for: NearbySearch, Shuffled, TextSearch, Discovery
 * TTL: 10 minutes
 * ------------------------------------------------------------
 */

const MEMORY_TTL = 10 * 60 * 1000; // 10 minutes
const shortTermCache = new Map<string, { ts: number; data: any }>();

export function getShortCache<T>(key: string): T | null {
  const entry = shortTermCache.get(key);
  if (!entry) return null;

  const expired = Date.now() - entry.ts > MEMORY_TTL;
  if (expired) {
    shortTermCache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setShortCache<T>(key: string, data: T) {
  shortTermCache.set(key, { ts: Date.now(), data });
}

export function clearAllCaches() {
  persistentMemoryCache.clear();
  shortTermCache.clear();
}
