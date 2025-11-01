import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Text,
  Animated,
} from "react-native";
import { Card, Button } from "react-native-paper";
import {
  fetchNearbyRestaurants,
  fetchRestaurantDetails,
} from "../utils/placesApi";
import HomeSkeleton from "../components/HomeSkeleton";
import { RestaurantDetailModal } from "../components";
import { useScrollToTop } from "@react-navigation/native";

interface Restaurant {
  id: string;
  name: string;
  rating: number;
  address: string;
  photo?: string | null;
}

export default function HomeScreen() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [restaurantOfDay, setRestaurantOfDay] = useState<Restaurant | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadInitialRestaurants();
  }, []);

  useScrollToTop(flatListRef);

  const loadInitialRestaurants = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const { results, nextToken } = await fetchNearbyRestaurants({});
      const shuffled = [...results].sort(() => Math.random() - 0.5); // new list each refresh
      setRestaurants(shuffled);
      setNextPageToken(nextToken);

      // Deterministic Restaurant of the Day (same for everyone)
      const today = new Date().toISOString().split("T")[0];
      const index =
        Math.abs(today.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
        results.length;
      setRestaurantOfDay(results[index]);
    } catch (err) {
      console.error("❌ Load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    // fade out current content
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    await loadInitialRestaurants(true);

    // fade in new content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const loadMoreRestaurants = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const { results, nextToken } = await fetchNearbyRestaurants({
        pageToken: nextPageToken,
      });
      setRestaurants((prev) => [...prev, ...results]);
      setNextPageToken(nextToken);
    } catch (err) {
      console.error("❌ Pagination error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore]);

  const handleAddFavorite = (r: Restaurant) => {
    if (!favorites.some((f) => f.id === r.id)) {
      setFavorites([...favorites, r]);
    }
  };

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <Card key={item.id} style={styles.smallCard}>
      <Card.Title
        title={item.name}
        subtitle={`${item.address} • ⭐${item.rating}`}
      />
      {item.photo && <Card.Cover source={{ uri: item.photo }} />}
      <Card.Actions>
        <Button onPress={() => handleAddFavorite(item)}>
          Add to Favorites
        </Button>
        <Button
          onPress={async () => {
            const details = await fetchRestaurantDetails(item.id);
            if (details) {
              setSelectedRestaurant(details);
              setShowDetails(true);
            }
          }}
        >
          View Details
        </Button>
      </Card.Actions>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <HomeSkeleton />
      </View>
    );
  }

  return (
    <>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          ref={flatListRef}
          contentContainerStyle={styles.container}
          data={restaurants}
          keyExtractor={(item) => item.id}
          renderItem={renderRestaurant}
          ListHeaderComponent={
            <>
              <Text style={styles.header}>🍽️ Restaurant of the Day</Text>
              {restaurantOfDay && (
                <Card style={styles.card}>
                  <Card.Title
                    title={restaurantOfDay.name}
                    subtitle={`${restaurantOfDay.address} • ⭐${restaurantOfDay.rating}`}
                  />
                  {restaurantOfDay.photo && (
                    <Card.Cover source={{ uri: restaurantOfDay.photo }} />
                  )}
                  <Card.Actions>
                    <Button onPress={() => handleAddFavorite(restaurantOfDay)}>
                      Add to Favorites
                    </Button>
                    <Button
                      onPress={async () => {
                        const details = await fetchRestaurantDetails(
                          restaurantOfDay.id
                        );
                        if (details) {
                          setSelectedRestaurant(details);
                          setShowDetails(true);
                        }
                      }}
                    >
                      View Details
                    </Button>
                  </Card.Actions>
                </Card>
              )}

              {favorites.length > 0 && (
                <>
                  <Text style={styles.header}>❤️ Your Favorites</Text>
                  {favorites.map((fav) => (
                    <Card key={fav.id} style={styles.smallCard}>
                      <Card.Title
                        title={fav.name}
                        subtitle={`⭐${fav.rating} • ${fav.address}`}
                      />
                    </Card>
                  ))}
                </>
              )}

              <Text style={styles.header}>🎯 Random Picks Near You</Text>
            </>
          }
          onEndReachedThreshold={0.5}
          onEndReached={loadMoreRestaurants}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" />
                <Text>Loading more...</Text>
              </View>
            ) : null
          }
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      </Animated.View>
      <RestaurantDetailModal
        visible={showDetails}
        onDismiss={() => setShowDetails(false)}
        restaurant={selectedRestaurant}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 22, fontWeight: "600", marginVertical: 16 },
  card: { marginBottom: 20 },
  smallCard: { marginBottom: 14 },
  footer: { padding: 20, alignItems: "center" },
});
