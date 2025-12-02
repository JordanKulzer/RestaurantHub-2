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
  ScrollView,
  Image,
} from "react-native";
import {
  Button,
  Card,
  Text,
  useTheme,
  IconButton,
  MD3Theme,
  ProgressBar,
  Modal,
  Portal,
  Chip,
  Surface,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import {
  RestaurantDetailModal,
  DropdownModal,
  QuickActionsMenu,
  UpgradeModal,
  HomeSkeleton,
  ShuffleSessionSelector,
  CollaborativeModal,
} from "../components";
import LocationSelector, { LocationData } from "../components/LocationSelector";
import MapLocationPicker from "../components/MapLocationPicker";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { addWinner, getWinners, winnersToPointers } from "../utils/winnersApi";

type Phase = "choose-source" | "eliminate";
type ShuffleSource =
  | "favorites"
  | "liked"
  | "winners"
  | "lists"
  | "filters"
  | "surprise"
  | null;

const SCREEN_HEIGHT = Dimensions.get("window").height;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PHOTO_HEIGHT = 280;

const FREE_DAILY_SHUFFLES = 10;

export default function ShuffleScreen() {
  const theme = useTheme();

  const filterChipStyle = (selected: boolean) => ({
    backgroundColor: selected ? theme.colors.tertiary : "transparent",
    borderColor: theme.colors.tertiary,
  });

  const filterChipTextStyle = (selected: boolean) => ({
    color: selected ? "#fff" : theme.colors.tertiary,
    fontWeight: "600" as const,
    fontSize: 13,
  });

  // COLABORATIVE SHUFFLE
  const [showCollaborativeModal, setShowCollaborativeModal] = useState(false);
  const [collaborativeModalMode, setCollaborativeModalMode] = useState<
    "host" | "join" | null
  >(null);
  const [collaborativeMode, setCollaborativeMode] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [sessionParticipants, setSessionParticipants] = useState<any[]>([]);
  const [sessionConnected, setSessionConnected] = useState(false);

  // LOCATION
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null
  );

  // CORE STATE
  const [phase, setPhase] = useState<Phase>("choose-source");
  const [shuffleSource, setShuffleSource] = useState<ShuffleSource>(null);
  const [shuffleLabel, setShuffleLabel] = useState("");

  // FILTERS - Active filters
  const [categories, setCategories] = useState<string[]>([]);
  const [rating, setRating] = useState("");
  const [distance, setDistance] = useState("");
  const [numberDisplayed, setNumberDisplayed] = useState("5");
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null
  );

  // FILTERS - Pending filters (staged but not applied)
  const [pendingCategories, setPendingCategories] = useState<string[]>([]);
  const [pendingRating, setPendingRating] = useState("");
  const [pendingDistance, setPendingDistance] = useState("");
  const [pendingNumber, setPendingNumber] = useState("5");
  const [pendingLocation, setPendingLocation] = useState<LocationData | null>(
    null
  );

  // DATA FOR CURRENT ROUND
  const [restaurants, setRestaurants] = useState<HomeRestaurant[]>([]);
  const [favorites, setFavorites] = useState<HomeRestaurant[]>([]);
  const [likedPool, setLikedPool] = useState<HomeRestaurant[]>([]);
  const [noResults, setNoResults] = useState(false);
  const [loading, setLoading] = useState(false);

  // LISTS (for expandable "Lists" card)
  const [preloadedLists, setPreloadedLists] = useState<any[]>([]);
  const [listsExpanded, setListsExpanded] = useState(false);

  // WINNERS
  const [winnersPool, setWinnersPool] = useState<HomeRestaurant[]>([]);
  const [winnersExpanded, setWinnersExpanded] = useState(false);

  // FILTERS (for expandable "Filters" card)
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // EXPANDABLE STATES for other sources
  const [favoritesExpanded, setFavoritesExpanded] = useState(false);
  const [likedExpanded, setLikedExpanded] = useState(false);
  const [surpriseExpanded, setSurpriseExpanded] = useState(false);

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
  const [isPremium, setIsPremium] = useState(false);

  // FAVORITES
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const isFocused = useIsFocused();

  // Animation states
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;

  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState<HomeRestaurant | null>(null);

  // Preload lists data for QuickActionsMenu
  const [listsCache, setListsCache] = useState<any[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);

  const accent = theme.colors.tertiary;
  const surface = theme.colors.surface;

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

  // Define preloadLists before using it
  const preloadLists = async () => {
    try {
      const data = await getLists();
      setListsCache(data);
      setListsLoaded(true);
    } catch (e) {
      console.error("❌ Failed to preload lists:", e);
      setListsLoaded(true);
    }
  };

  // Check if there are pending filter changes
  const hasPendingChanges = () => {
    const categoryChanged =
      JSON.stringify(pendingCategories.sort()) !==
      JSON.stringify(categories.sort());
    const ratingChanged = pendingRating !== rating;
    const distanceChanged = pendingDistance !== distance;
    const numberChanged = pendingNumber !== numberDisplayed;
    const locationChanged =
      pendingLocation?.placeId !== selectedLocation?.placeId;

    return (
      categoryChanged ||
      ratingChanged ||
      distanceChanged ||
      numberChanged ||
      locationChanged
    );
  };

  const applyFilters = () => {
    setCategories(pendingCategories);
    setRating(pendingRating);
    setDistance(pendingDistance);
    setNumberDisplayed(pendingNumber);
    setSelectedLocation(pendingLocation);
  };

  const clearAllFilters = () => {
    setCategories([]);
    setPendingCategories([]);
    setRating("");
    setPendingRating("");
    setDistance("");
    setPendingDistance("");
    setNumberDisplayed("5");
    setPendingNumber("5");
    setSelectedLocation(null);
    setPendingLocation(null);
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
    if (isFocused) {
      preloadLists();
    }
  }, [isFocused]);

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

  useEffect(() => {
    if (!isFocused) return;

    const loadWinners = async () => {
      try {
        const winners = await getWinners();
        const pointers = winnersToPointers(winners);

        const upgraded = pointers.map((ptr: any) =>
          upgradeLikedEntry({
            id: ptr.id,
            name: ptr.name,
            address: ptr.address,
            source: ptr.source,
          })
        );

        setWinnersPool(upgraded);
      } catch (e) {
        console.error("Error loading winners:", e);
      }
    };

    loadWinners();
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

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const mapGoogleDetailsToRestaurant = (
    details: any,
    fallback?: Partial<HomeRestaurant>,
    userLocation?: { lat: number; lon: number }
  ): HomeRestaurant => {
    const primaryImage =
      Array.isArray(details?.photos) && details.photos.length > 0
        ? details.photos[0]
        : (fallback as any)?.image ?? (fallback as any)?.photo ?? null;

    let distanceMiles = null;
    if (userLocation && details?.geometry?.location) {
      distanceMiles = calculateDistance(
        userLocation.lat,
        userLocation.lon,
        details.geometry.location.lat,
        details.geometry.location.lng
      );
    } else if (typeof fallback?.distanceMiles === "number") {
      distanceMiles = fallback.distanceMiles;
    }

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
      distanceMiles,
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
          maxDistanceMiles: 10,
        })) || [];

      const limit = 10;
      const subset = results.slice(0, limit);

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
          return mapGoogleDetailsToRestaurant(
            details,
            {
              id: row.restaurant_id,
              name: row.restaurant_name,
              address: row.restaurant_address,
              source: "google",
            },
            location ?? undefined // ✅ Pass user location
          );
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
              return mapGoogleDetailsToRestaurant(
                details,
                {
                  id: ptr.id,
                  name: ptr.name,
                  address: ptr.address ?? "",
                  source: ptr.source,
                },
                location ?? undefined
              );
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

    if (key === "winners") {
      setShuffleLabel("Choose Your Winner");
      setPhase("eliminate");

      if (!winnersPool.length) {
        setRestaurants([]);
        setNoResults(true);
        return;
      }

      setRestaurants(winnersPool);
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
      setPhase("choose-source");
      return;
    }

    if (key === "surprise") {
      incrementShuffleCount();
      loadRandomNearbyRestaurants();
      return;
    }
  }

  const handleStartCollaborative = () => {
    setCollaborativeModalMode("host");
    setShowCollaborativeModal(true);
  };

  const handleJoinCollaborative = () => {
    setCollaborativeModalMode("join");
    setShowCollaborativeModal(true);
  };

  const handleSessionCreated = (sessionId: string, sessionCode: string) => {
    setActiveSessionId(sessionId);
    setCollaborativeMode(true);
    setIsHost(true);
    // Modal stays open showing "waiting for friend"
  };

  const handleSessionJoined = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setCollaborativeMode(true);
    setIsHost(false);
    setShowCollaborativeModal(false);

    Toast.show({
      type: "success",
      text1: "Joined session! 🎉",
      text2: "You can now shuffle together",
      position: "bottom",
    });
  };

  const handleExitCollaborative = async () => {
    if (activeSessionId) {
      // We'll add the actual leave function later
      console.log("Leaving session:", activeSessionId);
    }

    // Reset all collaborative state
    setActiveSessionId(null);
    setCollaborativeMode(false);
    setIsHost(false);
    setSessionParticipants([]);
    setSessionConnected(false);

    // Reset shuffle state
    setPhase("choose-source");
    setShuffleSource(null);
    setRestaurants([]);
    setWinner(null);

    Toast.show({
      type: "info",
      text1: "Left session",
      text2: "You've exited the collaborative shuffle",
      position: "bottom",
    });
  };

  const toggleListsExpand = () => {
    setListsExpanded((prev) => !prev);
    if (!listsExpanded) {
      setFiltersExpanded(false);
      setFavoritesExpanded(false);
      setLikedExpanded(false);
      setSurpriseExpanded(false);
    }
  };

  const toggleFiltersExpand = () => {
    setFiltersExpanded((prev) => !prev);
    if (!filtersExpanded) {
      setListsExpanded(false);
      setFavoritesExpanded(false);
      setLikedExpanded(false);
      setSurpriseExpanded(false);
      // Initialize pending states to current values
      setPendingCategories([...categories]);
      setPendingRating(rating);
      setPendingDistance(distance);
      setPendingNumber(numberDisplayed);
      setPendingLocation(selectedLocation);
    }
  };

  const toggleWinnersExpand = () => {
    setWinnersExpanded((prev) => !prev);
    if (!winnersExpanded) {
      setListsExpanded(false);
      setFiltersExpanded(false);
      setFavoritesExpanded(false);
      setLikedExpanded(false);
      setSurpriseExpanded(false);
    }
  };

  const toggleFavoritesExpand = () => {
    setFavoritesExpanded((prev) => !prev);
    if (!favoritesExpanded) {
      setListsExpanded(false);
      setFiltersExpanded(false);
      setLikedExpanded(false);
      setSurpriseExpanded(false);
    }
  };

  const toggleLikedExpand = () => {
    setLikedExpanded((prev) => !prev);
    if (!likedExpanded) {
      setListsExpanded(false);
      setFiltersExpanded(false);
      setFavoritesExpanded(false);
      setSurpriseExpanded(false);
    }
  };

  const toggleSurpriseExpand = () => {
    setSurpriseExpanded((prev) => !prev);
    if (!surpriseExpanded) {
      setListsExpanded(false);
      setFiltersExpanded(false);
      setFavoritesExpanded(false);
      setLikedExpanded(false);
    }
  };

  const handleListsSelected = async (
    listIds: string[],
    listNames: string[]
  ) => {
    setLoading(true);
    setNoResults(false);

    try {
      const merged = await loadRestaurantsFromLists(listIds, listNames);

      if (merged.length === 0) {
        setNoResults(true);
        Toast.show({
          type: "info",
          text1: "Empty Lists",
          text2: "The selected lists don't contain any restaurants yet.",
          position: "bottom",
        });
        setLoading(false);
        return;
      }

      setRestaurants(merged);
      setPhase("eliminate");
      incrementShuffleCount();
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

  const handleShuffle = async () => {
    // Use selected location or device location
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (selectedLocation) {
      latitude = selectedLocation.latitude;
      longitude = selectedLocation.longitude;
    } else if (location) {
      latitude = location.lat;
      longitude = location.lon;
    }

    if (!latitude || !longitude) {
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
      const maxDistance = distance ? Number(distance) : undefined;

      const results =
        (await fetchGoogleDiscovery({
          latitude,
          longitude,
          filters: categories,
          maxDistanceMiles: maxDistance,
        })) || [];

      const minRating = rating ? Number(rating) : 0;
      const filtered = results.filter((r) => {
        return (
          !minRating || (typeof r.rating === "number" && r.rating >= minRating)
        );
      });

      const limit = Number(numberDisplayed) || 10;
      const subset = filtered.slice(0, limit);

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

        // ✅ Save winner to storage
        addWinner(
          {
            id: remaining[0].id,
            name: remaining[0].name,
            address: remaining[0].address ?? null,
            source: remaining[0].source as "google" | "yelp",
          },
          shuffleSource || undefined
        ).catch((err) => console.error("Error saving winner:", err));

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
    setFiltersExpanded(false);
    setFavoritesExpanded(false);
    setLikedExpanded(false);
    setWinnersExpanded(false);
    setSurpriseExpanded(false);
    setWinner(null);
    resetAnimatedValues();
  };

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

  const renderListHeader = () => {
    if (restaurants.length === 0) return null;

    return (
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: theme.colors.background,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: theme.colors.onSurface + "99",
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Tap "Eliminate" to remove restaurants one by one. The last one
          standing is your winner!
        </Text>
      </View>
    );
  };

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

      {phase === "choose-source" && shuffleSource === null && (
        <ScrollView style={{ flex: 1 }}>
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                marginBottom: 6,
                color: theme.colors.tertiary,
                paddingHorizontal: 20,
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
                    activeOpacity={0.9}
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
            {/* Collaborative Session Banner (when active) */}
            {collaborativeMode && (
              <Surface
                style={{
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 16,
                  marginTop: 8,
                  backgroundColor: theme.colors.primary + "15",
                }}
                elevation={2}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="account-multiple"
                      size={28}
                      color={theme.colors.tertiary}
                    />
                    <View>
                      <Text
                        style={{
                          color: theme.colors.onTertiaryContainer,
                          fontWeight: "700",
                          fontSize: 16,
                        }}
                      >
                        Shuffling Together
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.onTertiaryContainer,
                          fontSize: 13,
                          marginTop: 2,
                        }}
                      >
                        {sessionParticipants.length} participant
                        {sessionParticipants.length !== 1 ? "s" : ""}
                        {sessionConnected ? " • Connected" : " • Connecting..."}
                      </Text>
                    </View>
                  </View>

                  <Button
                    mode="text"
                    icon="close"
                    onPress={handleExitCollaborative}
                    textColor={theme.colors.tertiary}
                    compact
                    style={{
                      backgroundColor: theme.colors.tertiary + "20",
                      borderRadius: 20,
                    }}
                  >
                    Close
                  </Button>
                </View>
              </Surface>
            )}
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.onSurface + "99",
                marginTop: 16,
                paddingHorizontal: 20,
              }}
            >
              {collaborativeMode
                ? "Choose options together, then shuffle to find your winner!"
                : "Pick your category, then eliminate restaurants one by one to find your winner!"}
            </Text>
            {/* Session Selector - Only show when NOT in collaborative mode */}
            {!collaborativeMode && (
              <View style={{ paddingHorizontal: 20 }}>
                <ShuffleSessionSelector
                  onStartCollaborative={handleStartCollaborative}
                  onJoinSession={handleJoinCollaborative}
                />
              </View>
            )}
            {/* <Text
              style={{
                fontSize: 14,
                color: theme.colors.onSurface + "99",
                marginBottom: 16,
              }}
            >
              {collaborativeMode
                ? "Choose options together, then shuffle to find your winner!"
                : "Pick your category, then eliminate restaurants one by one to find your winner!"}
            </Text> */}
            {/* FAVORITES */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleFavoritesExpand}
              style={[
                styles.sourceCard,
                {
                  backgroundColor: "transparent",
                  borderBottomColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 20,
                }}
              >
                {/* Left - Icon */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: theme.colors.tertiary + "20",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="heart"
                      size={24}
                      color={theme.colors.tertiary}
                    />
                  </View>

                  {/* Middle - Text */}
                  <View style={{ flex: 1 }}>
                    <Text style={dyn.sourceText(theme)}>Favorites</Text>
                  </View>
                </View>

                {/* Right - Arrow */}
                <MaterialCommunityIcons
                  name={favoritesExpanded ? "chevron-down" : "chevron-right"}
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>

              {favoritesExpanded && (
                <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.onSurface + "99",
                      marginBottom: 16,
                      lineHeight: 20,
                    }}
                  >
                    Shuffle from all your favorited restaurants. We'll load your
                    complete favorites collection for you to eliminate down to
                    your winner.
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => handleSelectSource("favorites")}
                    loading={loading && shuffleSource === "favorites"}
                    disabled={loading}
                    style={[
                      { borderRadius: 25 },
                      {
                        backgroundColor: theme.colors.primary + "15",
                        borderColor: theme.colors.primary,
                        borderWidth: 1,
                      },
                    ]}
                    labelStyle={{ color: theme.colors.onSecondaryContainer }}
                    contentStyle={{ paddingVertical: 4 }}
                  >
                    Shuffle Now
                  </Button>
                </View>
              )}
            </TouchableOpacity>
            {/* LIKED */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleLikedExpand}
              style={[
                styles.sourceCard,
                {
                  backgroundColor: "transparent",
                  borderBottomColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 20,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: theme.colors.primary + "20",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="thumb-up"
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>

                  {/* Middle - Text */}
                  <View style={{ flex: 1 }}>
                    <Text style={dyn.sourceText(theme)}>Liked</Text>
                  </View>
                </View>

                {/* Right - Arrow */}
                <MaterialCommunityIcons
                  name={likedExpanded ? "chevron-down" : "chevron-right"}
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>

              {likedExpanded && (
                <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.onSurface + "99",
                      marginBottom: 16,
                      lineHeight: 20,
                    }}
                  >
                    Shuffle from all restaurants you've liked while swiping.
                    Perfect for revisiting places you were interested in before.
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => handleSelectSource("liked")}
                    loading={loading && shuffleSource === "liked"}
                    disabled={loading}
                    style={[
                      { borderRadius: 25 },
                      {
                        backgroundColor: theme.colors.primary + "15",
                        borderColor: theme.colors.primary,
                        borderWidth: 1,
                      },
                    ]}
                    labelStyle={{ color: theme.colors.onSecondaryContainer }}
                    contentStyle={{ paddingVertical: 4 }}
                  >
                    Shuffle Now
                  </Button>
                </View>
              )}
            </TouchableOpacity>
            {/* LISTS */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleListsExpand}
              style={[
                styles.sourceCard,
                {
                  backgroundColor: "transparent",
                  borderBottomColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 20,
                }}
              >
                {/* Left - Icon */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: theme.colors.secondary + "20",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="format-list-bulleted"
                      size={24}
                      color={theme.colors.secondary}
                    />
                  </View>

                  {/* Middle - Text */}
                  <View style={{ flex: 1 }}>
                    <Text style={dyn.sourceText(theme)}>Lists</Text>
                  </View>
                </View>

                {/* Right - Arrow */}
                <MaterialCommunityIcons
                  name={listsExpanded ? "chevron-down" : "chevron-right"}
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>

              {listsExpanded && (
                <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.onSurface + "99",
                      marginBottom: 12,
                      lineHeight: 20,
                    }}
                  >
                    Select one or more of your custom lists to shuffle from. All
                    restaurants from the selected lists will be combined for
                    elimination.
                  </Text>
                  <ScrollView
                    style={{ maxHeight: 300 }}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {preloadedLists.map((item) => {
                      const listColor = item.selected
                        ? theme.colors.primary
                        : theme.colors.tertiary;

                      return (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          key={item.id}
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
                            alignItems: "center",
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            marginBottom: 8,
                            borderRadius: 12,
                            backgroundColor: item.selected
                              ? theme.colors.primaryContainer
                              : "transparent",
                            borderWidth: 1,
                            borderColor: item.selected
                              ? theme.colors.primary
                              : theme.colors.outlineVariant,
                          }}
                        >
                          {/* Left - Icon */}
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              justifyContent: "center",
                              alignItems: "center",
                              marginRight: 12,
                              backgroundColor: item.selected
                                ? listColor
                                : listColor + "20",
                            }}
                          >
                            <MaterialCommunityIcons
                              name={
                                item.selected
                                  ? "check-circle"
                                  : "silverware-fork-knife"
                              }
                              size={24}
                              color={
                                item.selected ? "#fff" : theme.colors.tertiary
                              }
                            />
                          </View>

                          {/* Middle - List info */}
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 15,
                                color: theme.colors.onSurface,
                                fontWeight: item.selected ? "600" : "500",
                                marginBottom: 2,
                              }}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                color: theme.colors.onSurfaceVariant,
                              }}
                            >
                              {item.placesCount ?? 0} place
                              {item.placesCount === 1 ? "" : "s"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {preloadedLists.length > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 12,
                      }}
                    >
                      <Button
                        mode="outlined"
                        onPress={() =>
                          setPreloadedLists((prev) =>
                            prev.map((x) => ({ ...x, selected: false }))
                          )
                        }
                        contentStyle={{ paddingVertical: 4 }}
                        style={{
                          flex: 1,
                          borderRadius: 25,
                          borderColor: theme.colors.error,
                          marginRight: 6,
                        }}
                        textColor={theme.colors.error}
                      >
                        Clear Lists
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => {
                          const chosen = preloadedLists.filter(
                            (x) => x.selected
                          );
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
                        style={[
                          { flex: 1, borderRadius: 25 },
                          {
                            backgroundColor: theme.colors.primary + "15",
                            borderColor: theme.colors.primary,
                            borderWidth: 1,
                          },
                        ]}
                        labelStyle={{
                          color: theme.colors.onSecondaryContainer,
                        }}
                        contentStyle={{ paddingVertical: 4 }}
                      >
                        Shuffle Now
                      </Button>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
            {/* PREVIOUS WINNERS */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleWinnersExpand}
              style={[
                styles.sourceCard,
                {
                  backgroundColor: "transparent",
                  borderBottomColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 20,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: theme.colors.secondary + "20",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="trophy"
                      size={24}
                      color={theme.colors.secondary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={dyn.sourceText(theme)}>Previous Winners</Text>
                  </View>
                </View>

                <MaterialCommunityIcons
                  name={winnersExpanded ? "chevron-down" : "chevron-right"}
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>

              {winnersExpanded && (
                <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.onSurface + "99",
                      marginBottom: 16,
                      lineHeight: 20,
                    }}
                  >
                    Shuffle from all your past winners! Every time you complete
                    a shuffle, the winning restaurant is automatically saved
                    here for easy access.
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => handleSelectSource("winners")}
                    loading={loading && shuffleSource === "winners"}
                    disabled={loading}
                    style={[
                      { borderRadius: 25 },
                      {
                        backgroundColor: theme.colors.primary + "15",
                        borderColor: theme.colors.primary,
                        borderWidth: 1,
                      },
                    ]}
                    labelStyle={{ color: theme.colors.onSecondaryContainer }}
                    contentStyle={{ paddingVertical: 4 }}
                  >
                    Shuffle Now
                  </Button>
                </View>
              )}
            </TouchableOpacity>
            {/* FILTERS - EXPANDABLE */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleFiltersExpand}
              style={[
                styles.sourceCard,
                {
                  backgroundColor: "transparent",
                  borderBottomColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 20,
                }}
              >
                {/* Left - Icon */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: theme.colors.tertiary + "20",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="filter-variant"
                      size={24}
                      color={theme.colors.tertiary}
                    />
                  </View>

                  {/* Middle - Text */}
                  <View style={{ flex: 1 }}>
                    <Text style={dyn.sourceText(theme)}>Filters</Text>
                  </View>
                </View>

                {/* Right - Arrow */}
                <MaterialCommunityIcons
                  name={filtersExpanded ? "chevron-down" : "chevron-right"}
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>

              {filtersExpanded && (
                <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.onSurface + "99",
                      marginBottom: 16,
                      lineHeight: 20,
                    }}
                  >
                    Customize your shuffle with specific categories, ratings,
                    location, distance, and number of restaurants. Fine-tune
                    your search to find exactly what you're craving.
                  </Text>
                  {/* Categories */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.colors.onSurface,
                        marginBottom: 8,
                      }}
                    >
                      Categories
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 16 }}
                    >
                      <View style={{ gap: 6 }}>
                        {/* First Row */}
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          {CATEGORY_OPTIONS.slice(
                            0,
                            Math.ceil(CATEGORY_OPTIONS.length / 2)
                          ).map((opt) => {
                            const selected = pendingCategories.includes(
                              opt.value
                            );
                            return (
                              <Chip
                                key={opt.value}
                                mode={selected ? "flat" : "outlined"}
                                style={filterChipStyle(selected)}
                                textStyle={filterChipTextStyle(selected)}
                                onPress={() =>
                                  setPendingCategories((prev) =>
                                    prev.includes(opt.value)
                                      ? prev.filter((v) => v !== opt.value)
                                      : [...prev, opt.value]
                                  )
                                }
                              >
                                {opt.label}
                              </Chip>
                            );
                          })}
                        </View>

                        {/* Second Row */}
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          {CATEGORY_OPTIONS.slice(
                            Math.ceil(CATEGORY_OPTIONS.length / 2)
                          ).map((opt) => {
                            const selected = pendingCategories.includes(
                              opt.value
                            );
                            return (
                              <Chip
                                key={opt.value}
                                mode={selected ? "flat" : "outlined"}
                                style={filterChipStyle(selected)}
                                textStyle={filterChipTextStyle(selected)}
                                onPress={() =>
                                  setPendingCategories((prev) =>
                                    prev.includes(opt.value)
                                      ? prev.filter((v) => v !== opt.value)
                                      : [...prev, opt.value]
                                  )
                                }
                              >
                                {opt.label}
                              </Chip>
                            );
                          })}
                        </View>
                      </View>
                    </ScrollView>
                  </View>

                  {/* Rating */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.colors.onSurface,
                        marginBottom: 8,
                      }}
                    >
                      Rating
                    </Text>
                    <View
                      style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}
                    >
                      {[
                        { label: "Any", value: "" },
                        { label: "3★+", value: "3" },
                        { label: "3.5★+", value: "3.5" },
                        { label: "4★+", value: "4" },
                        { label: "4.5★+", value: "4.5" },
                      ].map((opt) => {
                        const selected = pendingRating === opt.value;
                        return (
                          <Chip
                            key={opt.value}
                            mode={selected ? "flat" : "outlined"}
                            style={filterChipStyle(selected)}
                            textStyle={filterChipTextStyle(selected)}
                            onPress={() => setPendingRating(opt.value)}
                          >
                            {opt.label}
                          </Chip>
                        );
                      })}
                    </View>
                  </View>

                  {/* Location */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.colors.onSurface,
                        marginBottom: 8,
                      }}
                    >
                      Location
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowLocationSelector(true)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: pendingLocation
                          ? theme.colors.primary
                          : theme.colors.outlineVariant,
                        backgroundColor: pendingLocation
                          ? theme.colors.primaryContainer
                          : "transparent",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flex: 1,
                        }}
                      >
                        <IconButton
                          icon={
                            pendingLocation
                              ? "map-marker"
                              : "map-marker-outline"
                          }
                          size={20}
                          iconColor={
                            pendingLocation
                              ? theme.colors.primary
                              : theme.colors.onSurfaceVariant
                          }
                          style={{ margin: 0 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            color: pendingLocation
                              ? theme.colors.primary
                              : theme.colors.onSurface,
                            fontWeight: pendingLocation ? "600" : "400",
                            marginLeft: 4,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {pendingLocation
                            ? pendingLocation.name
                            : "Current Location"}
                        </Text>
                      </View>
                      <IconButton
                        icon="chevron-right"
                        size={20}
                        iconColor={theme.colors.onSurfaceVariant}
                        style={{ margin: 0 }}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Distance */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.colors.onSurface,
                        marginBottom: 8,
                      }}
                    >
                      Distance
                    </Text>
                    <View
                      style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}
                    >
                      {[
                        { label: "Any", value: "" },
                        { label: "≤1 mi", value: "1" },
                        { label: "≤3 mi", value: "3" },
                        { label: "≤5 mi", value: "5" },
                        { label: "≤10 mi", value: "10" },
                      ].map((opt) => {
                        const selected = pendingDistance === opt.value;
                        return (
                          <Chip
                            key={opt.value}
                            mode={selected ? "flat" : "outlined"}
                            style={filterChipStyle(selected)}
                            textStyle={filterChipTextStyle(selected)}
                            onPress={() => setPendingDistance(opt.value)}
                          >
                            {opt.label}
                          </Chip>
                        );
                      })}
                    </View>
                  </View>

                  {/* Number of Restaurants */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.colors.onSurface,
                        marginBottom: 8,
                      }}
                    >
                      Number of Restaurants
                    </Text>
                    <View
                      style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}
                    >
                      {[
                        { label: "3", value: "3" },
                        { label: "5", value: "5" },
                        { label: "7", value: "7" },
                        { label: "10", value: "10" },
                      ].map((opt) => {
                        const selected = pendingNumber === opt.value;
                        return (
                          <Chip
                            key={opt.value}
                            mode={selected ? "flat" : "outlined"}
                            style={filterChipStyle(selected)}
                            textStyle={filterChipTextStyle(selected)}
                            onPress={() => setPendingNumber(opt.value)}
                          >
                            {opt.label}
                          </Chip>
                        );
                      })}
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 8,
                      marginRight: 14,
                    }}
                  >
                    <Button
                      mode="outlined"
                      onPress={clearAllFilters}
                      style={{
                        flex: 1,
                        borderRadius: 25,
                        borderColor: theme.colors.error,
                      }}
                      contentStyle={{ paddingVertical: 4 }}
                      textColor={theme.colors.error}
                    >
                      Clear Filters
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={async () => {
                        applyFilters();
                        await handleShuffle();
                      }}
                      style={[
                        { flex: 1, borderRadius: 25 },
                        {
                          backgroundColor: theme.colors.primary + "15",
                          borderColor: theme.colors.primary,
                          borderWidth: 1,
                        },
                      ]}
                      labelStyle={{ color: theme.colors.onSecondaryContainer }}
                      contentStyle={{ paddingVertical: 4 }}
                    >
                      {loading ? "Shuffling..." : "Shuffle Now"}
                    </Button>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            {/* SURPRISE ME */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleSurpriseExpand}
              style={[
                styles.sourceCard,
                {
                  backgroundColor: "transparent",
                  borderBottomColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 20,
                }}
              >
                {/* Left - Icon */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: theme.colors.primary + "20",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="shimmer"
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>

                  {/* Middle - Text */}
                  <View style={{ flex: 1 }}>
                    <Text style={dyn.sourceText(theme)}>Surprise Me</Text>
                  </View>
                </View>

                {/* Right - Arrow */}
                <MaterialCommunityIcons
                  name={surpriseExpanded ? "chevron-down" : "chevron-right"}
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>

              {surpriseExpanded && (
                <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.onSurface + "99",
                      marginBottom: 16,
                      lineHeight: 20,
                    }}
                  >
                    Feeling adventurous? We'll pick 10 random restaurants near
                    you within a 10-mile radius. Great for discovering new
                    places!
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => handleSelectSource("surprise")}
                    loading={loading && shuffleSource === "surprise"}
                    disabled={loading}
                    style={[
                      { borderRadius: 25 },
                      {
                        backgroundColor: theme.colors.primary + "15",
                        borderColor: theme.colors.primary,
                        borderWidth: 1,
                      },
                    ]}
                    labelStyle={{ color: theme.colors.onSecondaryContainer }}
                    contentStyle={{ paddingVertical: 4 }}
                  >
                    Shuffle Now
                  </Button>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ELIMINATION MODE */}
      {phase === "eliminate" && (
        <View style={{ flex: 1 }}>
          {renderHeaderWithBack()}

          {noResults && restaurants.length === 0 ? (
            <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
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
            <View style={{ paddingHorizontal: 20 }}>
              {Array.from({ length: parseInt(numberDisplayed) || 10 }).map(
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
              ListHeaderComponent={renderListHeader}
              renderItem={({ item }) => {
                const isFavorite = favoriteIds.has(item.id);
                const imageUrl = getCardImage(item);
                const animValue = getAnimatedValue(item.id);
                const photos =
                  Array.isArray(item.photos) && item.photos.length > 0
                    ? item.photos
                    : imageUrl
                    ? [imageUrl]
                    : [
                        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png",
                      ];

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
                        },
                      ]}
                    >
                      <View style={{ position: "relative" }}>
                        <Image
                          source={{ uri: photos[0] }}
                          style={styles.cardImage}
                          resizeMode="cover"
                        />

                        <LinearGradient
                          colors={["transparent", "rgba(0,0,0,0.6)"]}
                          style={StyleSheet.absoluteFillObject}
                        />

                        {/* QuickActionsMenu overlay */}
                        <View
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            zIndex: 20,
                          }}
                          pointerEvents="box-none"
                        >
                          <QuickActionsMenu
                            restaurant={item}
                            isFavorite={isFavorite}
                            onFavoriteChange={refreshFavoriteIds}
                            onCreateNewList={() => {}}
                            preloadedLists={listsCache}
                            listsReady={listsLoaded}
                          />
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <Text
                          style={[
                            styles.cardTitle,
                            { color: theme.colors.onSurface },
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>

                        <View style={styles.metaRow}>
                          {item.rating != null &&
                            typeof item.rating === "number" && (
                              <Text
                                style={[
                                  styles.metaText,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {`⭐ ${item.rating.toFixed(1)}`}
                              </Text>
                            )}

                          {item.reviewCount != null && (
                            <Text
                              style={[
                                styles.metaText,
                                { color: theme.colors.onSurface + "99" },
                              ]}
                            >
                              {`(${item.reviewCount} reviews)`}
                            </Text>
                          )}

                          {item.price != null && (
                            <Text
                              style={[
                                styles.metaText,
                                { color: theme.colors.onSurface + "99" },
                              ]}
                            >
                              {`• ${item.price}`}
                            </Text>
                          )}
                        </View>

                        {(item.isOpen !== null ||
                          (item.hours && item.hours.length > 0)) && (
                          <View style={styles.hoursRow}>
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

                        {item.address && (
                          <Text
                            style={[
                              styles.detail,
                              { color: theme.colors.onSurface + "99" },
                            ]}
                          >
                            {formatAddress(item.address)}
                          </Text>
                        )}

                        {item.distanceMiles != null && (
                          <Text
                            style={[
                              styles.detail,
                              { color: theme.colors.onSurface + "99" },
                            ]}
                          >
                            {`${item.distanceMiles.toFixed(2)} mi away`}
                          </Text>
                        )}

                        <View style={styles.linkRow}>
                          <Button
                            mode="outlined"
                            icon="google-maps"
                            textColor={theme.colors.primary}
                            style={[
                              styles.linkButton,
                              { borderColor: theme.colors.primary },
                            ]}
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
                            style={[
                              styles.linkButton,
                              { borderColor: theme.colors.tertiary },
                            ]}
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

                        {!winner && (
                          <Button
                            mode="contained"
                            onPress={() => handleEliminate(item.id)}
                            buttonColor={theme.colors.error}
                            textColor="#fff"
                            style={{
                              marginTop: 12,
                              borderRadius: 25,
                            }}
                            icon="close-circle-outline"
                          >
                            Eliminate
                          </Button>
                        )}
                      </View>
                    </Card>
                  </Animated.View>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Modals */}
      <LocationSelector
        visible={showLocationSelector}
        onDismiss={() => setShowLocationSelector(false)}
        onLocationSelected={(location) => {
          setPendingLocation(location);
        }}
        currentLocation={pendingLocation}
        onOpenMapPicker={() => setShowMapPicker(true)}
      />

      <MapLocationPicker
        visible={showMapPicker}
        onDismiss={() => setShowMapPicker(false)}
        onLocationSelected={(location) => {
          setPendingLocation(location);
        }}
        initialLocation={
          pendingLocation
            ? {
                latitude: pendingLocation.latitude,
                longitude: pendingLocation.longitude,
              }
            : selectedLocation
            ? {
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }
            : undefined
        }
      />

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
          setFiltersExpanded(false);
          setFavoritesExpanded(false);
          setLikedExpanded(false);
          setSurpriseExpanded(false);
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

                <View style={{ gap: 12, marginTop: 8 }}>
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
      <CollaborativeModal
        visible={showCollaborativeModal}
        onDismiss={() => {
          setShowCollaborativeModal(false);
          setCollaborativeModalMode(null);
        }}
        mode={collaborativeModalMode}
        onSessionCreated={handleSessionCreated}
        onSessionJoined={handleSessionJoined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  shuffleCounterContainer: {
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  shuffleCounterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
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
    borderRadius: 0,
    overflow: "hidden",
    elevation: 3,
    marginHorizontal: 0,
  },
  cardImage: {
    width: "100%",
    height: CARD_PHOTO_HEIGHT,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  metaText: { fontSize: 14, marginRight: 6 },
  detail: { fontSize: 13, marginBottom: 3 },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },
  linkButton: { flex: 1, borderRadius: 25 },
  sourceCard: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    marginBottom: 0,
    elevation: 0,
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
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: surface,
    borderColor: theme.colors.outlineVariant,
  }),

  sourceText: (theme: MD3Theme) => ({
    fontSize: 17,
    fontWeight: "600" as const,
    color: theme.colors.onSurface,
  }),

  expandArrow: (theme: MD3Theme) => ({
    fontSize: 18,
    color: theme.colors.tertiary,
  }),
};
