// src/screens/ShuffleScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  Animated,
} from "react-native";
import {
  Button,
  Card,
  Text,
  Surface,
  useTheme,
  IconButton,
  MD3Theme,
  ProgressBar,
  Modal,
  Portal,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import {
  RestaurantDetailModal,
  DropdownModal,
  QuickActionsMenu,
  UpgradeModal,
  HomeSkeleton,
} from "../components";
import { CATEGORY_OPTIONS } from "../constants/categoryType";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../utils/supabaseClient";
import { getLists } from "../utils/listsApi";
import { fetchGoogleDiscovery } from "../utils/fetchGoogleDiscovery";
import { fetchRestaurantDetails } from "../utils/placesApi";
import { HomeRestaurant } from "../types/homeRestaurant";
import { useIsFocused } from "@react-navigation/native";
import { getFavorites } from "../utils/favoritesApis";
import { RestaurantPointer } from "../utils/restaurantPointers";
import { getLocationCached } from "../utils/locationHelper";

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

const FREE_DAILY_SHUFFLES = 10;

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

  // DATA FOR CURRENT ROUND
  const [restaurants, setRestaurants] = useState<HomeRestaurant[]>([]);
  const [favorites, setFavorites] = useState<HomeRestaurant[]>([]);
  const [likedPool, setLikedPool] = useState<HomeRestaurant[]>([]);
  const [noResults, setNoResults] = useState(false);
  const [loading, setLoading] = useState(false);

  // LISTS (for expandable "Lists" card)
  const [preloadedLists, setPreloadedLists] = useState<any[]>([]);
  const [listsExpanded, setListsExpanded] = useState(false);

  // MODAL
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<HomeRestaurant | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // HOURS
  const [hoursModalVisible, setHoursModalVisible] = useState(false);
  const [selectedHours, setSelectedHours] = useState<string[]>([]);

  // UPGRADE
  const [shuffleCount, setShuffleCount] = useState(0);
  const [shuffleLastResetDate, setShuffleLastResetDate] = useState<string>("");
  const [showShuffleUpgradeModal, setShowShuffleUpgradeModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false); // mirror HomeScreen

  // FAVORITES
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const isFocused = useIsFocused();

  // Animation states
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;

  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState<HomeRestaurant | null>(null);

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

  const formatAddress = (address: string | null | undefined): string => {
    if (!address) return "";

    const parts = address.split(",").map((p) => p.trim());

    if (parts.length >= 3) {
      const stateZipPart = parts[2];
      const stateMatch = stateZipPart.match(/^([A-Z]{2})/);

      if (stateMatch) {
        const state = stateMatch[1];
        return `${parts[0]}, ${parts[1]}, ${state}`;
      }
    }

    return address;
  };

  const getAnimatedValue = (id: string) => {
    if (!animatedValues.has(id)) {
      const newValue = new Animated.Value(1);
      animatedValues.set(id, newValue);
      return newValue;
    }
    return animatedValues.get(id)!;
  };

  const resetAnimatedValues = () => {
    animatedValues.clear();
  };

  useEffect(() => {
    const request = async () => {
      await AsyncStorage.multiRemove(["shuffleCount", "shuffleLastResetDate"]); // UNCOMMENT TO RESET DAILY COUNTER

      try {
        const loc = await getLocationCached();
        setLocation({ lat: loc.latitude, lon: loc.longitude });
      } catch (e) {
        console.warn("⚠️ ShuffleScreen could not get location:", e);
      }
    };
    request();
  }, []);

  useEffect(() => {
    const loadLists = async () => {
      try {
        const lists = await getLists();
        setPreloadedLists(
          lists.map((l: any) => ({
            ...l,
            selected: false,
          }))
        );
      } catch (e) {
        console.error("getLists failed:", e);
      }
    };
    loadLists();
  }, []);

  useEffect(() => {
    const checkShuffleDailyReset = async () => {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem("shuffleLastResetDate");
      const storedCount = await AsyncStorage.getItem("shuffleCount");

      if (stored !== today) {
        // New day — reset
        setShuffleCount(0);
        setShuffleLastResetDate(today);
        await AsyncStorage.setItem("shuffleLastResetDate", today);
        await AsyncStorage.setItem("shuffleCount", "0");
      } else {
        // Load existing
        const parsed = parseInt(storedCount || "0", 10);
        const safe = Math.min(parsed, FREE_DAILY_SHUFFLES);
        setShuffleCount(safe);
        setShuffleLastResetDate(today);
      }
    };

    checkShuffleDailyReset();
  }, []);

  const refreshFavoriteIds = async () => {
    try {
      const favs = await getFavorites();
      setFavoriteIds(new Set(favs.map((f) => f.id)));
    } catch (e) {
      console.error("Error loading favorites:", e);
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    refreshFavoriteIds();
  }, [isFocused]);

  function upgradeLikedEntry(raw: any): HomeRestaurant {
    return {
      id: raw.id ?? raw.placeId ?? raw.restaurant_id ?? "",
      source: raw.source ?? raw.restaurant_source ?? "google",

      name: raw.name ?? raw.restaurant_name ?? "Unknown",
      address: raw.address ?? raw.restaurant_address ?? null,

      rating: typeof raw.rating === "number" ? raw.rating : 0,
      reviewCount: raw.reviewCount ?? null,
      price: raw.price ?? null,

      distanceMiles: raw.distanceMiles ?? null,

      photos: Array.isArray(raw.photos)
        ? raw.photos
        : raw.image
        ? [raw.image]
        : [],

      googleMapsUrl: raw.googleMapsUrl ?? null,
      yelpUrl: raw.yelpUrl ?? null,

      image:
        raw.image ??
        (Array.isArray(raw.photos) && raw.photos.length > 0
          ? raw.photos[0]
          : null),
    };
  }

  useEffect(() => {
    if (!isFocused) return;

    const loadLiked = async () => {
      try {
        const stored = await AsyncStorage.getItem("likedRestaurants");
        if (!stored) {
          setLikedPool([]);
          return;
        }
        const parsed = JSON.parse(stored);

        if (!Array.isArray(parsed)) {
          setLikedPool([]);
          return;
        }
        const upgraded = parsed.map((item: any) => upgradeLikedEntry(item));

        setLikedPool(upgraded);
      } catch (e) {
        console.error("Error loading likedRestaurants:", e);
      }
    };

    loadLiked();
  }, [isFocused]);

  const handleBackToSource = () => {
    setRestaurants([]);
    setNoResults(false);
    setPhase("choose-source");
    setShuffleSource(null);
    setShuffleLabel("");
    setWinner(null);
    resetAnimatedValues();
  };

  const incrementShuffleCount = async () => {
    const newCount = Math.min(shuffleCount + 1, FREE_DAILY_SHUFFLES);

    if (!isPremium && newCount > FREE_DAILY_SHUFFLES) {
      setShowShuffleUpgradeModal(true);
      return;
    }

    setShuffleCount(newCount);
    await AsyncStorage.setItem("shuffleCount", newCount.toString());

    if (!isPremium && newCount === FREE_DAILY_SHUFFLES) {
      setShowShuffleUpgradeModal(true);
    }
  };

  const mapGoogleDetailsToRestaurant = (
    details: any,
    fallback?: Partial<HomeRestaurant>
  ): HomeRestaurant => {
    const primaryImage =
      Array.isArray(details?.photos) && details.photos.length > 0
        ? details.photos[0]
        : (fallback as any)?.image ?? (fallback as any)?.photo ?? null;

    return {
      id: details?.id ?? fallback?.id ?? "",
      source: "google",
      name: details?.name ?? fallback?.name ?? "Unknown",
      address:
        details?.formatted_address ??
        details?.address ??
        fallback?.address ??
        "",
      rating:
        typeof details?.rating === "number"
          ? details.rating
          : fallback?.rating ?? 0,
      distanceMiles:
        typeof fallback?.distanceMiles === "number"
          ? fallback.distanceMiles
          : null,
      googleUrl: details?.googleUrl ?? details?.url ?? null,
      photos: Array.isArray(details?.photos) ? details.photos : [],
      hours: details?.hours ?? [],
      isOpen:
        typeof details?.isOpen === "boolean"
          ? details.isOpen
          : fallback?.isOpen ?? null,
      image: primaryImage,
    } as HomeRestaurant & { image?: string | null };
  };

  // ✅ UPDATED: Pass radius parameter
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
    setPhase("eliminate");

    try {
      const results =
        (await fetchGoogleDiscovery({
          latitude: location.lat,
          longitude: location.lon,
          filters: [],
          maxDistanceMiles: 5, // Default radius for surprise mode
        })) || [];

      const limit = 5;
      const subset = results.slice(0, limit); // No need to shuffle, already randomized

      setRestaurants(subset);
      if (!subset.length) {
        setNoResults(true);
      } else {
        setShuffleLabel("Choose Your Winner");
      }
    } catch (e) {
      console.error("Google discovery error (surprise):", e);
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
    setShuffleLabel("Choose Your Winner");

    const { data, error } = await supabase
      .from("list_items")
      .select(
        `
        id,
        list_id,
        restaurant_id,
        restaurant_name,
        restaurant_address,
        restaurant_source
      `
      )
      .in("list_id", listIds);

    if (error || !data) {
      console.error("list_items error:", error);
      return [] as HomeRestaurant[];
    }

    const byId: Record<string, any> = {};
    data.forEach((row: any) => {
      if (!byId[row.restaurant_id]) {
        byId[row.restaurant_id] = row;
      }
    });
    const rows = Object.values(byId) as any[];

    const enriched = await Promise.all(
      rows.map(async (row) => {
        try {
          const details = await fetchRestaurantDetails(row.restaurant_id);
          return mapGoogleDetailsToRestaurant(details, {
            id: row.restaurant_id,
            name: row.restaurant_name,
            address: row.restaurant_address,
            source: "google",
          } as Partial<HomeRestaurant>);
        } catch (err) {
          console.error("Google details failed for list item:", err);
          return {
            id: row.restaurant_id,
            source: "google",
            name: row.restaurant_name ?? "Unknown",
            address: row.restaurant_address ?? "",
            rating: 0,
            distanceMiles: null,
            googleUrl: null,
            photos: [],
            hours: [],
            isOpen: null,
          } as HomeRestaurant;
        }
      })
    );

    return enriched;
  }

  async function handleSelectSource(key: ShuffleSource) {
    setShuffleSource(key);
    setNoResults(false);
    setWinner(null);
    resetAnimatedValues();

    if (key === "favorites") {
      setShuffleLabel("Choose Your Winner");
      setLoading(true);
      setPhase("eliminate");

      try {
        const favPointers = await getFavorites();
        if (!favPointers.length) {
          setRestaurants([]);
          setNoResults(true);
          return;
        }

        const enriched = await Promise.all(
          favPointers.map(async (ptr: RestaurantPointer) => {
            try {
              const details = await fetchRestaurantDetails(ptr.id);
              return mapGoogleDetailsToRestaurant(details, {
                id: ptr.id,
                name: ptr.name,
                address: ptr.address ?? "",
                source: ptr.source,
              });
            } catch (err) {
              console.error("Details failed for favorite:", err);
              return {
                id: ptr.id,
                source: ptr.source,
                name: ptr.name,
                address: ptr.address ?? "",
                rating: 0,
                distanceMiles: null,
                googleUrl: null,
                photos: [],
                hours: [],
                isOpen: null,
              } as HomeRestaurant;
            }
          })
        );

        setRestaurants(enriched);
        incrementShuffleCount();
        setNoResults(false);
      } catch (e) {
        console.error("favorites load error:", e);
        setRestaurants([]);
        setNoResults(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (key === "liked") {
      setShuffleLabel("Choose Your Winner");
      setPhase("eliminate");

      if (!likedPool.length) {
        setRestaurants([]);
        setNoResults(true);
        return;
      }

      setRestaurants(likedPool);
      incrementShuffleCount();
      setNoResults(false);
      return;
    }

    if (key === "lists") {
      setShuffleLabel("Choose Your Winner");
      setPhase("choose-source");
      return;
    }

    if (key === "filters") {
      setShuffleLabel("Choose Your Winner");
      setPhase("filters");
      return;
    }

    if (key === "surprise") {
      incrementShuffleCount();
      loadRandomNearbyRestaurants();
      return;
    }
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
      else {
        setPhase("eliminate");
        incrementShuffleCount();
      }
    } catch (e) {
      console.error("loadRestaurantsFromLists failed:", e);
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
  // ✅ UPDATED: FILTER MODE SHUFFLE (uses radius, client-side rating filter only)
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
    setPhase("eliminate");

    try {
      // Parse distance filter
      const maxDistance = distance ? Number(distance) : undefined;

      // Fetch with radius parameter
      const results =
        (await fetchGoogleDiscovery({
          latitude: location.lat,
          longitude: location.lon,
          filters: categories,
          maxDistanceMiles: maxDistance,
        })) || [];

      // ✅ Only filter by rating client-side (distance already handled by API)
      const minRating = rating ? Number(rating) : 0;
      const filtered = results.filter((r) => {
        return (
          !minRating || (typeof r.rating === "number" && r.rating >= minRating)
        );
      });

      const limit = Number(numberDisplayed) || 5;
      const subset = filtered.slice(0, limit); // Already randomized by API

      setRestaurants(subset);
      if (!subset.length) setNoResults(true);
      else {
        incrementShuffleCount();
      }
    } catch (err) {
      console.error("Google discovery error (filters):", err);
      Toast.show({
        type: "error",
        text1: "Error loading restaurants",
        text2: "Please check your connection and try again.",
      });
    }

    setLoading(false);
  };

  // -------------------------
  // ELIMINATION MODE
  // -------------------------
  const handleEliminate = (id: string) => {
    const animValue = getAnimatedValue(id);

    Animated.parallel([
      Animated.timing(animValue, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const remaining = restaurants.filter((r) => r.id !== id);
      setRestaurants(remaining);

      if (remaining.length === 1) {
        setWinner(remaining[0]);
        setTimeout(() => {
          setShowWinnerModal(true);
        }, 300);
      } else if (remaining.length === 0) {
        Toast.show({
          type: "info",
          text1: "All restaurants eliminated!",
          text2: "Start over to try again.",
        });
      }
    });
  };

  const handleTryAgain = () => {
    setRestaurants([]);
    setNoResults(false);
    setPhase("choose-source");
    setShuffleSource(null);
    setShuffleLabel("");
    setListsExpanded(false);
    setWinner(null);
    resetAnimatedValues();
  };

  // -------------------------
  // VIEW DETAILS (Google)
  // -------------------------

  const handleViewDetails = async (item: HomeRestaurant) => {
    try {
      const details = await fetchRestaurantDetails(item.id);
      const merged = mapGoogleDetailsToRestaurant(details, item);
      setSelectedRestaurant(merged);
      setShowDetails(true);
    } catch (e) {
      console.error("Google details error:", e);
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
          {String(shuffleLabel || "Elimination Round")}
        </Text>
      </View>

      <IconButton
        icon="refresh"
        size={22}
        onPress={handleTryAgain}
        iconColor={theme.colors.tertiary}
        style={{ marginLeft: "auto" }}
      />
    </View>
  );

  const safeSubtitle = (item: HomeRestaurant) => {
    const ratingText =
      typeof item.rating === "number" ? item.rating.toFixed(1) : "N/A";
    const addr = item.address || "";
    if (addr) return `${addr} • ${ratingText}`;
    return `Rating: ${ratingText}`;
  };

  const getCardImage = (item: any) => {
    return item.image ?? item.photo ?? item.photos?.[0] ?? null;
  };

  const shufflesRemaining = Math.max(0, FREE_DAILY_SHUFFLES - shuffleCount);
  const showShuffleCounter = !isPremium && shufflesRemaining <= 10;

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
              color: theme.colors.tertiary,
            }}
          >
            Shuffler
          </Text>
          {showShuffleCounter && (
            <View style={styles.shuffleCounterContainer}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text
                  style={[
                    styles.shuffleCounterText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {shufflesRemaining} shuffles remaining today
                </Text>

                <TouchableOpacity
                  onPress={() => setShowShuffleUpgradeModal(true)}
                >
                  <Text
                    style={{ color: theme.colors.primary, fontWeight: "600" }}
                  >
                    Upgrade ✨
                  </Text>
                </TouchableOpacity>
              </View>

              <ProgressBar
                progress={shuffleCount / FREE_DAILY_SHUFFLES}
                color={
                  shufflesRemaining <= 5
                    ? theme.colors.error
                    : theme.colors.primary
                }
                style={{ height: 4, borderRadius: 2 }}
              />
            </View>
          )}

          <Text
            style={{
              fontSize: 14,
              color: theme.colors.onSurface + "99",
              marginBottom: 16,
            }}
          >
            Pick where to shuffle from, then eliminate one by one to find your
            winner!
          </Text>

          {/* FAVORITES */}
          <Surface
            mode="elevated"
            style={[
              styles.sourceCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.tertiary,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleSelectSource("favorites")}
              style={{ paddingVertical: 18, paddingHorizontal: 16 }}
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
          </Surface>

          <Surface
            mode="elevated"
            style={[
              styles.sourceCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.tertiary,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleSelectSource("liked")}
              style={{ paddingVertical: 18, paddingHorizontal: 16 }}
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
          </Surface>

          <Surface
            mode="elevated"
            style={[
              styles.sourceCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.tertiary,
                paddingVertical: 20,
                paddingHorizontal: 16,
              },
            ]}
          >
            <TouchableOpacity
              onPress={toggleListsExpand}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={dyn.sourceText(theme)}>Lists</Text>
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
                        const ids = chosen.map((c: any) => c.id);
                        const names = chosen.map((c: any) => c.title);
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
          </Surface>

          <Surface
            mode="elevated"
            style={[
              styles.sourceCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.tertiary,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleSelectSource("filters")}
              style={{ paddingVertical: 18, paddingHorizontal: 16 }}
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
          </Surface>

          <Surface
            mode="elevated"
            style={[
              styles.sourceCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.tertiary,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleSelectSource("surprise")}
              style={{ paddingVertical: 18, paddingHorizontal: 16 }}
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
          </Surface>
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
            onPress={async () => {
              await handleShuffle();

              if (!isPremium && shufflesRemaining === 0) {
                setShowShuffleUpgradeModal(true);
                return;
              }

              incrementShuffleCount();
            }}
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
        <View style={[styles.container, { flex: 0 }]}>
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
          {loading ? (
            <View>
              {Array.from({ length: parseInt(numberDisplayed) || 5 }).map(
                (_, index) => (
                  <HomeSkeleton key={index} />
                )
              )}
            </View>
          ) : (
            <FlatList
              data={restaurants}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => {
                const isFavorite = favoriteIds.has(item.id);
                const imageUrl = getCardImage(item);
                const animValue = getAnimatedValue(item.id);

                return (
                  <Animated.View
                    style={{
                      opacity: animValue,
                      transform: [
                        {
                          scale: animValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                        {
                          translateX: animValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-50, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <Card
                      mode="elevated"
                      style={[
                        styles.card,
                        {
                          backgroundColor: surface,
                          marginBottom: 16,
                          borderRadius: 10,
                          overflow: "hidden",
                        },
                      ]}
                    >
                      {/* Rest of the card stays exactly the same */}
                      <View style={{ position: "relative" }}>
                        {imageUrl ? (
                          <Card.Cover
                            source={{ uri: imageUrl }}
                            style={{
                              width: "100%",
                              height: 240,
                              borderRadius: 10,
                            }}
                          />
                        ) : (
                          <Card.Cover
                            source={{
                              uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png",
                            }}
                            style={{
                              width: "100%",
                              height: 240,
                              borderRadius: 10,
                            }}
                          />
                        )}
                        <LinearGradient
                          colors={["transparent", "rgba(0,0,0,0.6)"]}
                          style={StyleSheet.absoluteFillObject}
                        />

                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            width: 50,
                            height: 50,
                            backgroundColor: theme.colors.secondary + "DD",
                            borderBottomLeftRadius: 20,
                            justifyContent: "center",
                            alignItems: "center",
                            elevation: 4,
                            shadowColor: "#000",
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 2 },
                          }}
                        >
                          <QuickActionsMenu
                            restaurant={item}
                            isFavorite={isFavorite}
                            onFavoriteChange={refreshFavoriteIds}
                            onCreateNewList={() => {}}
                            preloadedLists={[]}
                            listsReady={false}
                          />
                        </View>
                      </View>

                      {/* Info Section */}
                      <View style={{ padding: 16 }}>
                        <Text
                          style={{
                            fontSize: 22,
                            fontWeight: "700",
                            marginBottom: 4,
                            color: theme.colors.onSurface,
                          }}
                        >
                          {item.name}
                        </Text>

                        {/* Meta Row - Rating, Reviews, Price */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flexWrap: "wrap",
                            marginBottom: 4,
                          }}
                        >
                          {item.rating != null &&
                            typeof item.rating === "number" && (
                              <Text
                                style={{
                                  fontSize: 14,
                                  marginRight: 6,
                                  color: theme.colors.onSurface,
                                }}
                              >
                                {`⭐ ${item.rating.toFixed(1)}`}
                              </Text>
                            )}

                          {item.reviewCount != null && (
                            <Text
                              style={{
                                fontSize: 14,
                                marginRight: 6,
                                color: theme.colors.onSurface + "99",
                              }}
                            >
                              {`(${item.reviewCount} reviews)`}
                            </Text>
                          )}

                          {item.price != null && (
                            <Text
                              style={{
                                fontSize: 14,
                                marginRight: 6,
                                color: theme.colors.onSurface + "99",
                              }}
                            >
                              {`• ${item.price}`}
                            </Text>
                          )}
                        </View>

                        {/* Hours Row */}
                        {(item.isOpen !== null ||
                          (item.hours && item.hours.length > 0)) && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginVertical: 8,
                            }}
                          >
                            {item.isOpen !== null &&
                              item.isOpen !== undefined && (
                                <Text
                                  style={{
                                    fontSize: 14,
                                    color: item.isOpen
                                      ? theme.colors.primary
                                      : theme.colors.secondary,
                                    fontWeight: "600",
                                  }}
                                >
                                  {item.isOpen ? "Open now" : "Closed"}
                                </Text>
                              )}

                            {item.hours && item.hours.length > 0 && (
                              <TouchableOpacity
                                onPress={() => {
                                  setSelectedHours(item.hours || []);
                                  setHoursModalVisible(true);
                                }}
                              >
                                <Text
                                  style={{
                                    marginLeft: 8,
                                    color: theme.colors.primary,
                                    fontWeight: "600",
                                    textDecorationLine: "underline",
                                    fontSize: 14,
                                  }}
                                >
                                  View Hours
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

                        {/* Address */}
                        {item.address && (
                          <Text
                            style={{
                              fontSize: 13,
                              marginBottom: 3,
                              color: theme.colors.onSurface + "99",
                            }}
                          >
                            {formatAddress(item.address)}
                          </Text>
                        )}

                        {/* Distance */}
                        {item.distanceMiles != null && (
                          <Text
                            style={{
                              fontSize: 13,
                              marginBottom: 3,
                              color: theme.colors.onSurface + "99",
                            }}
                          >
                            {`${item.distanceMiles.toFixed(2)} mi away`}
                          </Text>
                        )}

                        {!winner && (
                          <Button
                            mode="contained"
                            onPress={() => handleEliminate(item.id)}
                            buttonColor={theme.colors.error}
                            textColor="#fff"
                            style={{
                              marginTop: 12,
                              marginBottom: 8,
                              borderRadius: 25,
                            }}
                            icon="close-circle-outline"
                          >
                            Eliminate
                          </Button>
                        )}

                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginTop: 4,
                            gap: 8,
                          }}
                        >
                          <Button
                            mode="outlined"
                            icon="google-maps"
                            textColor={theme.colors.primary}
                            style={{
                              flex: 1,
                              borderRadius: 25,
                              borderColor: theme.colors.primary,
                            }}
                            onPress={() => {
                              const googleMapsUrl =
                                item.googleMapsUrl ||
                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  item.address || item.name
                                )}`;
                              Linking.openURL(googleMapsUrl);
                            }}
                          >
                            Google
                          </Button>

                          <Button
                            mode="outlined"
                            icon={Platform.OS === "ios" ? "map" : "map-marker"}
                            textColor={theme.colors.tertiary}
                            style={{
                              flex: 1,
                              borderRadius: 25,
                              borderColor: theme.colors.tertiary,
                            }}
                            onPress={() => {
                              const url = `http://maps.apple.com/?daddr=${encodeURIComponent(
                                item.address || item.name
                              )}`;
                              Linking.openURL(url);
                            }}
                          >
                            Apple
                          </Button>
                        </View>
                      </View>
                    </Card>
                  </Animated.View>
                );
              }}
            />
          )}
        </View>
      )}
      <UpgradeModal
        visible={showShuffleUpgradeModal}
        onDismiss={() => setShowShuffleUpgradeModal(false)}
        freeLimit={FREE_DAILY_SHUFFLES}
        onMaybeLater={() => {
          setShowShuffleUpgradeModal(false);
          setRestaurants([]);
          setNoResults(false);
          setPhase("choose-source");
          setShuffleSource(null);
          setShuffleLabel("");
          setListsExpanded(false);
        }}
      />
      <RestaurantDetailModal
        visible={showDetails}
        onDismiss={() => setShowDetails(false)}
        restaurant={selectedRestaurant}
      />
      <Portal>
        <Modal
          visible={hoursModalVisible}
          onDismiss={() => setHoursModalVisible(false)}
          contentContainerStyle={{
            marginHorizontal: 24,
            borderRadius: 16,
            padding: 16,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 8,
              color: theme.colors.onSurface,
            }}
          >
            Hours
          </Text>

          {selectedHours.length > 0 ? (
            selectedHours.map((line, i) => (
              <Text
                key={i}
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 4,
                }}
              >
                {line}
              </Text>
            ))
          ) : (
            <Text style={{ color: theme.colors.onSurface + "99" }}>
              Hours unavailable
            </Text>
          )}

          <Button
            mode="contained"
            onPress={() => setHoursModalVisible(false)}
            style={{ marginTop: 12 }}
          >
            Close
          </Button>
        </Modal>
      </Portal>
      {/* Winner Modal */}
      <Portal>
        <Modal
          visible={showWinnerModal}
          onDismiss={() => {
            setShowWinnerModal(false);
            setWinner(null);
          }}
          contentContainerStyle={{
            marginHorizontal: 20,
            borderRadius: 20,
            padding: 0,
            backgroundColor: theme.colors.surface,
            overflow: "hidden",
          }}
        >
          {winner && (
            <View>
              {/* Header with emoji */}
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 24,
                  paddingBottom: 16,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.outlineVariant,
                }}
              >
                <Text style={{ fontSize: 48, marginBottom: 8 }}>🎉</Text>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: theme.colors.primary,
                    textAlign: "center",
                  }}
                >
                  Winner!
                </Text>
              </View>

              {/* Restaurant Details */}
              <View style={{ padding: 20 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: theme.colors.onSurface,
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  {winner.name}
                </Text>

                {/* Meta Row - Rating, Reviews, Price */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  {winner.rating != null &&
                    typeof winner.rating === "number" && (
                      <Text
                        style={{
                          fontSize: 14,
                          marginRight: 6,
                          color: theme.colors.onSurface,
                        }}
                      >
                        {`⭐ ${winner.rating.toFixed(1)}`}
                      </Text>
                    )}

                  {winner.reviewCount != null && (
                    <Text
                      style={{
                        fontSize: 14,
                        marginRight: 6,
                        color: theme.colors.onSurface + "99",
                      }}
                    >
                      {`(${winner.reviewCount} reviews)`}
                    </Text>
                  )}

                  {winner.price != null && (
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.colors.onSurface + "99",
                      }}
                    >
                      {`• ${winner.price}`}
                    </Text>
                  )}
                </View>

                {/* Hours Row */}
                {(winner.isOpen !== null ||
                  (winner.hours && winner.hours.length > 0)) && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      marginVertical: 8,
                    }}
                  >
                    {winner.isOpen !== null && winner.isOpen !== undefined && (
                      <Text
                        style={{
                          fontSize: 14,
                          color: winner.isOpen
                            ? theme.colors.primary
                            : theme.colors.secondary,
                          fontWeight: "600",
                        }}
                      >
                        {winner.isOpen ? "Open now" : "Closed"}
                      </Text>
                    )}

                    {winner.hours && winner.hours.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedHours(winner.hours || []);
                          setHoursModalVisible(true);
                        }}
                      >
                        <Text
                          style={{
                            marginLeft: 8,
                            color: theme.colors.primary,
                            fontWeight: "600",
                            textDecorationLine: "underline",
                            fontSize: 14,
                          }}
                        >
                          View Hours
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Address */}
                {winner.address && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.colors.onSurface + "99",
                      textAlign: "center",
                      marginBottom: 8,
                    }}
                  >
                    {formatAddress(winner.address)}
                  </Text>
                )}

                {/* Distance */}
                {winner.distanceMiles != null && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.colors.onSurface + "99",
                      textAlign: "center",
                      marginBottom: 16,
                    }}
                  >
                    {`${winner.distanceMiles.toFixed(2)} mi away`}
                  </Text>
                )}

                {/* Action Buttons */}
                <View style={{ gap: 12, marginTop: 8 }}>
                  {/* Map Buttons */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    <Button
                      mode="outlined"
                      icon="google-maps"
                      textColor={theme.colors.primary}
                      onPress={() => {
                        setShowWinnerModal(false);
                        const googleMapsUrl =
                          winner.googleMapsUrl ||
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            winner.address || winner.name
                          )}`;
                        Linking.openURL(googleMapsUrl);
                      }}
                      style={[
                        styles.linkButton,
                        { borderColor: theme.colors.primary },
                      ]}
                    >
                      Google
                    </Button>

                    <Button
                      mode="outlined"
                      icon={Platform.OS === "ios" ? "map" : "map-marker"}
                      textColor={theme.colors.tertiary}
                      onPress={() => {
                        setShowWinnerModal(false);
                        const url = `http://maps.apple.com/?daddr=${encodeURIComponent(
                          winner.address || winner.name
                        )}`;
                        Linking.openURL(url);
                      }}
                      style={[
                        styles.linkButton,
                        { borderColor: theme.colors.tertiary },
                      ]}
                    >
                      Apple
                    </Button>
                  </View>

                  <Button
                    mode="text"
                    onPress={() => {
                      setShowWinnerModal(false);
                      setWinner(null);
                    }}
                    textColor={theme.colors.onSurfaceVariant}
                  >
                    Close
                  </Button>
                </View>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  shuffleCounterContainer: {
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  shuffleCounterText: {
    fontSize: 13,
    fontWeight: "600",
  },
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
  sourceCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  shuffleButton: {
    marginTop: 16,
    borderRadius: 24,
    paddingVertical: 6,
  },
  linkButton: { flex: 1, borderRadius: 25 },
});

export const dyn = {
  sourceButton: (surface: string, theme: MD3Theme) => ({
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: surface,
    borderColor: theme.colors.outlineVariant,
  }),

  sourceText: (theme: MD3Theme) => ({
    fontSize: 16,
    fontWeight: "500" as const,
    color: theme.colors.tertiary,
  }),

  expandArrow: (theme: MD3Theme) => ({
    fontSize: 18,
    color: theme.colors.tertiary,
  }),
};
