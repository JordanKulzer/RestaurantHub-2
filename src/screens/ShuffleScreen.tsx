import React, { useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Button, Card, Text } from "react-native-paper";
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

export default function ShuffleScreen() {
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
  const [lists, setLists] = useState<
    { id: string; name: string; photoUri?: string | null }[]
  >([]);
  const [showAddToList, setShowAddToList] = useState(false);
  const [restaurantToAdd, setRestaurantToAdd] = useState<any>(null);

  const categoryOptions = CATEGORY_OPTIONS;

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

    if (!results || results.length === 0) {
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
      alert(`🎉 Winner: ${remaining[0].name}!`);
    }
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

  const handleTryAgain = () => {
    setRestaurants([]);
    setPhase("setup");
    setNoResults(false);
  };

  return (
    <>
      {phase === "eliminate" ? (
        <View style={styles.container}>
          <Text style={styles.header}>🔥 Eliminate until one remains!</Text>

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
                <Card style={styles.card}>
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
                      <Text style={styles.distanceText}>{distanceLabel}</Text>
                    </View>
                  )}

                  <Card.Actions>
                    <Button
                      textColor="red"
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
            style={styles.tryAgainButton}
          >
            Try Again
          </Button>
        </View>
      ) : (
        <View style={styles.container}>
          <Text style={styles.header}>🎲 Restaurant Shuffler</Text>

          <DropdownModal
            label="Categories"
            options={categoryOptions}
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

          {noResults && (
            <Text style={styles.noResults}>
              No results found with your filters.
            </Text>
          )}

          <Button
            mode="contained"
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
          >
            Try Again
          </Button>
        </View>
      )}

      <RestaurantDetailModal
        visible={showDetails}
        onDismiss={() => setShowDetails(false)}
        restaurant={selectedRestaurant}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  shuffleButton: { marginTop: 40 },
  tryAgainButton: { marginTop: 16 },
  card: { marginBottom: 14 },
  noResults: {
    textAlign: "center",
    color: "red",
    fontSize: 16,
    marginTop: 16,
  },
  distanceContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f8f8f8",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  distanceText: {
    fontSize: 14,
    color: "#555",
    textAlign: "right",
  },
});
