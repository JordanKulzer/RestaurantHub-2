import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Platform,
  UIManager,
  Easing,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  Button,
  Chip,
  IconButton,
  Modal,
  Portal,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Swiper from "react-native-deck-swiper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as Location from "expo-location";
import { fetchYelpRestaurants } from "../utils/yelpApi";
import HomeSkeleton from "../components/HomeSkeleton";
import {
  RestaurantDetailModal,
  HomeSwipeCard,
  AddToListMenu,
  RestaurantOptionsMenu,
} from "../components";
import { CATEGORY_OPTIONS } from "../constants/categoryType";
import { SafeAreaView } from "react-native-safe-area-context";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Restaurant {
  id: string;
  name: string;
  image?: string;
  rating?: number;
  price?: string;
  reviews?: number;
  address?: string;
  categories?: string;
  phone?: string;
  yelpUrl?: string;
  isOpen?: boolean;
  distanceMiles?: string;
}

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [liked, setLiked] = useState<Restaurant[]>([]);

  const [showChips, setShowChips] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "category" | "rating" | "location" | "distance" | null
  >(null);
  const [addToListModalVisible, setAddToListModalVisible] = useState(false);
  const [filters, setFilters] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [distanceFilter, setDistanceFilter] = useState<string>("any");
  const [allSwiped, setAllSwiped] = useState(false);
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const swiperRef = useRef<Swiper<Restaurant>>(null);
  const [lastSwipedIndex, setLastSwipedIndex] = useState<number | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(
    null
  );

  const animateFadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700, // ⬆️ slightly longer for smoother transition
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // smoother easing curve
      useNativeDriver: true,
    }).start();
  };

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      setAllSwiped(false);
      setCurrentCardIndex(0);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("⚠️ Location permission not granted");
        setLoading(false);
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = coords;

      const results = await fetchYelpRestaurants(
        latitude,
        longitude,
        "restaurants",
        filters
      );

      const filtered = results.filter((r: Restaurant) => {
        const meetsRating =
          ratingFilter === "all" || (r.rating ?? 0) >= parseFloat(ratingFilter);
        const meetsDistance =
          distanceFilter === "any" ||
          parseFloat(r.distanceMiles ?? "0") <= parseFloat(distanceFilter);
        return meetsRating && meetsDistance;
      });
      setRestaurants(filtered.sort(() => Math.random() - 0.5));
      animateFadeIn();
    } catch (err) {
      console.error("❌ Error fetching Yelp restaurants:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadRestaurants();
      const saved = await AsyncStorage.getItem("likedRestaurants");
      if (saved) setLiked(JSON.parse(saved));
    };
    init();
  }, []);

  const renderModal = (type: string) => (
    <Portal>
      <Modal
        visible={activeModal === type}
        onDismiss={() => setActiveModal(null)}
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
            style={{ maxHeight: 360 }} // gives space for footer, keeps it visible
          >
            {type === "category" && (
              <View style={styles.chipGrid}>
                {CATEGORY_OPTIONS.map((opt) => {
                  const selected = filters.includes(opt.value);
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
                        setFilters((prev) =>
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
                  const selected = ratingFilter === opt.value;
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
                      onPress={() => setRatingFilter(opt.value)}
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
                ].map((opt) => {
                  const selected = distanceFilter === opt.value;
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
                      onPress={() => setDistanceFilter(opt.value)}
                    >
                      {opt.label}
                    </Chip>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <Button
              mode="contained"
              onPress={async () => {
                setActiveModal(null);
                await loadRestaurants();
              }}
              buttonColor={theme.colors.secondary}
              textColor="#fff"
              style={styles.modalBtnApply}
            >
              Apply
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                if (type === "category") setFilters([]);
                else if (type === "rating") setRatingFilter("all");
                else if (type === "distance") setDistanceFilter("any");
                else if (type === "location") console.log("Location cleared");
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

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <View
        style={{
          paddingHorizontal: 16,
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
              color: theme.colors.primary,
              letterSpacing: 0.5,
            }}
          >
            FoodFinder
          </Text>
          {currentRestaurant && (
            <View
            // style={{ position: "absolute", top: 20, right: 20, zIndex: 99 }}
            >
              <RestaurantOptionsMenu
                restaurant={currentRestaurant}
                isFavorite={liked.some((f) => f.id === currentRestaurant.id)}
                onToggleFavorite={(r) => {
                  setLiked((prev) =>
                    prev.some((f) => f.id === r.id)
                      ? prev.filter((f) => f.id !== r.id)
                      : [...prev, r]
                  );
                }}
                onCreateNewList={() => console.log("🆕 Create new list")}
              />
            </View>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {["Clear Filters", "Category", "Rating", "Location", "Distance"].map(
            (label) => {
              const isActive =
                (label === "Category" && filters.length > 0) ||
                (label === "Rating" && ratingFilter !== "all") ||
                (label === "Distance" && distanceFilter !== "any") ||
                (label === "Location" && activeModal === "location");

              const backgroundColor =
                label === "Clear Filters"
                  ? theme.colors.errorContainer || "#fce4e4"
                  : isActive
                  ? theme.colors.primary
                  : "transparent";

              const textColor =
                label === "Clear Filters"
                  ? theme.colors.error || "#b00020"
                  : isActive
                  ? "#fff"
                  : theme.colors.primary;

              const handlePress = async () => {
                if (label === "Clear Filters") {
                  setFilters([]);
                  setRatingFilter("all");
                  setDistanceFilter("any");
                  setActiveModal(null);
                  await loadRestaurants();
                  return;
                }
                setActiveModal(label.toLowerCase() as any);
              };

              return (
                <Chip
                  key={label}
                  mode="outlined"
                  style={[
                    styles.chip,
                    {
                      borderColor: theme.colors.primary,
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
                  {label}
                </Chip>
              );
            }
          )}
        </ScrollView>
      </View>

      <Animated.View
        style={{
          flex: 1,
          marginTop: 10,
          marginBottom: 120,
          opacity: fadeAnim,
          transform: [
            {
              scale: fadeAnim.interpolate({
                inputRange: [0, 0.6, 1],
                outputRange: [0.96, 0.985, 1],
              }),
            },
          ],
        }}
      >
        <Swiper
          ref={swiperRef}
          cards={restaurants}
          renderCard={(r, index) => {
            return r ? (
              <HomeSwipeCard
                key={r.id}
                restaurant={r}
                onLike={() => swiperRef.current?.swipeRight()}
                onDislike={() => swiperRef.current?.swipeLeft()}
                onUndo={() => swiperRef.current?.swipeBack()}
              />
            ) : null;
          }}
          onSwiped={(index) => {
            setCurrentRestaurant(restaurants[index + 1] ?? null);
            setCurrentCardIndex(index + 1);
          }}
          onSwipedAll={() => {
            setCurrentRestaurant(null);
            setAllSwiped(true);
          }}
          onSwipedAborted={() =>
            setCurrentRestaurant(restaurants[currentCardIndex])
          }
          backgroundColor="transparent"
          stackSize={2}
          verticalSwipe={false}
          animateCardOpacity
          cardVerticalMargin={0}
          containerStyle={{ flex: 1 }}
          cardStyle={{ height: "100%" }}
        />
      </Animated.View>

      {renderModal("category")}
      {renderModal("rating")}
      {renderModal("location")}
      {renderModal("distance")}
      <RestaurantDetailModal
        visible={showDetails}
        onDismiss={() => setShowDetails(false)}
        restaurant={selectedRestaurant}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chipScrollContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingBottom: 80, // extra space so last chips aren't hidden behind buttons
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
    gap: 6,
    alignItems: "center",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
  },
  chip: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingRight: 10,
  },
  modalContainer: {
    marginTop: "auto",
    marginHorizontal: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    paddingBottom: 0,
  },
  modalInner: {
    flexGrow: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
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
});
