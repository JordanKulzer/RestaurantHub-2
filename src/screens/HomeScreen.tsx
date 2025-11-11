import React, {
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import {
  View,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  UIManager,
  Easing,
  StyleSheet as RNStyleSheet,
} from "react-native";
import {
  Button,
  IconButton,
  Text,
  Portal,
  Surface,
  useTheme,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Swiper from "react-native-deck-swiper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { fetchYelpRestaurants } from "../utils/yelpApi";
import HomeSkeleton from "../components/HomeSkeleton";
import {
  RestaurantDetailModal,
  HomeSwipeCard,
  DropdownModal,
} from "../components";
import { CATEGORY_OPTIONS } from "../constants/categoryType";

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
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [distanceFilter, setDistanceFilter] = useState<string>("any");
  const [allSwiped, setAllSwiped] = useState(false);
  const [lastSwiped, setLastSwiped] = useState<Restaurant | null>(null);
  const [rewindCard, setRewindCard] = useState<Restaurant | null>(null);
  const [rewindDir, setRewindDir] = useState<"left" | "right">("left");
  const [isRewinding, setIsRewinding] = useState(false);

  const slideAnim = useRef(new Animated.Value(-300)).current;
  const dimAnim = useRef(new Animated.Value(0)).current;
  const swiperRef = useRef<Swiper<Restaurant>>(null);
  const swiperAnim = useRef(new Animated.Value(1)).current;
  const rewindAnim = useRef(new Animated.Value(0)).current;
  const [lastSwipedIndex, setLastSwipedIndex] = useState<number | null>(null);

  const useScaleOnPress = () => {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () =>
      Animated.spring(scale, { toValue: 0.85, useNativeDriver: true }).start();
    const onPressOut = () =>
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    return { scale, onPressIn, onPressOut };
  };

  useEffect(() => {
    const init = async () => {
      await loadRestaurants();
      const saved = await AsyncStorage.getItem("likedRestaurants");
      if (saved) setLiked(JSON.parse(saved));
    };
    init();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      AsyncStorage.setItem("likedRestaurants", JSON.stringify(liked));
    }, 400);
    return () => clearTimeout(timer);
  }, [liked]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row" }}>
          <IconButton
            icon="filter-variant"
            onPress={toggleFilters}
            accessibilityLabel="Open filters"
            iconColor={theme.colors.tertiary}
          />
        </View>
      ),
    });
  }, [navigation, theme]);

  const toggleFilters = useCallback(() => {
    if (showFilters) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dimAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setShowFilters(false));
    } else {
      setShowFilters(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(dimAnim, {
          toValue: 0.5,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showFilters]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      setAllSwiped(false);
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

  // --- swipe buttons ---
  const UndoButton = () => {
    const { scale, onPressIn, onPressOut } = useScaleOnPress();
    const handleUndo = () => {
      if (lastSwipedIndex === null || !restaurants[lastSwipedIndex]) return;
      const rewindTarget = restaurants[lastSwipedIndex];
      setRewindCard(rewindTarget);
      setIsRewinding(true);
      rewindAnim.setValue(0);
      Animated.timing(rewindAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start(() => {
        swiperRef.current?.swipeBack();
        setTimeout(() => {
          setRewindCard(null);
          setIsRewinding(false);
        }, 100);
      });
    };
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <IconButton
          icon="undo"
          size={36}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          mode="contained"
          onPress={handleUndo}
          style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
          iconColor="#fff"
        />
      </Animated.View>
    );
  };

  const DislikeButton = () => {
    const { scale, onPressIn, onPressOut } = useScaleOnPress();
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <IconButton
          icon="close"
          size={52}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          mode="contained"
          onPress={() => swiperRef.current?.swipeLeft()}
          style={[
            styles.actionBtn,
            { backgroundColor: theme.colors.secondary },
          ]}
          iconColor="#fff"
        />
      </Animated.View>
    );
  };

  const LikeButton = () => {
    const { scale, onPressIn, onPressOut } = useScaleOnPress();
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <IconButton
          icon="heart"
          size={52}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          mode="contained"
          onPress={() => swiperRef.current?.swipeRight()}
          style={[styles.actionBtn, { backgroundColor: theme.colors.tertiary }]}
          iconColor="#fff"
        />
      </Animated.View>
    );
  };

  return (
    <>
      <Animated.View
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        {loading ? (
          <HomeSkeleton />
        ) : restaurants.length === 0 ? (
          <View style={styles.empty}>
            <Icon
              name="emoticon-sad-outline"
              size={48}
              color={theme.colors.outline}
            />
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.onSurface + "AA" },
              ]}
            >
              No restaurants found nearby
            </Text>
          </View>
        ) : allSwiped ? (
          <View style={styles.empty}>
            <Icon name="refresh" size={48} color={theme.colors.outline} />
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.onSurface + "AA" },
              ]}
            >
              No more restaurants nearby
            </Text>
            <Button
              mode="contained"
              onPress={loadRestaurants}
              buttonColor={theme.colors.secondary}
              textColor="#fff"
            >
              Refresh
            </Button>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.swiperContainer,
              {
                opacity: isRewinding ? 0 : 1,
                transform: [{ scale: swiperAnim }],
              },
            ]}
          >
            {!isRewinding && (
              <Swiper
                ref={swiperRef}
                cards={restaurants}
                renderCard={(r) => <HomeSwipeCard restaurant={r} />}
                onSwipedRight={(idx) => {
                  if (restaurants[idx]) {
                    setLastSwiped(restaurants[idx]);
                    setRewindDir("right");
                    setLastSwipedIndex(idx);
                    setLiked((prev) =>
                      prev.some((f) => f.id === restaurants[idx].id)
                        ? prev
                        : [...prev, restaurants[idx]]
                    );
                  }
                }}
                onSwipedLeft={(idx) => {
                  if (restaurants[idx]) {
                    setLastSwiped(restaurants[idx]);
                    setRewindDir("left");
                    setLastSwipedIndex(idx);
                  }
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
            )}
          </Animated.View>
        )}

        {rewindCard && (
          <Animated.View
            key={rewindCard.id}
            style={[
              styles.rewindCard,
              {
                transform: [
                  {
                    translateX: rewindAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [rewindDir === "left" ? -400 : 400, 0],
                    }),
                  },
                  {
                    rotate: rewindAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        rewindDir === "left" ? "-10deg" : "10deg",
                        "0deg",
                      ],
                    }),
                  },
                ],
                opacity: rewindAnim,
              },
            ]}
          >
            <HomeSwipeCard restaurant={rewindCard} />
          </Animated.View>
        )}

        {!loading && !allSwiped && restaurants.length > 0 && (
          <View style={styles.actionBar}>
            <DislikeButton />
            <UndoButton />
            <LikeButton />
          </View>
        )}
      </Animated.View>

      {/* Filter modal */}
      <Portal>
        {showFilters && (
          <TouchableWithoutFeedback onPress={toggleFilters}>
            <View style={RNStyleSheet.absoluteFillObject}>
              <Animated.View
                style={[
                  RNStyleSheet.absoluteFillObject,
                  { backgroundColor: "black", opacity: dimAnim },
                ]}
              />
              <BlurView intensity={70} tint="light" style={styles.blurOverlay}>
                <Animated.View
                  style={[
                    styles.animatedContainer,
                    { transform: [{ translateY: slideAnim }] },
                  ]}
                >
                  <Surface
                    style={[
                      styles.filterBar,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <View style={styles.filterRow}>
                      <DropdownModal
                        label="Categories"
                        options={CATEGORY_OPTIONS}
                        value={filters}
                        onChange={setFilters}
                        multiSelect
                      />
                      <DropdownModal
                        label="Rating"
                        options={[
                          { label: "All", value: "all" },
                          { label: "4★+", value: "4" },
                          { label: "4.5★+", value: "4.5" },
                        ]}
                        value={ratingFilter}
                        onChange={(val) => setRatingFilter(val)}
                      />
                      <DropdownModal
                        label="Distance"
                        options={[
                          { label: "Any", value: "any" },
                          { label: "≤1 mi", value: "1" },
                          { label: "≤3 mi", value: "3" },
                          { label: "≤5 mi", value: "5" },
                        ]}
                        value={distanceFilter}
                        onChange={(val) => setDistanceFilter(val)}
                      />
                    </View>

                    <Button
                      mode="contained"
                      icon="check"
                      compact
                      onPress={() => {
                        toggleFilters();
                        loadRestaurants();
                      }}
                      buttonColor={theme.colors.secondary}
                      textColor="#fff"
                      style={styles.applyButton}
                    >
                      Apply
                    </Button>
                  </Surface>
                </Animated.View>
              </BlurView>
            </View>
          </TouchableWithoutFeedback>
        )}
      </Portal>

      <RestaurantDetailModal
        visible={showDetails}
        onDismiss={() => setShowDetails(false)}
        restaurant={selectedRestaurant}
      />
    </>
  );
}

const styles = StyleSheet.create({
  blurOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 100,
  },
  animatedContainer: { width: "95%" },
  filterBar: {
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  applyButton: {
    alignSelf: "center",
    marginTop: 10,
    borderRadius: 25,
    paddingHorizontal: 30,
  },
  empty: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    marginVertical: 12,
    textAlign: "center",
  },
  swiperContainer: { flex: 1 },
  actionBar: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    zIndex: 50,
  },
  actionBtn: { elevation: 6 },
  rewindCard: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
});
