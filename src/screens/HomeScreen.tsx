import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Platform,
  UIManager,
  Easing,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  Button,
  Chip,
  Modal,
  Portal,
  Text,
  useTheme,
  ProgressBar,
} from "react-native-paper";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Swiper from "react-native-deck-swiper";
import {
  RestaurantDetailModal,
  HomeSwipeCard,
  QuickActionsMenu,
  UpgradeModal,
  HomeSkeleton,
  CreateListModal,
} from "../components";
import LocationSelector, { LocationData } from "../components/LocationSelector";
import MapLocationPicker from "../components/MapLocationPicker";
import { CATEGORY_OPTIONS } from "../constants/categoryType";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchGoogleDiscovery } from "../utils/fetchGoogleDiscovery";
import { HomeRestaurant } from "../types/homeRestaurant";
import { getFavorites } from "../utils/favoritesApis";
import { fetchRestaurantInfo } from "../utils/fetchRestaurantInfo";
import { RestaurantCard } from "../types/restaurant";
import { getLocationCached } from "../utils/locationHelper";
import { getLists } from "../utils/listsApi";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FREE_DAILY_SWIPES = 10;

export default function HomeScreen() {
  const theme = useTheme();
  const [restaurants, setRestaurants] = useState<HomeRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [liked, setLiked] = useState<HomeRestaurant[]>([]);

  const [showChips, setShowChips] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "category" | "rating" | "distance" | null
  >(null);
  const [addToListModalVisible, setAddToListModalVisible] = useState(false);

  // Active filters (currently applied)
  const [filters, setFilters] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [distanceFilter, setDistanceFilter] = useState<string>("any");

  // Pending filters (staged but not applied yet)
  const [pendingFilters, setPendingFilters] = useState<string[]>([]);
  const [pendingRatingFilter, setPendingRatingFilter] = useState<string>("all");
  const [pendingDistanceFilter, setPendingDistanceFilter] =
    useState<string>("any");
  const [pendingLocation, setPendingLocation] = useState<LocationData | null>(
    null
  );

  const [allSwiped, setAllSwiped] = useState(false);
  const swiperRef = useRef<Swiper<HomeRestaurant>>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [createListVisible, setCreateListVisible] = useState(false);
  const [pendingListCallback, setPendingListCallback] = useState<
    null | ((l: any) => void)
  >(null);

  const [currentRestaurant, setCurrentRestaurant] =
    useState<HomeRestaurant | null>(null);
  const [favoritesIds, setFavoritesIds] = useState<Set<string>>(new Set());
  const [initialLoad, setInitialLoad] = useState(true);
  const hasLoadedOnce = useRef(false);

  // Swipe tracking
  const [swipeCount, setSwipeCount] = useState(0);
  const [lastResetDate, setLastResetDate] = useState<string>("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // ✅ Preload lists data for QuickActionsMenu
  const [listsCache, setListsCache] = useState<any[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);

  // Location selector
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null
  );
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const isFocused = useIsFocused();

  // ✅ Preload lists when screen is focused
  useEffect(() => {
    if (isFocused) {
      preloadLists();
    }
  }, [isFocused]);

  const preloadLists = async () => {
    try {
      const data = await getLists();
      setListsCache(data);
      setListsLoaded(true);
    } catch (e) {
      console.error("❌ Failed to preload lists:", e);
    }
  };

  // Check and reset daily swipe count
  useEffect(() => {
    const checkDailyReset = async () => {
      await AsyncStorage.multiRemove(["swipeCount", "lastResetDate"]); // Uncomment for resetting swipe counts

      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem("lastResetDate");
      const storedCount = await AsyncStorage.getItem("swipeCount");

      if (stored !== today) {
        // New day - reset counter
        setSwipeCount(0);
        setLastResetDate(today);
        await AsyncStorage.setItem("lastResetDate", today);
        await AsyncStorage.setItem("swipeCount", "0");
      } else {
        const parsed = parseInt(storedCount || "0", 10);
        const safe = Math.min(parsed, FREE_DAILY_SWIPES);
        setSwipeCount(safe);
        setLastResetDate(today);
      }
    };

    checkDailyReset();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("likedRestaurants", JSON.stringify(liked)).catch(
      (err) => console.error("Failed to persist likedRestaurants:", err)
    );
  }, [liked]);

  useEffect(() => {
    const init = async () => {
      await loadRestaurants();
      const saved = await AsyncStorage.getItem("likedRestaurants");
      if (saved) setLiked(JSON.parse(saved));
    };
    init();

    // Initialize pending states to match actual filters
    setPendingFilters([...filters]);
    setPendingRatingFilter(ratingFilter);
    setPendingDistanceFilter(distanceFilter);
    setPendingLocation(selectedLocation);
  }, []);

  const animateFadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();
  };

  const handleLike = (restaurant: HomeRestaurant) => {
    setLiked((prev) => {
      if (prev.some((x) => x.id === restaurant.id)) return prev;
      return [...prev, restaurant];
    });
  };

  // Check if there are pending filter changes
  const hasPendingChanges = () => {
    const categoryChanged =
      JSON.stringify(pendingFilters.sort()) !== JSON.stringify(filters.sort());
    const ratingChanged = pendingRatingFilter !== ratingFilter;
    const distanceChanged = pendingDistanceFilter !== distanceFilter;
    const locationChanged =
      pendingLocation?.placeId !== selectedLocation?.placeId;

    return (
      categoryChanged || ratingChanged || distanceChanged || locationChanged
    );
  };

  const applyFilters = async () => {
    // Apply all pending filters
    setFilters(pendingFilters);
    setRatingFilter(pendingRatingFilter);
    setDistanceFilter(pendingDistanceFilter);

    // Check if location changed
    const locationChanged =
      pendingLocation?.placeId !== selectedLocation?.placeId;
    setSelectedLocation(pendingLocation);

    // If location didn't change, manually reload
    // (useEffect will handle reload if location changed)
    if (!locationChanged) {
      await loadRestaurants();
    }
  };

  const clearAllFilters = async () => {
    setFilters([]);
    setPendingFilters([]);
    setRatingFilter("all");
    setPendingRatingFilter("all");
    setDistanceFilter("any");
    setPendingDistanceFilter("any");
    setSelectedLocation(null);
    setPendingLocation(null);
    setActiveModal(null);
    await loadRestaurants();
  };

  const incrementSwipeCount = async () => {
    const newCount = Math.min(swipeCount + 1, FREE_DAILY_SWIPES);

    if (!isPremium && newCount > FREE_DAILY_SWIPES) {
      setShowUpgradeModal(true);
      return;
    }

    setSwipeCount(newCount);
    await AsyncStorage.setItem("swipeCount", newCount.toString());

    if (!isPremium && newCount === FREE_DAILY_SWIPES) {
      setShowUpgradeModal(true);
    }
  };

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      setAllSwiped(false);
      setCurrentCardIndex(0);

      let latitude: number | null = null;
      let longitude: number | null = null;

      // Use selected location if available, otherwise get device location
      if (selectedLocation) {
        latitude = selectedLocation.latitude;
        longitude = selectedLocation.longitude;
        console.log(
          "🎯 Using selected location:",
          selectedLocation.name,
          latitude,
          longitude
        );
      } else {
        try {
          const loc = await getLocationCached();
          latitude = loc.latitude;
          longitude = loc.longitude;
          console.log("📍 Using device location:", latitude, longitude);
        } catch (e) {
          console.warn("⚠️ Could not get location:", e);
        }
      }

      if (latitude == null || longitude == null) {
        console.error("❌ No location available");
        return;
      }

      const results = await fetchGoogleDiscovery({
        latitude,
        longitude,
        filters,
        maxDistanceMiles:
          distanceFilter === "any" ? undefined : parseFloat(distanceFilter),
      });

      // ✅ IMPROVED: Only filter by rating (distance is already handled by API radius)
      const filtered = results.filter((r) => {
        const ratingValue = Number(r.rating);
        const ratingMin = parseFloat(ratingFilter);
        const meetsRating =
          ratingFilter === "all" ||
          (!isNaN(ratingValue) && ratingValue >= ratingMin);

        return meetsRating;
      });

      const enriched = await Promise.all(
        filtered.map(async (r) => {
          const details = await fetchRestaurantInfo(r.source, r.id);
          const safeDetails: Partial<RestaurantCard> = details ?? {};

          const fallbackImg =
            r.image ||
            "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png";
          return {
            ...r,
            ...safeDetails,
            distanceMiles: r.distanceMiles,

            photos:
              Array.isArray(safeDetails.photos) && safeDetails.photos.length > 0
                ? safeDetails.photos
                : Array.isArray(r.photos) && r.photos.length > 0
                ? r.photos
                : [fallbackImg],

            rating: safeDetails.rating ?? r.rating,
            reviewCount: safeDetails.reviewCount ?? r.reviewCount,
            price: safeDetails.price ?? r.price,
            address: safeDetails.address ?? r.address,
            yelpUrl: safeDetails.yelpUrl ?? r.yelpUrl,
            googleMapsUrl: safeDetails.googleMapsUrl ?? r.googleMapsUrl,
            hours: safeDetails.hours ?? [],
            isOpen: safeDetails.isOpen ?? null,
          };
        })
      );

      setRestaurants(enriched);
      setCurrentRestaurant(enriched[0] ?? null);

      if (!hasLoadedOnce.current) {
        animateFadeIn();
        setInitialLoad(false);
        hasLoadedOnce.current = true;
      }
    } catch (err) {
      console.error("❌ Error loading Google restaurants:", err);
      console.error(
        "Stack trace:",
        err instanceof Error ? err.stack : "No stack"
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshFavorites = useCallback(async () => {
    try {
      const favs = await getFavorites();
      setFavoritesIds(new Set(favs.map((f) => f.id)));
    } catch (e) {
      console.error("Failed to load favorites:", e);
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    refreshFavorites();
  }, [isFocused, refreshFavorites]);

  // ✅ Reload restaurants when location changes
  useEffect(() => {
    if (hasLoadedOnce.current) {
      loadRestaurants();
    }
  }, [selectedLocation]); // Reload when selectedLocation changes

  const renderModal = (type: string) => (
    <Portal>
      <Modal
        visible={activeModal === type}
        onDismiss={() => {
          setActiveModal(null);
          // Don't auto-apply - let user click "Apply Filters"
        }}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View
          style={{
            maxHeight: 500,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
          }}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <Text
              style={[styles.modalTitle, { color: theme.colors.onSurface }]}
            >
              {type === "category"
                ? "Select Categories"
                : type === "rating"
                ? "Select Rating"
                : type === "location"
                ? "Choose Location"
                : "Select Distance"}
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator
            contentContainerStyle={[
              styles.modalScrollContent,
              { paddingBottom: 24 },
            ]}
            style={{ maxHeight: 360 }}
          >
            {type === "category" && (
              <View style={styles.chipGrid}>
                {CATEGORY_OPTIONS.map((opt) => {
                  const selected = pendingFilters.includes(opt.value);
                  return (
                    <Chip
                      key={opt.value}
                      mode={selected ? "flat" : "outlined"}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? theme.colors.primary
                            : "transparent",
                        },
                      ]}
                      textStyle={{
                        color: selected
                          ? "#fff"
                          : theme.colors.onSurfaceVariant,
                        fontWeight: "500",
                      }}
                      onPress={() =>
                        setPendingFilters((prev) =>
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
            )}

            {type === "rating" && (
              <View style={styles.chipRow}>
                {[
                  { label: "Any", value: "all" },
                  { label: "3★+", value: "3" },
                  { label: "3.5★+", value: "3.5" },
                  { label: "4★+", value: "4" },
                  { label: "4.5★+", value: "4.5" },
                ].map((opt) => {
                  const selected = pendingRatingFilter === opt.value;
                  return (
                    <Chip
                      key={opt.value}
                      mode={selected ? "flat" : "outlined"}
                      style={[
                        //  styles.chip,
                        {
                          backgroundColor: selected
                            ? theme.colors.primary
                            : "transparent",
                        },
                      ]}
                      textStyle={{
                        color: selected
                          ? "#fff"
                          : theme.colors.onSurfaceVariant,
                        fontWeight: "500",
                      }}
                      onPress={() => setPendingRatingFilter(opt.value)}
                    >
                      {opt.label}
                    </Chip>
                  );
                })}
              </View>
            )}

            {type === "distance" && (
              <View style={styles.chipRow}>
                {[
                  { label: "Any", value: "any" },
                  { label: "≤1 mi", value: "1" },
                  { label: "≤3 mi", value: "3" },
                  { label: "≤5 mi", value: "5" },
                  { label: "≤10 mi", value: "10" },
                ].map((opt) => {
                  const selected = pendingDistanceFilter === opt.value;
                  return (
                    <Chip
                      key={opt.value}
                      mode={selected ? "flat" : "outlined"}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? theme.colors.primary
                            : "transparent",
                        },
                      ]}
                      textStyle={{
                        color: selected
                          ? "#fff"
                          : theme.colors.onSurfaceVariant,
                        fontWeight: "500",
                      }}
                      onPress={() => setPendingDistanceFilter(opt.value)}
                    >
                      {opt.label}
                    </Chip>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              mode="contained"
              onPress={() => {
                setActiveModal(null);
                // Changes are pending - user needs to tap "Apply Filters"
              }}
              buttonColor={theme.colors.secondary}
              textColor="#fff"
              style={styles.modalBtnApply}
            >
              Done
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                if (type === "category") setPendingFilters([]);
                else if (type === "rating") setPendingRatingFilter("all");
                else if (type === "distance") setPendingDistanceFilter("any");
              }}
              textColor={theme.colors.onSurface}
              style={styles.modalBtnClear}
            >
              Clear
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );

  const handleOpenCreateList = (onCreatedCallback?: (newList: any) => void) => {
    setPendingListCallback(() => onCreatedCallback || null);
    setCreateListVisible(true);
  };

  // ✅ Refresh lists cache after creating a new list
  const handleListCreated = async (newList: any) => {
    setCreateListVisible(false);
    await preloadLists(); // Refresh the cache

    if (pendingListCallback) {
      pendingListCallback(newList);
      setPendingListCallback(null);
    }
  };

  const swipesRemaining = Math.max(0, FREE_DAILY_SWIPES - swipeCount);

  const showSwipeCounter = !isPremium && swipesRemaining <= 10;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            backgroundColor: theme.colors.background,
            zIndex: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: theme.colors.tertiary,
                letterSpacing: 0.5,
              }}
            >
              FoodFinder
            </Text>
          </View>

          {showSwipeCounter && (
            <View style={styles.swipeCounterContainer}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text
                  style={[
                    styles.swipeCounterText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {swipesRemaining} swipes remaining today
                </Text>
                <TouchableOpacity onPress={() => setShowUpgradeModal(true)}>
                  <Text
                    style={{ color: theme.colors.primary, fontWeight: "600" }}
                  >
                    Upgrade ✨
                  </Text>
                </TouchableOpacity>
              </View>
              <ProgressBar
                progress={swipeCount / FREE_DAILY_SWIPES}
                color={
                  swipesRemaining <= 3
                    ? theme.colors.error
                    : theme.colors.primary
                }
                style={{ height: 6, borderRadius: 3 }}
              />
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {/* Apply Filters chip - shows when there are pending changes */}
            {hasPendingChanges() && (
              <Chip
                mode="flat"
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.primary,
                    marginRight: 8,
                  },
                ]}
                textStyle={{
                  color: "#fff",
                  fontWeight: "700",
                }}
                icon="check"
                onPress={applyFilters}
              >
                Apply Filters
              </Chip>
            )}

            {[
              "Clear Filters",
              "Category",
              "Rating",
              "Location",
              "Distance",
            ].map((label) => {
              const isActive =
                (label === "Category" && filters.length > 0) ||
                (label === "Rating" && ratingFilter !== "all") ||
                (label === "Distance" && distanceFilter !== "any") ||
                (label === "Location" && selectedLocation !== null);

              const backgroundColor =
                label === "Clear Filters"
                  ? theme.colors.errorContainer || "#fce4e4"
                  : isActive
                  ? theme.colors.tertiary
                  : "transparent";

              const textColor =
                label === "Clear Filters"
                  ? theme.colors.error || "#b00020"
                  : isActive
                  ? "#fff"
                  : theme.colors.tertiary;

              const handlePress = async () => {
                if (label === "Clear Filters") {
                  clearAllFilters();
                  return;
                }

                // Initialize pending states to current values when opening modal
                if (label === "Category") {
                  setPendingFilters([...filters]);
                } else if (label === "Rating") {
                  setPendingRatingFilter(ratingFilter);
                } else if (label === "Distance") {
                  setPendingDistanceFilter(distanceFilter);
                } else if (label === "Location") {
                  setPendingLocation(selectedLocation);
                  setShowLocationSelector(true);
                  return;
                }

                setActiveModal(label.toLowerCase() as any);
              };

              // Show location name if selected
              const displayLabel =
                label === "Location" && selectedLocation
                  ? selectedLocation.name
                  : label;

              return (
                <Chip
                  key={label}
                  mode="outlined"
                  style={[
                    styles.chip,
                    {
                      borderColor: theme.colors.tertiary,
                      backgroundColor,
                      marginRight: 8,
                    },
                  ]}
                  textStyle={{
                    color: textColor,
                    fontWeight: "600",
                  }}
                  onPress={handlePress}
                >
                  {displayLabel}
                </Chip>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ flex: 1, marginTop: 10, marginBottom: 120 }}>
          {loading ? (
            <View style={{ flex: 1 }}>
              <HomeSkeleton />
            </View>
          ) : allSwiped || restaurants.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 32,
              }}
            >
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🍽️</Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: theme.colors.onSurface,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                You've seen all restaurants!
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: theme.colors.onSurface + "99",
                  marginBottom: 24,
                  textAlign: "center",
                }}
              >
                Adjust your filters or expand your search radius to discover
                more places
              </Text>

              <Button
                mode="contained"
                onPress={clearAllFilters}
                buttonColor={theme.colors.primary}
                style={{
                  marginBottom: 12,
                  borderRadius: 25,
                  paddingHorizontal: 16,
                }}
              >
                Clear Filters & Reload
              </Button>

              <Button
                mode="outlined"
                onPress={() => {
                  setPendingDistanceFilter(distanceFilter);
                  setActiveModal("distance");
                }}
                textColor={theme.colors.tertiary}
                style={{
                  borderRadius: 25,
                  paddingHorizontal: 16,
                  borderColor: theme.colors.tertiary,
                }}
              >
                Expand Search Area
              </Button>
            </View>
          ) : (
            <Animated.View
              style={{
                flex: 1,
                opacity: initialLoad ? fadeAnim : 1,
                transform: initialLoad
                  ? [
                      {
                        scale: fadeAnim.interpolate({
                          inputRange: [0, 0.6, 1],
                          outputRange: [0.96, 0.985, 1],
                        }),
                      },
                    ]
                  : [],
              }}
            >
              <Swiper
                ref={swiperRef}
                cards={restaurants}
                renderCard={(r, index) => {
                  if (!r) return null;
                  return (
                    <HomeSwipeCard
                      key={r.id}
                      restaurant={r}
                      isFavorite={favoritesIds.has(r.id)}
                      onFavoriteChange={refreshFavorites}
                      onCreateNewList={handleOpenCreateList}
                      preloadedLists={listsCache}
                      listsReady={listsLoaded}
                      onLike={() => {
                        if (!isPremium && swipesRemaining === 0) {
                          setShowUpgradeModal(true);
                          return;
                        }
                        swiperRef.current?.swipeRight();
                      }}
                      onDislike={() => {
                        if (!isPremium && swipesRemaining === 0) {
                          setShowUpgradeModal(true);
                          return;
                        }
                        swiperRef.current?.swipeLeft();
                      }}
                      onUndo={() => {
                        swiperRef.current?.swipeBack();
                      }}
                    />
                  );
                }}
                onSwiped={(index) => {
                  incrementSwipeCount();
                  setCurrentRestaurant(restaurants[index + 1] ?? null);
                  setCurrentCardIndex(index + 1);
                }}
                onSwipedRight={(index) => {
                  const r = restaurants[index];
                  if (r) handleLike(r);
                }}
                onSwipedAll={() => {
                  setCurrentRestaurant(null);
                  setAllSwiped(true);
                }}
                onSwipedAborted={() =>
                  setCurrentRestaurant(restaurants[currentCardIndex])
                }
                disableLeftSwipe={!isPremium && swipesRemaining === 0}
                disableRightSwipe={!isPremium && swipesRemaining === 0}
                backgroundColor="transparent"
                stackSize={2}
                verticalSwipe={false}
                animateCardOpacity
                cardVerticalMargin={0}
                containerStyle={{ flex: 1 }}
                cardStyle={{ height: "100%" }}
              />
            </Animated.View>
          )}
        </View>

        {renderModal("category")}
        {renderModal("rating")}
        {renderModal("distance")}
        <LocationSelector
          visible={showLocationSelector}
          onDismiss={() => setShowLocationSelector(false)}
          onLocationSelected={(location) => {
            setPendingLocation(location);
            // Don't apply immediately - wait for "Apply Filters"
          }}
          currentLocation={pendingLocation}
          onOpenMapPicker={() => setShowMapPicker(true)}
        />
        <MapLocationPicker
          visible={showMapPicker}
          onDismiss={() => setShowMapPicker(false)}
          onLocationSelected={(location) => {
            setPendingLocation(location);
            // Don't apply immediately - wait for "Apply Filters"
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
          visible={showUpgradeModal}
          onDismiss={() => setShowUpgradeModal(false)}
          freeLimit={FREE_DAILY_SWIPES}
        />
        <RestaurantDetailModal
          visible={showDetails}
          onDismiss={() => setShowDetails(false)}
          restaurant={selectedRestaurant}
        />
        <CreateListModal
          visible={createListVisible}
          onDismiss={() => setCreateListVisible(false)}
          onCreated={handleListCreated}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  filterBar: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#00000015",
  },
  chipScrollContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingBottom: 80,
  },
  modalButtonsSticky: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    alignItems: "center",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    marginTop: 8,
  },
  chip: {
    // borderRadius: 18,
    // borderWidth: StyleSheet.hairlineWidth,
  },
  chipScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  modalContainer: {
    marginTop: "auto",
    marginHorizontal: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    paddingBottom: 0,
  },
  modalHeader: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
    backgroundColor: "white",
  },
  modalBtnApply: {
    borderRadius: 25,
    flex: 1,
    marginRight: 8,
  },
  modalBtnClear: {
    borderRadius: 25,
    flex: 1,
  },
  swipeCounterContainer: {
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  swipeCounterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  featureList: {
    width: "100%",
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  upgradeButton: {
    width: "100%",
    borderRadius: 25,
    paddingVertical: 4,
  },
  upgradePill: {
    borderRadius: 999,
    height: 34,
  },
  resetNote: {
    fontSize: 12,
    marginTop: 16,
    textAlign: "center",
  },
});
