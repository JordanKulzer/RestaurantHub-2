// src/navigation/linking.ts
import { LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";

/**
 * Deep linking configuration for the app
 * Handles foodfinder:// URLs for joining lists via share links
 */
export const linking: LinkingOptions<any> = {
  prefixes: [
    Linking.createURL("/"),
    "foodfinder://",
    "https://foodfinder.app",
    "https://*.foodfinder.app",
  ],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: "login",
          Signup: "signup",
        },
      },
      Tabs: {
        screens: {
          Home: "home",
          Shuffle: "shuffle",
          Search: "search",
          "My Stuff": {
            screens: {
              AccountMain: "account",
              ListDetail: "list/:listId",
              FavoritesDetail: "favorites",
            },
          },
        },
      },
      RestaurantDetail: "restaurant/:restaurantId",
      // ✅ Deep link for joining lists
      JoinList: "list/join/:shareLinkId",
    },
  },
};

/**
 * Example URLs that will work:
 * - foodfinder://list/join/abc123xyz
 * - https://foodfinder.app/list/join/abc123xyz
 */
