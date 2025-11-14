// src/screens/ShuffleScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  Button,
  Card,
  Text,
  Surface,
  useTheme,
  IconButton,
  MD3Theme,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import {
  RestaurantDetailModal,
  DropdownModal,
  QuickActionsMenu,
} from "../components";
import { CATEGORY_OPTIONS } from "../constants/categoryType";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../utils/supabaseClient";
import { getLists } from "../utils/listsApi";
import { fetchYelpDetails, fetchYelpRestaurants } from "../utils/yelpApi";
import * as Location from "expo-location";

type Phase = "choose-source" | "filters" | "eliminate";
type ShuffleSource =
  | "favorites"
  | "liked"
  | "lists"
  | "filters"
  | "surprise"
  | null;

const SCREEN_HEIGHT = Dimensions.get("window").height;
const CARD_PHOTO_HEIGHT = SCREEN_HEIGHT * 0.32;

export default function ShuffleScreen() {
  const theme = useTheme();

  // LOCATION
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null
  );

  // CORE STATE
  const [phase, setPhase] = useState<Phase>("choose-source");
  const [shuffleSource, setShuffleSource] = useState<ShuffleSource>(null);
  const [shuffleLabel, setShuffleLabel] = useState("");

  // FILTERS
  const [categories, setCategories] = useState<string[]>([]);
  const [rating, setRating] = useState("");
  const [distance, setDistance] = useState("");
  const [numberDisplayed, setNumberDisplayed] = useState("5");

  // DATA
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [noResults, setNoResults] = useState(false);
  const [loading, setLoading] = useState(false);

  // LISTS (for expandable "Lists" card)
  const [preloadedLists, setPreloadedLists] = useState<any[]>([]);
  const [listsExpanded, setListsExpanded] = useState(false);

  // MODAL
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const accent = theme.colors.tertiary;
  const surface = theme.colors.surface;

  const ratingOptions = [
    { label: "Any", value: "" },
    { label: "3+", value: "3" },
    { label: "4+", value: "4" },
    { label: "4.5+", value: "4.5" },
  ];
  const distanceOptions = [
    { label: "1 mi", value: "1" },
    { label: "3 mi", value: "3" },
    { label: "5 mi", value: "5" },
    { label: "10 mi", value: "10" },
  ];
  const numberOptions = [
    { label: "3", value: "3" },
    { label: "5", value: "5" },
    { label: "7", value: "7" },
    { label: "10", value: "10" },
  ];

  // -------------------------
  // LOCATION INIT
  // -------------------------
  useEffect(() => {
    const request = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("⚠️ Location not granted");
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      setLocation({ lat: coords.latitude, lon: coords.longitude });
    };
    request();
  }, []);

  useEffect(() => {
    const loadLists = async () => {
      try {
        const lists = await getLists();
        setPreloadedLists(lists.map((l) => ({ ...l, selected: false })));
      } catch (e) {
        console.error("❌ getLists failed:", e);
      }
    };
    loadLists();
  }, []);

  // -------------------------
  // HELPERS
  // -------------------------

  const handleBackToSource = () => {
    setRestaurants([]);
    setNoResults(false);
    setPhase("choose-source");
    setShuffleSource(null);
    setShuffleLabel("");
  };

  const handleToggleFavorite = (r: any) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === r.id);
      return exists ? prev.filter((f) => f.id !== r.id) : [...prev, r];
    });
  };

  // Normalize Yelp → app restaurant shape
  function mapYelpToRestaurant(details: any, fallbackRow: any = {}) {
    const categoriesArray = Array.isArray(details?.categories)
      ? details.categories
      : Array.isArray(fallbackRow?.categories)
      ? fallbackRow.categories
      : [];

    return {
      id: details?.id ?? fallbackRow.restaurant_id,
      name: details?.name ?? fallbackRow.restaurant_name,
      address:
        details?.location?.display_address?.join(", ") ??
        fallbackRow.restaurant_address,
      rating: details?.rating ?? fallbackRow.rating ?? 0,
      photo:
        details?.photos?.[0] ??
        fallbackRow?.photo ??
        "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg",
      distance: details?.distance ?? fallbackRow.distance ?? null,
      types: categoriesArray.map((c: any) => c.title ?? c),
      hours: Array.isArray(details?.hours) ? details.hours : [],
      phone: details?.display_phone ?? null,
      website: details?.url ?? null,
      // if your Yelp wrapper sets distanceMiles, keep it
      distanceMiles: fallbackRow.distanceMiles ?? details?.distanceMiles,
    };
  }

  // -------------------------
  // YELP LOADERS
  // -------------------------

  async function loadRandomNearbyRestaurants() {
    if (!location) {
      Toast.show({
        type: "error",
        text1: "Location not ready",
        text2: "Please wait a moment and try again.",
      });
      return;
    }
    setLoading(true);
    setNoResults(false);

    try {
      const results = await fetchYelpRestaurants(
        location.lat,
        location.lon,
        "restaurants",
        []
      );

      const shuffled = (results ?? []).sort(() => Math.random() - 0.5);
      const subset = shuffled.slice(0, 5);

      setRestaurants(subset);
      if (!subset.length) {
        setNoResults(true);
      } else {
        setShuffleLabel("Random Shuffle");
        setPhase("eliminate");
      }
    } catch (e) {
      console.error("❌ Yelp random fetch failed:", e);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Unable to load restaurants.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadRestaurantsFromLists(
    listIds: string[],
    listNames: string[]
  ) {
    setShuffleLabel(`Shuffle Through: ${listNames.join(", ")}`);

    const { data, error } = await supabase
      .from("list_items")
      .select("*")
      .in("list_id", listIds);

    if (error || !data) {
      console.error("❌ list_items error:", error);
      return [];
    }

    const unique: Record<string, any> = {};
    data.forEach((item) => {
      unique[item.restaurant_id] = item;
    });
    const rows = Object.values(unique);

    const enriched = await Promise.all(
      rows.map(async (row: any) => {
        try {
          const details = await fetchYelpDetails(row.restaurant_id);
          return mapYelpToRestaurant(details, row);
        } catch (err) {
          console.error("❌ fetchYelpDetails failed for list item:", err);
          // fall back to whatever we have in row
          return mapYelpToRestaurant({}, row);
        }
      })
    );

    return enriched;
  }

  // -------------------------
  // SOURCE SELECTOR
  // -------------------------

  async function handleSelectSource(key: ShuffleSource) {
    setShuffleSource(key);
    setNoResults(false);

    if (key === "favorites") {
      setShuffleLabel("Shuffle Through Your Favorites");
      setRestaurants([]);
      setNoResults(true);
      setPhase("eliminate");
      return;
    }

    if (key === "liked") {
      setShuffleLabel("Shuffle Through Your Liked Restaurants");
      setRestaurants([]);
      setNoResults(true);
      setPhase("eliminate");
      return;
    }

    if (key === "filters") {
      setShuffleLabel("Shuffle Through Filtered Results");
      setPhase("filters");
      return;
    }

    if (key === "surprise") {
      await loadRandomNearbyRestaurants();
      return;
    }

    // "lists" is handled by the expandable Lists card (no-op here)
  }

  const toggleListsExpand = () => {
    setListsExpanded((prev) => !prev);
  };

  const handleListsSelected = async (
    listIds: string[],
    listNames: string[]
  ) => {
    setLoading(true);
    setNoResults(false);

    try {
      const merged = await loadRestaurantsFromLists(listIds, listNames);
      setRestaurants(merged);

      if (!merged.length) setNoResults(true);
      else setPhase("eliminate");
    } catch (e) {
      console.error("❌ loadRestaurantsFromLists failed:", e);
      Toast.show({
        type: "error",
        text1: "Error loading list items",
      });
      setNoResults(true);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // FILTER MODE SHUFFLE (Yelp + client filtering)
  // -------------------------

  const handleShuffle = async () => {
    if (!location) {
      Toast.show({
        type: "error",
        text1: "Location not ready",
        text2: "Please wait a moment and try again.",
      });
      return;
    }

    setLoading(true);
    setNoResults(false);

    try {
      const results = await fetchYelpRestaurants(
        location.lat,
        location.lon,
        "restaurants",
        categories
      );

      const raw = results ?? [];

      const minRating = rating ? Number(rating) : 0;
      const maxDistance = distance ? Number(distance) : null;

      const filtered = raw.filter((r: any) => {
        const meetsRating =
          !minRating || (typeof r.rating === "number" && r.rating >= minRating);

        const distMiles = r.distanceMiles
          ? Number(r.distanceMiles)
          : r.distance
          ? Number(r.distance) / 1609.34 // if Yelp gives meters
          : null;

        const meetsDistance =
          !maxDistance || (distMiles !== null && distMiles <= maxDistance);

        return meetsRating && meetsDistance;
      });

      const limit = Number(numberDisplayed) || 5;
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      const subset = shuffled.slice(0, limit);

      setRestaurants(subset);
      if (!subset.length) setNoResults(true);
      else setPhase("eliminate");
    } catch (err) {
      console.error("❌ Yelp filter fetch error:", err);
      Toast.show({
        type: "error",
        text1: "Location Error",
        text2: "Please enable GPS or try again.",
      });
    }

    setLoading(false);
  };

  // -------------------------
  // ELIMINATION MODE
  // -------------------------

  const handleEliminate = (id: string) => {
    const remaining = restaurants.filter((r) => r.id !== id);
    setRestaurants(remaining);

    if (remaining.length === 1) {
      Toast.show({
        type: "success",
        text1: `Winner: ${remaining[0].name}!`,
      });
    }
  };

  const handleTryAgain = () => {
    setRestaurants([]);
    setNoResults(false);
    setPhase("choose-source");
    setShuffleSource(null);
    setShuffleLabel("");
    setListsExpanded(false);
  };

  // -------------------------
  // VIEW DETAILS (Yelp)
  // -------------------------

  const handleViewDetails = async (item: any) => {
    try {
      const details = await fetchYelpDetails(item.id);
      setSelectedRestaurant(mapYelpToRestaurant(details, item));
      setShowDetails(true);
    } catch (e) {
      console.error("❌ Yelp details error:", e);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Unable to load restaurant details.",
      });
    }
  };

  // -------------------------
  // UI HELPERS
  // -------------------------

  const renderHeaderWithBack = () => (
    <View style={styles.headerRow}>
      <IconButton
        icon="arrow-left"
        size={22}
        onPress={handleBackToSource}
        iconColor={theme.colors.onSurface}
        style={{ marginLeft: -8 }}
      />

      <View style={styles.headerTitleRow}>
        <View style={[styles.colorBar, { backgroundColor: accent }]} />
        <Text style={[styles.header, { color: theme.colors.onSurface }]}>
          {shuffleLabel || "Elimination Round"}
        </Text>
      </View>
    </View>
  );

  const safeSubtitle = (item: any) => {
    const ratingText =
      typeof item.rating === "number" ? item.rating.toFixed(1) : "N/A";
    const addr = item.address || "";
    if (addr) return `${addr} • ${ratingText}`;
    return `⭐ ${ratingText}`;
  };

  // -------------------------
  // RENDER
  // -------------------------

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <LinearGradient
        colors={[theme.colors.background, surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* CHOOSE SOURCE */}
      {phase === "choose-source" && shuffleSource === null && (
        <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              marginBottom: 6,
              color: theme.colors.onBackground,
            }}
          >
            Restaurant Shuffler
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: theme.colors.onSurface + "99",
              marginBottom: 16,
            }}
          >
            Pick where to shuffle from.
          </Text>

          {/* FAVORITES */}
          <TouchableOpacity
            onPress={() => handleSelectSource("favorites")}
            style={{
              marginBottom: 10,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              paddingVertical: 20,
              paddingHorizontal: 18,
              backgroundColor: surface,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={dyn.sourceText(theme)}>Favorites</Text>
              <Text style={dyn.expandArrow(theme)}>▶</Text>
            </View>
          </TouchableOpacity>

          {/* LIKED */}
          <TouchableOpacity
            onPress={() => handleSelectSource("liked")}
            style={{
              marginBottom: 10,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              paddingVertical: 20,
              paddingHorizontal: 18,
              backgroundColor: surface,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={dyn.sourceText(theme)}>Liked</Text>
              <Text style={dyn.expandArrow(theme)}>▶</Text>
            </View>
          </TouchableOpacity>

          {/* LISTS — EXPANDABLE CARD */}
          <View
            style={{
              backgroundColor: surface,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.outlineVariant,
              paddingVertical: 20,
              paddingHorizontal: 16,
              marginBottom: 10,
            }}
          >
            <TouchableOpacity
              onPress={toggleListsExpand}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.onSurface,
                }}
              >
                Lists
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                {listsExpanded ? "▼" : "▶"}
              </Text>
            </TouchableOpacity>

            {listsExpanded && (
              <View style={{ marginTop: 10, maxHeight: 300 }}>
                <FlatList
                  data={preloadedLists}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() =>
                        setPreloadedLists((prev) =>
                          prev.map((x) =>
                            x.id === item.id
                              ? { ...x, selected: !x.selected }
                              : x
                          )
                        )
                      }
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 20,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.colors.outlineVariant,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <IconButton
                          icon={
                            item.selected
                              ? "check-circle"
                              : "checkbox-blank-circle-outline"
                          }
                          size={20}
                          iconColor={
                            item.selected
                              ? theme.colors.primary
                              : theme.colors.onSurfaceVariant
                          }
                        />
                        <Text
                          style={{
                            fontSize: 15,
                            color: theme.colors.onSurface,
                            fontWeight: item.selected ? "600" : "400",
                          }}
                        >
                          {item.title}
                        </Text>
                      </View>

                      <Text
                        style={{
                          fontSize: 14,
                          color: theme.colors.onSurfaceVariant,
                        }}
                      >
                        {item.placesCount ?? 0} items
                      </Text>
                    </TouchableOpacity>
                  )}
                />

                {/* Footer Buttons */}
                {preloadedLists.length > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 12,
                    }}
                  >
                    <Button
                      mode="contained"
                      onPress={() => {
                        const chosen = preloadedLists.filter((x) => x.selected);
                        if (!chosen.length) {
                          Toast.show({
                            type: "info",
                            text1: "Select at least 1 list",
                          });
                          return;
                        }
                        const ids = chosen.map((c) => c.id);
                        const names = chosen.map((c) => c.title);
                        handleListsSelected(ids, names);
                      }}
                    >
                      Continue
                    </Button>

                    <Button
                      mode="outlined"
                      onPress={() =>
                        setPreloadedLists((prev) =>
                          prev.map((x) => ({ ...x, selected: false }))
                        )
                      }
                    >
                      Clear
                    </Button>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* FILTERS */}
          <TouchableOpacity
            onPress={() => handleSelectSource("filters")}
            style={{
              marginBottom: 10,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              paddingVertical: 20,
              paddingHorizontal: 18,
              backgroundColor: surface,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={dyn.sourceText(theme)}>Filters</Text>
              <Text style={dyn.expandArrow(theme)}>▶</Text>
            </View>
          </TouchableOpacity>

          {/* SURPRISE ME */}
          <TouchableOpacity
            onPress={() => handleSelectSource("surprise")}
            style={{
              marginBottom: 10,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              paddingVertical: 20,
              paddingHorizontal: 18,
              backgroundColor: surface,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={dyn.sourceText(theme)}>Surprise Me</Text>
              <Text style={dyn.expandArrow(theme)}>▶</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* FILTER MODE */}
      {phase === "filters" && (
        <View style={styles.container}>
          {renderHeaderWithBack()}

          <Surface
            style={[
              styles.filterCard,
              { backgroundColor: surface, borderColor: accent },
            ]}
          >
            <DropdownModal
              label="Categories"
              options={CATEGORY_OPTIONS}
              value={categories}
              onChange={setCategories}
              multiSelect
            />
            <DropdownModal
              label="Rating"
              options={ratingOptions}
              value={rating}
              onChange={setRating}
            />
            <DropdownModal
              label="Distance"
              options={distanceOptions}
              value={distance}
              onChange={setDistance}
            />
            <DropdownModal
              label="Number of Restaurants"
              options={numberOptions}
              value={numberDisplayed}
              onChange={setNumberDisplayed}
            />
          </Surface>

          <Button
            mode="contained"
            buttonColor={accent}
            textColor="#fff"
            style={styles.shuffleButton}
            onPress={handleShuffle}
            loading={loading}
            disabled={loading}
          >
            {loading ? "Shuffling..." : "Shuffle Now"}
          </Button>

          <Button mode="outlined" onPress={handleTryAgain}>
            Reset
          </Button>
        </View>
      )}

      {/* ELIMINATION MODE */}
      {phase === "eliminate" && (
        <View style={styles.container}>
          {renderHeaderWithBack()}

          {noResults && restaurants.length === 0 ? (
            <View style={{ marginTop: 24 }}>
              <Text
                style={{
                  textAlign: "center",
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                No restaurants found. Try changing your source or filters.
              </Text>
            </View>
          ) : null}

          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => {
              const isFavorite = favorites.some((f) => f.id === item.id);

              return (
                <Card
                  mode="elevated"
                  style={[styles.card, { backgroundColor: surface }]}
                >
                  <Card.Title
                    title={item.name}
                    subtitle={safeSubtitle(item)}
                    titleNumberOfLines={2}
                    subtitleNumberOfLines={2}
                    right={() => (
                      <QuickActionsMenu
                        restaurant={item}
                        isFavorite={isFavorite}
                        onToggleFavorite={handleToggleFavorite}
                        onCreateNewList={() => {}}
                      />
                    )}
                  />

                  {item.photo && (
                    <Card.Cover
                      source={{ uri: item.photo }}
                      style={{
                        height: CARD_PHOTO_HEIGHT,
                        resizeMode: "cover",
                      }}
                    />
                  )}

                  <Card.Actions style={{ justifyContent: "space-between" }}>
                    <Button
                      textColor={accent}
                      onPress={() => handleEliminate(item.id)}
                    >
                      Eliminate
                    </Button>

                    <Button onPress={() => handleViewDetails(item)}>
                      View Details
                    </Button>
                  </Card.Actions>
                </Card>
              );
            }}
          />

          <Button
            mode="contained"
            onPress={handleTryAgain}
            buttonColor={accent}
            textColor="#fff"
          >
            Start Over
          </Button>
        </View>
      )}

      {/* DETAILS MODAL */}
      <RestaurantDetailModal
        visible={showDetails}
        onDismiss={() => setShowDetails(false)}
        restaurant={selectedRestaurant}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  header: { fontSize: 20, fontWeight: "700" },

  colorBar: { width: 5, height: 20, borderRadius: 4, marginRight: 6 },

  filterCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },

  card: {
    marginBottom: 22,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
  },

  shuffleButton: {
    marginTop: 16,
    borderRadius: 24,
    paddingVertical: 6,
  },
});

export const dyn = {
  sourceButton: (surface: string, theme: MD3Theme) => ({
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: surface,
    borderColor: theme.colors.outlineVariant,
  }),

  sourceText: (theme: MD3Theme) => ({
    fontSize: 16,
    fontWeight: "500" as const,
    color: theme.colors.onSurface,
  }),

  expandArrow: (theme: MD3Theme) => ({
    fontSize: 18,
    color: theme.colors.onSurfaceVariant,
  }),
};
