import React, { useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Button, Card, Text, Surface, useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import {
  RestaurantDetailModal,
  DropdownModal,
  RestaurantOptionsMenu,
} from "../components";
import { CATEGORY_OPTIONS } from "../constants/categoryType";
import {
  fetchShuffledRestaurants,
  fetchRestaurantDetails,
} from "../utils/placesApi";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ShuffleScreen() {
  const theme = useTheme();
  const [phase, setPhase] = useState<"setup" | "eliminate">("setup");
  const [categories, setCategories] = useState<string[]>([]);
  const [rating, setRating] = useState("");
  const [distance, setDistance] = useState("");
  const [numberDisplayed, setNumberDisplayed] = useState("5");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [noResults, setNoResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [restaurantToAdd, setRestaurantToAdd] = useState<any>(null);
  const [showAddToList, setShowAddToList] = useState(false);

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

  const handleShuffle = async () => {
    setLoading(true);
    setNoResults(false);
    const results = await fetchShuffledRestaurants({
      distanceMiles: distance ? Number(distance) : 5,
      minRating: rating ? Number(rating) : 0,
      categories,
      limit: Number(numberDisplayed),
    }).catch(() => {
      Toast.show({
        type: "error",
        text1: "Location Error",
        text2: "Please enable GPS and try again.",
        position: "bottom",
        visibilityTime: 3000,
      });
      return [];
    });

    setLoading(false);
    if (!results?.length) {
      setNoResults(true);
      setRestaurants([]);
      return;
    }
    setRestaurants(results);
    setPhase("eliminate");
  };

  const handleEliminate = (id: string) => {
    const remaining = restaurants.filter((r) => r.id !== id);
    setRestaurants(remaining);
    if (remaining.length === 1) {
      Toast.show({
        type: "success",
        text1: `🎉 Winner: ${remaining[0].name}!`,
        position: "bottom",
      });
    }
  };

  const handleTryAgain = () => {
    setRestaurants([]);
    setPhase("setup");
    setNoResults(false);
  };

  const handleToggleFavorite = (r: any) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === r.id);
      return exists ? prev.filter((f) => f.id !== r.id) : [...prev, r];
    });
  };

  const handleAddToList = (r: any) => {
    setRestaurantToAdd(r);
    setShowAddToList(true);
  };

  const accent = theme.colors.tertiary; // burnt orange
  const surface = theme.colors.surface;
  const textColor = theme.colors.onSurface;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <LinearGradient
        colors={[theme.colors.background, surface]}
        style={StyleSheet.absoluteFill}
      />
      {phase === "eliminate" ? (
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View style={[styles.colorBar, { backgroundColor: accent }]} />
            <Text style={[styles.header, { color: textColor }]}>
              🔥 Elimination Round
            </Text>
          </View>
          <Text
            style={[styles.subtext, { color: theme.colors.onSurface + "BB" }]}
          >
            Remove one at a time until you find your winner!
          </Text>

          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isFavorite = favorites.some((f) => f.id === item.id);
              const distanceLabel =
                item.distance !== undefined
                  ? `${item.distance.toFixed(1)} mi away`
                  : "";

              return (
                <Card
                  mode="elevated"
                  style={[styles.card, { backgroundColor: surface }]}
                >
                  <Card.Title
                    title={item.name}
                    subtitle={`${item.address} • ⭐${item.rating.toFixed(1)}`}
                    right={() => (
                      <RestaurantOptionsMenu
                        restaurant={item}
                        isFavorite={isFavorite}
                        onToggleFavorite={handleToggleFavorite}
                        onAddToList={handleAddToList}
                      />
                    )}
                  />
                  {item.photo && <Card.Cover source={{ uri: item.photo }} />}

                  {distanceLabel && (
                    <View style={styles.distanceContainer}>
                      <Text style={[styles.distanceText, { color: accent }]}>
                        {distanceLabel}
                      </Text>
                    </View>
                  )}

                  <Card.Actions>
                    <Button
                      textColor={accent}
                      onPress={() => handleEliminate(item.id)}
                    >
                      Eliminate
                    </Button>
                    <Button
                      onPress={async () => {
                        const details = await fetchRestaurantDetails(item.id);
                        if (details) {
                          setSelectedRestaurant({
                            ...details,
                            distance: item.distance,
                          });
                          setShowDetails(true);
                        }
                      }}
                    >
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
            style={styles.tryAgainButton}
          >
            Start Over
          </Button>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View style={[styles.colorBar, { backgroundColor: accent }]} />
            <Text style={[styles.header, { color: textColor }]}>
              🎲 Restaurant Shuffler
            </Text>
          </View>
          <Text
            style={[styles.subtext, { color: theme.colors.onSurface + "BB" }]}
          >
            Set your filters and let fate choose your next meal.
          </Text>

          <Surface
            style={[
              styles.filterCard,
              { backgroundColor: surface, borderColor: accent },
            ]}
          >
            <DropdownModal
              label="🍽 Categories"
              options={CATEGORY_OPTIONS}
              value={categories}
              onChange={setCategories}
              multiSelect
            />
            <DropdownModal
              label="⭐ Rating"
              options={ratingOptions}
              value={rating}
              onChange={setRating}
            />
            <DropdownModal
              label="📍 Distance"
              options={distanceOptions}
              value={distance}
              onChange={setDistance}
            />
            <DropdownModal
              label="🔢 Number of Restaurants"
              options={numberOptions}
              value={numberDisplayed}
              onChange={setNumberDisplayed}
            />
          </Surface>

          {noResults && (
            <Text style={[styles.noResults, { color: accent }]}>
              No results found with your filters.
            </Text>
          )}

          <Button
            mode="contained"
            icon="shuffle"
            buttonColor={accent}
            textColor="#fff"
            style={styles.shuffleButton}
            onPress={handleShuffle}
            loading={loading}
            disabled={loading}
          >
            {loading ? "Shuffling..." : "Shuffle Now"}
          </Button>

          <Button
            mode="outlined"
            style={styles.tryAgainButton}
            onPress={handleTryAgain}
            textColor={accent}
          >
            Reset Filters
          </Button>
        </View>
      )}
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
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  colorBar: {
    width: 5,
    height: 24,
    borderRadius: 4,
    marginRight: 8,
  },
  header: { fontSize: 22, fontWeight: "700" },
  subtext: { marginBottom: 16 },
  filterCard: {
    borderRadius: 16,
    elevation: 3,
    padding: 12,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
  },
  shuffleButton: {
    marginTop: 16,
    borderRadius: 24,
    paddingVertical: 6,
  },
  tryAgainButton: { marginTop: 10 },
  distanceContainer: {
    backgroundColor: "#f3f3f8",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  distanceText: { fontSize: 14, textAlign: "right" },
  noResults: {
    textAlign: "center",
    fontSize: 15,
    marginTop: 16,
  },
});
