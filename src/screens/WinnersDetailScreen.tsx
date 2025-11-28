// src/screens/WinnersDetailScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import {
  Text,
  useTheme,
  IconButton,
  Card,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import { getWinners, removeWinner, WinnerEntry } from "../utils/winnersApi";
import { fetchRestaurantDetails } from "../utils/placesApi";
import { HomeRestaurant } from "../types/homeRestaurant";
import { HomeSkeleton, QuickActionsMenu } from "../components";
import { getFavorites } from "../utils/favoritesApis";
import Toast from "react-native-toast-message";

export default function WinnersDetailScreen({ navigation, route }: any) {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [enrichedWinners, setEnrichedWinners] = useState<HomeRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const loadWinners = async () => {
    try {
      setLoading(true);
      const data = await getWinners();
      setWinners(data);

      // Enrich with details from Google Places API
      const enriched = await Promise.all(
        data.map(async (winner) => {
          try {
            const details = await fetchRestaurantDetails(winner.id);
            return {
              id: winner.id,
              source: winner.source,
              name: details?.name || winner.name,
              address: details?.formatted_address || winner.address || "",
              rating: details?.rating || 0,
              photos: details?.photos || [],
              googleMapsUrl: details?.googleMapsUrl || details?.url || null,
              lat: details?.lat || null,
              lon: details?.lon || null,
              hours: details?.hours || [],
              isOpen: details?.isOpen ?? null,
              image:
                details?.photos && details.photos.length > 0
                  ? details.photos[0]
                  : null,
            } as HomeRestaurant;
          } catch (err) {
            console.error("Error fetching winner details:", err);
            return {
              id: winner.id,
              source: winner.source,
              name: winner.name,
              address: winner.address || "",
              rating: 0,
              photos: [],
              googleMapsUrl: null,
              lat: null,
              lon: null,
              hours: [],
              isOpen: null,
              image: null,
            } as HomeRestaurant;
          }
        })
      );

      setEnrichedWinners(enriched);
    } catch (error) {
      console.error("Error loading winners:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshFavoriteIds = async () => {
    try {
      const favs = await getFavorites();
      setFavoriteIds(new Set(favs.map((f) => f.id)));
    } catch (e) {
      console.error("Error loading favorites:", e);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadWinners();
      refreshFavoriteIds();
    }
  }, [isFocused]);

  const handleRemove = async (id: string) => {
    try {
      await removeWinner(id);
      Toast.show({
        type: "success",
        text1: "Removed",
        text2: "Winner removed from your list",
      });
      loadWinners();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to remove winner",
      });
    }
  };

  const openGoogleMaps = (item: any) => {
    if (!item) return;
    if (item.googleMapsUrl) {
      Linking.openURL(item.googleMapsUrl);
      return;
    }
    if (item.lat && item.lon) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`
      );
      return;
    }
    // Fallback to address search
    const query = encodeURIComponent(item.address || item.name);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const openAppleMaps = (item: any) => {
    if (!item) return;

    if (Platform.OS === "ios" && item.lat && item.lon) {
      Linking.openURL(
        `maps://0,0?q=${encodeURIComponent(item.name)}@${item.lat},${item.lon}`
      );
      return;
    }

    if (item.lat && item.lon) {
      Linking.openURL(
        `https://maps.apple.com/?q=${encodeURIComponent(item.name)}&ll=${
          item.lat
        },${item.lon}`
      );
      return;
    }

    // Fallback to address
    const query = encodeURIComponent(item.address || item.name);
    Linking.openURL(`https://maps.apple.com/?q=${query}`);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getCategoryDisplay = (category?: string) => {
    if (!category) return null;
    const categoryMap: Record<string, string> = {
      favorites: "from Favorites",
      liked: "from Liked",
      lists: "from Lists",
      filters: "from Filters",
      surprise: "from Surprise Me",
      winners: "from Winners",
    };
    return categoryMap[category] || category;
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor={theme.colors.onBackground}
          onPress={() => navigation.goBack()}
        />
        <View style={{ flex: 1 }}>
          <Text
            variant="headlineSmall"
            style={[styles.headerTitle, { color: theme.colors.onBackground }]}
          >
            Previous Winners
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {winners.length} {winners.length === 1 ? "winner" : "winners"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View>
          {Array.from({ length: 3 }).map((_, index) => (
            <HomeSkeleton key={index} />
          ))}
        </View>
      ) : (
        <FlatList
          data={enrichedWinners}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item, index }) => {
            const winner = winners[index];
            const isFavorite = favoriteIds.has(item.id);

            return (
              <Card
                mode="elevated"
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
              >
                <View style={{ position: "relative" }}>
                  {item.image ? (
                    <Card.Cover
                      source={{ uri: item.image }}
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

                  {/* Quick Actions Menu */}
                  <View style={styles.menuContainer}>
                    <QuickActionsMenu
                      restaurant={item}
                      isFavorite={isFavorite}
                      onFavoriteChange={refreshFavoriteIds}
                      onCreateNewList={() => {}}
                      preloadedLists={[]}
                      listsReady={false}
                    />
                  </View>
                </View>

                <View style={styles.cardContent}>
                  {/* Trophy badge */}
                  <View style={styles.trophyBadge}>
                    <MaterialCommunityIcons
                      name="trophy"
                      size={16}
                      color={theme.colors.secondary}
                    />
                    <Text
                      style={[
                        styles.wonText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Won {formatDate(winner.wonAt)}
                      {winner.category &&
                        ` ${getCategoryDisplay(winner.category)}`}
                    </Text>
                  </View>

                  <Text
                    style={[styles.name, { color: theme.colors.onSurface }]}
                  >
                    {item.name}
                  </Text>

                  {/* Rating */}
                  {item.rating && item.rating > 0 && (
                    <Text
                      style={[styles.rating, { color: theme.colors.onSurface }]}
                    >
                      ⭐ {item.rating.toFixed(1)}
                    </Text>
                  )}

                  {/* Address */}
                  {item.address && (
                    <Text
                      style={[
                        styles.address,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {item.address}
                    </Text>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actions}>
                    <Button
                      mode="outlined"
                      icon="google-maps"
                      textColor={theme.colors.primary}
                      style={[
                        styles.actionButton,
                        { borderColor: theme.colors.primary },
                      ]}
                      onPress={() => openGoogleMaps(item)}
                    >
                      Google
                    </Button>

                    <Button
                      mode="outlined"
                      icon={Platform.OS === "ios" ? "map" : "map-marker"}
                      textColor={theme.colors.tertiary}
                      style={[
                        styles.actionButton,
                        { borderColor: theme.colors.tertiary },
                      ]}
                      onPress={() => openAppleMaps(item)}
                    >
                      Apple
                    </Button>

                    <IconButton
                      icon="delete-outline"
                      iconColor={theme.colors.error}
                      size={20}
                      onPress={() => handleRemove(item.id)}
                    />
                  </View>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="trophy-outline"
                size={64}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                No winners yet
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Complete a shuffle to see your winners here!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontWeight: "700",
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 200,
    borderRadius: 0,
  },
  menuContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    borderBottomLeftRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: 16,
  },
  trophyBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  wonText: {
    fontSize: 12,
    marginLeft: 6,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  rating: {
    fontSize: 14,
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    borderRadius: 25,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
});
