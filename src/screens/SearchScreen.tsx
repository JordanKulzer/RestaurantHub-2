// src/screens/SearchScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Keyboard,
  Linking,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  Appbar,
  Searchbar,
  Card,
  Button,
  useTheme,
  Text,
  Chip,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import { fetchTextSearch, fetchRestaurantDetails } from "../utils/placesApi";
import { CATEGORY_OPTIONS } from "../constants/categoryType";
import RestaurantDetailModal from "../components/RestaurantDetailModal";
import HomeSkeleton from "../components/HomeSkeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import QuickActionsMenu from "../components/QuickActionsMenu";
import { CreateListModal } from "../components";
import { getLists } from "../utils/listsApi";
import { getFavorites } from "../utils/favoritesApis";

const CARD_PHOTO_HEIGHT = 280;

export default function SearchScreen({ navigation }: any) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [listsCache, setListsCache] = useState<any[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [createListVisible, setCreateListVisible] = useState(false);
  const [pendingListCallback, setPendingListCallback] = useState<
    null | ((l: any) => void)
  >(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  const chipStyle = (selected: boolean) => ({
    borderColor: theme.colors.tertiary,
    backgroundColor: selected ? theme.colors.tertiary : "transparent",
    marginRight: 8,
  });

  const chipTextStyle = (selected: boolean) => ({
    color: selected ? "#fff" : theme.colors.tertiary,
    fontWeight: "600" as const,
  });

  const clearChipStyle = {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorContainer,
    marginRight: 8,
  };

  const clearChipTextStyle = {
    color: theme.colors.error,
    fontWeight: "600" as const,
  };

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
  useEffect(() => {
    if (isFocused) {
      preloadLists();
      refreshFavorites();
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

  const refreshFavorites = useCallback(async () => {
    try {
      const favs = await getFavorites();
      setFavoriteIds(new Set(favs.map((f) => f.id)));
    } catch (e) {
      console.error("❌ Failed to load favorites:", e);
    }
  }, []);

  const handleOpenCreateList = (onCreatedCallback?: (newList: any) => void) => {
    setPendingListCallback(() => onCreatedCallback || null);
    setCreateListVisible(true);
  };

  const handleListCreated = async (newList: any) => {
    setCreateListVisible(false);
    await preloadLists();

    if (pendingListCallback) {
      pendingListCallback(newList);
      setPendingListCallback(null);
    }
  };

  useEffect(() => {
    if (!loading && results.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [loading, results]);

  const handleInputChange = (text: string) => {
    setQuery(text);

    if (text.trim().length === 0) {
      setResults([]);
      setSelectedCategory(null);
    }
  };

  const handleSearch = async (q?: string) => {
    const text = q || query;
    if (!text.trim()) return;

    setLoading(true);

    try {
      const data = await fetchTextSearch(text);
      setResults(data);
    } catch (err) {
      console.error("❌ Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setResults([]);
      setQuery("");
      return;
    }

    setSelectedCategory(category);
    setQuery(category);
    setLoading(true);

    try {
      const data = await fetchTextSearch(category);
      setResults(data);
    } catch (err) {
      console.error("❌ Category search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (placeId: string) => {
    Keyboard.dismiss();
    try {
      const details = await fetchRestaurantDetails(placeId);
      setSelectedRestaurant(details);
      setModalVisible(true);
    } catch (err) {
      console.error("❌ Detail fetch error:", err);
    }
  };

  const showEmptyState =
    !loading && results.length === 0 && query.trim().length === 0;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <LinearGradient
          colors={
            theme.dark
              ? [theme.colors.background, theme.colors.surface]
              : [theme.colors.surface, theme.colors.background]
          }
          style={StyleSheet.absoluteFill}
        />

        <Appbar.Header
          mode="small"
          elevated
          statusBarHeight={undefined}
          style={[
            styles.appbar,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.outline,
            },
          ]}
        >
          <View style={styles.searchbarContainer}>
            <Searchbar
              placeholder="Search restaurants"
              value={query}
              onChangeText={handleInputChange}
              onSubmitEditing={() => handleSearch()}
              style={[
                styles.searchbar,
                {
                  height: 34,
                  paddingVertical: 0,
                  backgroundColor: theme.colors.background,
                },
              ]}
              inputStyle={{
                fontSize: 15,
                color: theme.colors.onSurface,
                height: 30,
                paddingVertical: 0,
                marginVertical: -2,
              }}
              iconColor={theme.colors.primary}
              placeholderTextColor={theme.colors.onSurface + "88"}
            />
          </View>
          <Appbar.Action
            icon="microphone"
            onPress={() => {}}
            color={theme.colors.primary}
          />
        </Appbar.Header>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 40,
          }}
          style={{ maxHeight: 125 }}
        >
          <View style={{ flexDirection: "column", gap: 2 }}>
            <View style={{ flexDirection: "row" }}>
              <Chip
                mode="outlined"
                style={[clearChipStyle]}
                textStyle={clearChipTextStyle}
                onPress={() => {
                  setSelectedCategory(null);
                  setQuery("");
                  setResults([]);
                }}
              >
                Clear Filters
              </Chip>
              {CATEGORY_OPTIONS.slice(
                0,
                Math.ceil(CATEGORY_OPTIONS.length / 2)
              ).map((opt) => {
                const isSelected = selectedCategory === opt.value;
                return (
                  <Chip
                    key={opt.value}
                    mode="outlined"
                    style={chipStyle(isSelected)}
                    textStyle={chipTextStyle(isSelected)}
                    onPress={() => handleCategorySelect(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                );
              })}
            </View>

            <View style={{ flexDirection: "row" }}>
              {CATEGORY_OPTIONS.slice(
                Math.ceil(CATEGORY_OPTIONS.length / 2)
              ).map((opt) => {
                const isSelected = selectedCategory === opt.value;
                return (
                  <Chip
                    key={opt.value}
                    mode="outlined"
                    style={chipStyle(isSelected)}
                    textStyle={chipTextStyle(isSelected)}
                    onPress={() => handleCategorySelect(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {showEmptyState && (
            <View style={styles.emptyState}>
              <Text
                style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
              >
                Find your next favorite spot
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: theme.colors.onSurface + "99" },
                ]}
              >
                Search by cuisine, restaurant name, or vibe.
              </Text>
            </View>
          )}

          {loading && (
            <View style={{ paddingHorizontal: 0 }}>
              <HomeSkeleton />
            </View>
          )}

          {!loading && results.length > 0 && (
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollArea}
                renderItem={({ item }) => {
                  const photos = item.photo
                    ? [item.photo]
                    : [
                        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png",
                      ];

                  return (
                    <Card
                      mode="elevated"
                      style={[
                        styles.card,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      {/* Image with gradient overlay and QuickActionsMenu */}
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

                        {/* QuickActionsMenu overlay on top-right */}
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
                            isFavorite={favoriteIds.has(item.id)}
                            onFavoriteChange={refreshFavorites}
                            onCreateNewList={handleOpenCreateList}
                            preloadedLists={listsCache}
                            listsReady={listsLoaded}
                          />
                        </View>
                      </View>

                      {/* Info Section */}
                      <View style={styles.cardInfo}>
                        <Text
                          style={[
                            styles.cardName,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {item.name}
                        </Text>

                        {/* Meta Row - Rating, Reviews, Price */}
                        <View style={styles.cardMetaRow}>
                          {item.rating != null && (
                            <Text
                              style={[
                                styles.cardMetaText,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              {`⭐ ${
                                typeof item.rating === "number"
                                  ? item.rating.toFixed(1)
                                  : item.rating
                              }`}
                            </Text>
                          )}

                          {item.reviewCount != null && (
                            <Text
                              style={[
                                styles.cardMetaText,
                                { color: theme.colors.onSurface + "99" },
                              ]}
                            >
                              {`(${item.reviewCount} reviews)`}
                            </Text>
                          )}

                          {item.price != null && (
                            <Text
                              style={[
                                styles.cardMetaText,
                                { color: theme.colors.onSurface + "99" },
                              ]}
                            >
                              {`• ${item.price}`}
                            </Text>
                          )}
                        </View>

                        {/* Hours Row */}
                        {(item.isOpen !== null || item.hours) && (
                          <View style={styles.hoursRow}>
                            {item.isOpen !== null &&
                              item.isOpen !== undefined && (
                                <Text
                                  style={[
                                    styles.cardMetaText,
                                    {
                                      color: item.isOpen
                                        ? theme.colors.primary
                                        : theme.colors.secondary,
                                      fontWeight: "600",
                                    },
                                  ]}
                                >
                                  {item.isOpen ? "Open now" : "Closed"}
                                </Text>
                              )}

                            {item.hours && item.hours.length > 0 && (
                              <TouchableOpacity
                                onPress={() => {
                                  console.log("Show hours modal for:", item.id);
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
                            style={[
                              styles.cardDetail,
                              { color: theme.colors.onSurface + "99" },
                            ]}
                          >
                            {formatAddress(item.address)}
                          </Text>
                        )}

                        {/* Distance */}
                        {item.distanceMiles != null && (
                          <Text
                            style={[
                              styles.cardDetail,
                              { color: theme.colors.onSurface + "99" },
                            ]}
                          >
                            {`${item.distanceMiles.toFixed(2)} mi away`}
                          </Text>
                        )}

                        {/* Google and Apple Maps Buttons */}
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
                      </View>
                    </Card>
                  );
                }}
              />
            </Animated.View>
          )}
        </ScrollView>

        <RestaurantDetailModal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          restaurant={selectedRestaurant}
        />

        {/* ✅ CreateListModal */}
        <CreateListModal
          visible={createListVisible}
          onDismiss={() => setCreateListVisible(false)}
          onCreated={handleListCreated}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appbar: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === "ios" ? 2 : 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchbarContainer: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 8,
  },
  searchbar: {
    flex: 1,
    marginRight: 4,
    minHeight: 20,
    borderRadius: 20,
    marginVertical: Platform.OS === "ios" ? 4 : 0,
  },
  scrollArea: {
    flexGrow: 1,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 0,
    marginHorizontal: 0,
  },
  cardImage: {
    width: "100%",
    height: CARD_PHOTO_HEIGHT,
  },
  cardInfo: {
    padding: 16,
  },
  cardName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardMetaRow: {
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
  cardMetaText: {
    fontSize: 14,
    marginRight: 6,
  },
  cardDetail: {
    fontSize: 13,
    marginBottom: 3,
  },
  detailsButton: {
    marginTop: 12,
    borderRadius: 25,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },
  linkButton: {
    flex: 1,
    borderRadius: 25,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 250,
  },
});
