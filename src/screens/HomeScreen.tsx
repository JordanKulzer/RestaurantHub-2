import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Text,
  Animated,
} from "react-native";
import { Card, Button, IconButton } from "react-native-paper";
import {
  fetchNearbyRestaurants,
  fetchRestaurantDetails,
} from "../utils/placesApi";
import HomeSkeleton from "../components/HomeSkeleton";
import { RestaurantDetailModal, RestaurantOptionsMenu } from "../components";
import { useNavigation, useScrollToTop } from "@react-navigation/native";

interface Restaurant {
  id: string;
  name: string;
  rating: number;
  address: string;
  photo?: string | null;
  distance?: number;
}

export default function HomeScreen() {
  const navigation = useNavigation();
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
  const [showAddToList, setShowAddToList] = useState(false);
  const [restaurantToAdd, setRestaurantToAdd] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadInitialRestaurants();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="magnify"
          onPress={() => {
            const parentNav = navigation.getParent();
            parentNav?.navigate("Search");
          }}
          accessibilityLabel="Search restaurants"
        />
      ),
    });
  }, [navigation]);

  useScrollToTop(flatListRef);

  const loadInitialRestaurants = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const { results, nextToken } = await fetchNearbyRestaurants({});
      const shuffled = [...results].sort(() => Math.random() - 0.5);
      setRestaurants(shuffled);
      setNextPageToken(nextToken);

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

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    await loadInitialRestaurants(true);

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

  const handleToggleFavorite = (r: Restaurant) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === r.id);
      if (exists) {
        return prev.filter((f) => f.id !== r.id);
      } else {
        return [...prev, r];
      }
    });
  };

  const handleAddToList = (r: any) => {
    setRestaurantToAdd(r);
    setShowAddToList(true);
  };

  // const handleCreateList = (list) => {
  //   const id = Date.now().toString();
  //   setLists([...lists, { id, ...list }]);
  // };

  // const handleSelectList = (listId: string) => {
  //   const list = lists.find((l) => l.id === listId);
  //   if (list && restaurantToAdd) {
  //     console.log(`✅ Added ${restaurantToAdd.name} to ${list.name}`);
  //   }
  //   setShowAddToList(false);
  //   setRestaurantToAdd(null);
  // };
  const renderRestaurant = ({ item }: { item: Restaurant }) => {
    const isFavorite = favorites.some((f) => f.id === item.id);
    const distanceLabel = item.distance
      ? `${item.distance.toFixed(1)} mi away`
      : `null`;

    return (
      <Card key={item.id} style={styles.smallCard}>
        <Card.Title
          title={item.name}
          subtitle={`${item.address} • ⭐${item.rating}`}
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
            onPress={async () => {
              const details = await fetchRestaurantDetails(item.id);
              if (details) {
                setSelectedRestaurant({ ...details, distance: item.distance });
                setShowDetails(true);
              }
            }}
          >
            View Details
          </Button>
        </Card.Actions>
      </Card>
    );
  };

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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <View
                  style={{
                    width: 5,
                    height: 24,
                    backgroundColor: "#5e60ce",
                    borderRadius: 4,
                    marginRight: 8,
                  }}
                />
                <Text style={styles.header}>Restaurant of the Day</Text>
              </View>
              {restaurantOfDay && (
                <Card style={styles.card}>
                  <Card.Title
                    title={restaurantOfDay.name}
                    subtitle={`${restaurantOfDay.address} • ⭐${restaurantOfDay.rating}`}
                    right={() => {
                      const isFavorite = favorites.some(
                        (f) => f.id === restaurantOfDay.id
                      );
                      return (
                        <RestaurantOptionsMenu
                          restaurant={restaurantOfDay}
                          isFavorite={isFavorite}
                          onToggleFavorite={handleToggleFavorite}
                          onAddToList={handleAddToList}
                        />
                      );
                    }}
                  />
                  {restaurantOfDay.photo && (
                    <Card.Cover source={{ uri: restaurantOfDay.photo }} />
                  )}
                  {restaurantOfDay.distance !== undefined && (
                    <View style={styles.distanceContainer}>
                      <Text style={styles.distanceText}>
                        {restaurantOfDay.distance.toFixed(1)} mi away
                      </Text>
                    </View>
                  )}
                  <Card.Actions>
                    <Button
                      onPress={async () => {
                        const details = await fetchRestaurantDetails(
                          restaurantOfDay.id
                        );
                        if (details) {
                          setSelectedRestaurant({
                            ...details,
                            distance: restaurantOfDay.distance,
                          });
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <View
                  style={{
                    width: 5,
                    height: 24,
                    backgroundColor: "#5e60ce",
                    borderRadius: 4,
                    marginRight: 8,
                  }}
                />
                <Text style={styles.header}>Random Picks Near You</Text>
              </View>
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
      {/* <AddToListModal
        visible={showAddToList}
        onDismiss={() => setShowAddToList(false)}
        lists={lists}
        onSelectList={handleSelectList}
        onCreateList={handleCreateList}
      /> */}
      {/*
      <CreateListModal
        visible={showCreateList}
        onDismiss={() => setShowCreateList(false)}
        onCreate={(list) => {
          handleCreateList(list);
          // optionally auto-add restaurantToAdd here:
          console.log(`✅ Added ${restaurantToAdd?.name} to new list ${list.name}`);
          setShowCreateList(false);
          setRestaurantToAdd(null);
        }}
      /> */}
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    fontSize: 22,
    fontWeight: "700",
    marginVertical: 16,
    color: "#222",
    alignSelf: "flex-start",
  },
  card: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 4,
  },
  smallCard: { marginBottom: 14 },
  footer: { padding: 20, alignItems: "center" },
  distanceContainer: {
    backgroundColor: "#f3f3f8",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  distanceText: {
    fontSize: 14,
    color: "#5e60ce",
    textAlign: "right",
  },
});
