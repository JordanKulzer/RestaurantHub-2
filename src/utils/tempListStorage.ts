import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid"; // install with: npm i uuid

export interface SavedList {
  id: string;
  name: string;
  restaurants: any[]; // you can type later
  createdAt: number;
}

const STORAGE_KEY = "userRestaurantLists";

/** Fetch all saved lists */
export async function getLists(): Promise<SavedList[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (err) {
    console.error("❌ getLists failed:", err);
    return [];
  }
}

/** Save all lists */
async function saveLists(lists: SavedList[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  } catch (err) {
    console.error("❌ saveLists failed:", err);
  }
}

/** Create a new list */
export async function createList(name: string, restaurant?: any) {
  const lists = await getLists();
  const newList: SavedList = {
    id: uuidv4(),
    name,
    restaurants: restaurant ? [restaurant] : [],
    createdAt: Date.now(),
  };
  await saveLists([newList, ...lists]);
  return newList;
}

/** Add to an existing list by ID */
export async function addToList(listId: string, restaurant: any) {
  const lists = await getLists();
  const updated = lists.map((l) =>
    l.id === listId
      ? {
          ...l,
          restaurants: l.restaurants.some((r) => r.id === restaurant.id)
            ? l.restaurants
            : [...l.restaurants, restaurant],
        }
      : l
  );
  await saveLists(updated);
  return updated;
}

/** Delete all lists (for debugging) */
export async function clearLists() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
