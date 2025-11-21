import React, { useState, useRef, useEffect } from "react";
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

import { fetchTextSearch, fetchRestaurantDetails } from "../utils/placesApi";
import { CATEGORY_OPTIONS } from "../constants/categoryType";
import RestaurantDetailModal from "../components/RestaurantDetailModal";
import HomeSkeleton from "../components/HomeSkeleton";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen({ navigation }: any) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  // -----------------------------------------
  // Input Change — NO AUTOCOMPLETE
  // -----------------------------------------
  const handleInputChange = (text: string) => {
    setQuery(text);

    // Clear results when input is empty
    if (text.trim().length === 0) {
      setResults([]);
      setSelectedCategory(null);
    }
  };

  // -----------------------------------------
  // Manual Search
  // -----------------------------------------
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

  // -----------------------------------------
  // Category Search
  // -----------------------------------------
  const handleCategorySelect = async (category: string) => {
    if (selectedCategory === category) {
      // deselect category
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

  // -----------------------------------------
  // Open Details
  // -----------------------------------------
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

        {/* ----------------------------------- */}
        {/* HEADER */}
        {/* ----------------------------------- */}
        <Appbar.Header
          mode="small"
          elevated
          statusBarHeight={undefined} // let it auto-detect iOS notch height
          style={[
            styles.appbar,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.outline,
            },
          ]}
        >
          {/* <Appbar.BackAction
            onPress={() => navigation.goBack()}
            color={theme.colors.primary}
          /> */}
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

        {/* ----------------------------------- */}
        {/* CATEGORY CHIPS */}
        {/* ----------------------------------- */}
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
                compact
                style={[
                  styles.chip,
                  {
                    borderColor: theme.colors.error,
                    backgroundColor: theme.colors.errorContainer,
                    marginRight: 8,
                  },
                ]}
                textStyle={{
                  color: theme.colors.error,
                  fontWeight: "600",
                }}
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
                    style={[
                      styles.chip,
                      {
                        borderColor: theme.colors.tertiary,
                        backgroundColor: isSelected
                          ? theme.colors.tertiary
                          : "transparent",
                        marginRight: 8,
                      },
                    ]}
                    textStyle={{
                      color: isSelected ? "#fff" : theme.colors.tertiary,
                      fontWeight: "600",
                    }}
                    onPress={() => handleCategorySelect(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                );
              })}
            </View>

            {/* Second Row of Categories */}
            <View style={{ flexDirection: "row" }}>
              {CATEGORY_OPTIONS.slice(
                Math.ceil(CATEGORY_OPTIONS.length / 2)
              ).map((opt) => {
                const isSelected = selectedCategory === opt.value;
                return (
                  <Chip
                    key={opt.value}
                    mode="outlined"
                    style={[
                      styles.chip,
                      {
                        borderColor: theme.colors.tertiary,
                        backgroundColor: isSelected
                          ? theme.colors.tertiary
                          : "transparent",
                        marginRight: 8,
                      },
                    ]}
                    textStyle={{
                      color: isSelected ? "#fff" : theme.colors.tertiary,
                      fontWeight: "600",
                    }}
                    onPress={() => handleCategorySelect(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* ----------------------------------- */}
        {/* MAIN RESULTS */}
        {/* ----------------------------------- */}
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
            <View style={{ padding: 16 }}>
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
                renderItem={({ item }) => (
                  <Card
                    mode="elevated"
                    style={[
                      styles.card,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    {/* Image with gradient overlay */}
                    <View style={{ position: "relative" }}>
                      {item.photo ? (
                        <Card.Cover
                          source={{ uri: item.photo }}
                          style={styles.cardImage}
                        />
                      ) : (
                        <Card.Cover
                          source={{
                            uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png",
                          }}
                          style={styles.cardImage}
                        />
                      )}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.6)"]}
                        style={StyleSheet.absoluteFillObject}
                      />
                    </View>

                    {/* Info Section - matching HomeSwipeCard */}
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
                                // You'll need to add state for this
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
                          {item.address}
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
                        {/* Google Maps */}
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

                        {/* Apple Maps */}
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
                )}
              />
            </Animated.View>
          )}
        </ScrollView>

        <RestaurantDetailModal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          restaurant={selectedRestaurant}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 10,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 240,
    borderRadius: 10,
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
  twoRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
    width: 10000, // <-- forces true wrap + horizontal scroll
    flexShrink: 0, // <-- prevent shrinking
  },

  chip: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    textTransform: "capitalize",
  },
});
