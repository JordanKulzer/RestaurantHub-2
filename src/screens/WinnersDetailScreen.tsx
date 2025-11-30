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
import ModernRestaurantCard from "../components/ModernRestaurantCard";
import {
  addRestaurantNote,
  deleteRestaurantNote,
  getRestaurantNotes,
  RestaurantNote,
} from "../utils/notesApi";
import { getLists } from "../utils/listsApi";

export default function WinnersDetailScreen({ navigation, route }: any) {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [enrichedWinners, setEnrichedWinners] = useState<
    (HomeRestaurant & { notes?: RestaurantNote[] })[]
  >([]);
  const [newNoteText, setNewNoteText] = useState<{
    [restaurantId: string]: string;
  }>({});

  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<any[]>([]);
  const [listsReady, setListsReady] = useState(false);

  useEffect(() => {
    async function loadLists() {
      const data = await getLists();
      setLists(data);
      setListsReady(true);
    }
    loadLists();
  }, []);

  const refreshFavorites = async () => {
    const favs = await getFavorites();
    setFavoriteIds(new Set(favs.map((f) => f.id)));
  };

  const loadWinners = async () => {
    try {
      setLoading(true);
      const data = await getWinners();
      setWinners(data);

      const enriched = await Promise.all(
        data.map(async (winner) => {
          try {
            const details = await fetchRestaurantDetails(winner.id);

            // Fetch notes for this restaurant in the 'winners' context
            const notes = await getRestaurantNotes(winner.id, "winners");

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
              notes, // ⬅️ attach notes array here
            } as HomeRestaurant & { notes?: RestaurantNote[] };
          } catch (err) {
            console.error("Error fetching winner details:", err);
            const notes = await getRestaurantNotes(winner.id, "winners");

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
              notes,
            } as HomeRestaurant & { notes?: RestaurantNote[] };
          }
        })
      );

      setEnrichedWinners(enriched);
      refreshFavorites();
    } catch (error) {
      console.error("Error loading winners:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadWinners();
  }, [isFocused]);

  const refreshFavoriteIds = async () => {
    try {
      const favs = await getFavorites();
      setFavoriteIds(new Set(favs.map((f) => f.id)));
    } catch (e) {
      console.error("Error loading favorites:", e);
    }
  };

  const handleAddWinnerNote = async (restaurantId: string) => {
    const text = newNoteText[restaurantId]?.trim();
    if (!text) return;

    try {
      const note = await addRestaurantNote(restaurantId, "winners", text);

      setEnrichedWinners((prev) =>
        prev.map((w) =>
          w.id === restaurantId
            ? { ...w, notes: [...(w.notes ?? []), note] }
            : w
        )
      );

      setNewNoteText((prev) => ({ ...prev, [restaurantId]: "" }));
    } catch (err) {
      console.error("❌ handleAddWinnerNote failed:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Unable to save note",
      });
    }
  };

  const handleDeleteWinnerNote = async (
    restaurantId: string,
    noteId: string
  ) => {
    try {
      await deleteRestaurantNote(noteId);

      setEnrichedWinners((prev) =>
        prev.map((w) =>
          w.id === restaurantId
            ? {
                ...w,
                notes: (w.notes ?? []).filter((n) => n.id !== noteId),
              }
            : w
        )
      );
    } catch (err) {
      console.error("❌ handleDeleteWinnerNote failed:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Unable to delete note",
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
        <View style={styles.headerRow}>
          <Text
            variant="headlineSmall"
            style={[styles.headerTitle, { color: theme.colors.onBackground }]}
          >
            Previous Winners
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
            const notes = item.notes ?? [];
            const isLast = index === enrichedWinners.length - 1;

            return (
              <ModernRestaurantCard
                item={item}
                onPress={() => {}}
                notes={notes}
                userRole="editor"
                onAddNote={handleAddWinnerNote}
                onDeleteNote={handleDeleteWinnerNote}
                newNoteText={newNoteText}
                setNewNoteText={setNewNoteText}
                showActions={true}
                isFavorite={isFavorite}
                isWinner={true}
                isLast={isLast}
                onRemoveWinner={(id) => {
                  removeWinner(id);
                  setEnrichedWinners((prev) => prev.filter((w) => w.id !== id));
                }}
                preloadedLists={lists}
                listsReady={listsReady}
                onActionRemove={(restaurantId) =>
                  setEnrichedWinners((prev) =>
                    prev.filter((x) => x.id !== restaurantId)
                  )
                }
                onGoogleMaps={() => openGoogleMaps(item)}
                onAppleMaps={() => openAppleMaps(item)}
              />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
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
