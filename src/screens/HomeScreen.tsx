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
  AddToListModal,
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

  const swiperRef = useRef<Swiper<Restaurant>>(null);
  const [lastSwipedIndex, setLastSwipedIndex] = useState<number | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateFilterToggle = () => {
    Animated.spring(slideAnim, {
      toValue: showChips ? 0 : 1,
      friction: 6,
      tension: 80,
      useNativeDriver: false,
    }).start();
    setShowChips(!showChips);
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
      const searchTerm = filters.length > 0 ? filters.join(" ") : "restaurants";
      const results = await fetchYelpRestaurants(
        latitude,
        longitude,
        searchTerm
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
        <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
          {type === "category"
            ? "Select Categories"
            : type === "rating"
            ? "Select Rating"
            : type === "location"
            ? "Choose Location"
            : "Select Distance"}
        </Text>

        {type === "category" && (
          <View style={styles.chipGrid}>
            {CATEGORY_OPTIONS.slice(0, 12).map((opt) => {
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
                    color: selected ? "#fff" : theme.colors.onSurfaceVariant,
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
              { label: "All", value: "all" },
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
                    color: selected ? "#fff" : theme.colors.onSurfaceVariant,
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
                    color: selected ? "#fff" : theme.colors.onSurfaceVariant,
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

        {type === "location" && (
          <View
            style={{
              height: 160,
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 12,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Icon name="map-marker" size={48} color={theme.colors.primary} />
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
            >
              Drop a pin here (placeholder)
            </Text>
          </View>
        )}

        <View style={styles.modalButtons}>
          <Button
            mode="contained"
            onPress={async () => {
              setActiveModal(null);
              await loadRestaurants();
            }}
            buttonColor={theme.colors.secondary}
            textColor="#fff"
            style={{ borderRadius: 25, flex: 1, marginRight: 8 }}
          >
            Apply
          </Button>
          <Button
            mode="outlined"
            onPress={() => {
              if (type === "category") setFilters([]);
              else if (type === "rating") setRatingFilter("all");
              else if (type === "distance") setDistanceFilter("any");
              else if (type === "location") {
                console.log("Location filter cleared");
              }
            }}
            textColor={theme.colors.onSurface}
            style={{ borderRadius: 25, flex: 1 }}
          >
            Clear
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      {/* --- Filter Header --- */}
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
          <IconButton
            icon="plus-circle-outline"
            size={26}
            iconColor={theme.colors.primary}
            onPress={() => setAddToListModalVisible(true)}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {["Category", "Rating", "Location", "Distance"].map((label) => {
            const isActive =
              (label === "Category" && filters.length > 0) ||
              (label === "Rating" && ratingFilter !== "all") ||
              (label === "Distance" && distanceFilter !== "any") ||
              (label === "Location" && activeModal === "location");

            const backgroundColor = isActive
              ? theme.colors.primary
              : "transparent";
            const textColor = isActive ? "#fff" : theme.colors.primary;

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
                onPress={() => setActiveModal(label.toLowerCase() as any)}
              >
                {label}
              </Chip>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1, marginTop: 10, marginBottom: 120 }}>
        <Swiper
          ref={swiperRef}
          cards={restaurants}
          renderCard={(r) =>
            r ? (
              <HomeSwipeCard
                key={`card-${r.id}-${currentCardIndex}`}
                restaurant={r}
                onLike={() => swiperRef.current?.swipeRight()}
                onDislike={() => swiperRef.current?.swipeLeft()}
                onUndo={() => swiperRef.current?.swipeBack()}
              />
            ) : null
          }
          onSwiped={(index) => {
            setCurrentCardIndex(index + 1);
          }}
          onSwipedAll={() => setAllSwiped(true)}
          backgroundColor="transparent"
          stackSize={2}
          verticalSwipe={false}
          animateCardOpacity
          cardVerticalMargin={0}
          containerStyle={{ flex: 1 }}
          cardStyle={{ height: "100%" }}
        />
      </View>

      {/* --- Modals --- */}
      {renderModal("category")}
      {renderModal("rating")}
      {renderModal("location")}
      {renderModal("distance")}
      <RestaurantDetailModal
        visible={showDetails}
        onDismiss={() => setShowDetails(false)}
        restaurant={selectedRestaurant}
      />

      <AddToListModal
        visible={addToListModalVisible}
        onDismiss={() => setAddToListModalVisible(false)}
        restaurant={selectedRestaurant}
        onAddToLiked={(r) => {
          setLiked((prev) => [...prev, r]);
          console.log("✅ Added to liked:", r.name);
        }}
        onAddToExistingList={(r) => {
          console.log("🗂️ Add to existing list:", r.name);
        }}
        onCreateNewList={(r) => {
          console.log("🆕 Create new list with:", r.name);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
});
