// src/screens/ListDetailScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Linking,
  Platform,
  TextInput as RNTextInput,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  useTheme,
  ActivityIndicator,
  IconButton,
  Button,
  Portal,
  Modal,
  Badge,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";

import { supabase } from "../utils/supabaseClient";
import { fetchRestaurantDetails } from "../utils/placesApi";
import { getFavorites } from "../utils/favoritesApis";
import { getLists, deleteList } from "../utils/listsApi";
import { getLocationCached } from "../utils/locationHelper";
import { useRealtimeList, useListPresence } from "../hooks/useRealtimeList";
import { getUserRoleInList, leaveList } from "../utils/collaborationApi";

import ModernRestaurantCard from "../components/ModernRestaurantCard";
import RestaurantDetailModal from "../components/RestaurantDetailModal";
import { ListSettingsModal } from "../components";

const EARTH_RADIUS_METERS = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;
const metersToMiles = (m: number) => m * 0.000621371;

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const formatAddress = (address: string | null) => {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 3) {
    const m = parts[2].match(/^([A-Z]{2})/);
    if (m) return `${parts[0]}, ${parts[1]}, ${m[1]}`;
  }
  return address;
};

export default function ListDetailScreen({ route, navigation }: any) {
  const { listId, title } = route.params;
  const theme = useTheme();
  const isFocused = useIsFocused();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [listsCache, setListsCache] = useState<any[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);

  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(
    null
  );

  const [listInfo, setListInfo] = useState({
    title,
    description: null as string | null,
  });

  const [userRole, setUserRole] = useState<
    "owner" | "editor" | "viewer" | null
  >(null);

  // Modals
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [hoursVisible, setHoursVisible] = useState(false);
  const [hoursForModal, setHoursForModal] = useState<string[]>([]);
  const [deleteVisible, setDeleteVisible] = useState(false);

  // Notes (multi-note per item)
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});

  const hasEnrichedRef = React.useRef(false);

  // Live presence
  const { activeUsers } = useListPresence(listId);

  // Live realtime updates
  useRealtimeList({
    listId,
    onItemAdded: () => loadItems(),
    onItemUpdated: (item) =>
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ...item } : i))
      ),
    onItemDeleted: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
    onListUpdated: (l) => {
      setListInfo(l);
      navigation.setParams({ title: l.title });
    },
    onNoteChanged: () => loadItems(),
  });

  // Init loads
  useEffect(() => {
    if (isFocused) {
      preloadLists();
      loadUserRole();
    }
  }, [isFocused]);

  useEffect(() => {
    loadItems();
    loadLocation();
    loadFavorites();
  }, []);

  const preloadLists = async () => {
    try {
      const data = await getLists();
      setListsCache(data);
      setListsLoaded(true);
    } catch (err) {
      console.error("❌ preloadLists:", err);
    }
  };

  const loadUserRole = async () => {
    const role = await getUserRoleInList(listId);
    setUserRole(role);
  };

  const loadFavorites = async () => {
    const favs = await getFavorites();
    setFavoriteIds(new Set(favs.map((f) => f.id)));
  };

  const loadLocation = async () => {
    try {
      const loc = await getLocationCached();
      setUserLocation({ lat: loc.latitude, lon: loc.longitude });
    } catch {}
  };

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from("list_items")
        .select(
          `
          *,
          notes:list_item_notes_with_user(
            id,
            note_text,
            created_at,
            user_id,
            user_email
          )
        `
        )
        .eq("list_id", listId)
        .order("created_at", {
          foreignTable: "list_item_notes_with_user",
          ascending: false,
        });

      if (error) throw error;

      setItems(data || []);
      if (!data?.length) setLoading(false);
    } catch (err) {
      console.error("❌ loadItems:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!items.length || hasEnrichedRef.current) return;
    enrichItems();
  }, [items, userLocation]);

  const enrichItems = useCallback(async () => {
    if (!items.length || !userLocation) return;

    try {
      const enriched = await Promise.all(
        items.map(async (item) => {
          try {
            const d = await fetchRestaurantDetails(item.restaurant_id);

            let distanceMiles: number | null = null;
            const lat = d.geometry?.location?.lat ?? d.lat ?? null;
            const lon = d.geometry?.location?.lng ?? d.lon ?? null;

            if (lat && lon) {
              const meters = getDistanceMeters(
                userLocation.lat,
                userLocation.lon,
                lat,
                lon
              );
              distanceMiles = parseFloat(metersToMiles(meters).toFixed(1));
            }

            return {
              ...item,
              enriched: {
                id: item.restaurant_id,
                name: d.name ?? item.restaurant_name,
                address: d.formatted_address ?? item.restaurant_address,
                rating: d.rating ?? null,
                reviewCount: d.user_ratings_total ?? null,
                hours: d.hours ?? [],
                isOpen: d.isOpen ?? null,
                photos: d.photos ?? [],
                price: d.price_level_symbol ?? d.price ?? null,
                distanceMiles,
                googleMapsUrl: d.googleMapsUrl ?? d.url ?? null,
                lat,
                lon,
              },
            };
          } catch (err) {
            return { ...item, enriched: null };
          }
        })
      );

      setItems(enriched);
      hasEnrichedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [items, userLocation]);

  const handleAddNote = async (itemId: string) => {
    if (userRole === "viewer") return;

    const text = newNoteText[itemId]?.trim();
    if (!text) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;

      const { data, error } = await supabase
        .from("list_item_notes")
        .insert({
          list_item_id: itemId,
          user_id: userData.user?.id,
          note_text: text,
        })
        .select()
        .single();

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                notes: [{ ...data, user_email: email }, ...(i.notes || [])],
              }
            : i
        )
      );

      setNewNoteText((prev) => ({ ...prev, [itemId]: "" }));
    } catch (err) {
      console.error("❌ add note:", err);
    }
  };

  const handleDeleteNote = async (itemId: string, noteId: string) => {
    if (userRole === "viewer") return;

    try {
      await supabase.from("list_item_notes").delete().eq("id", noteId);

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, notes: i.notes?.filter((n: any) => n.id !== noteId) }
            : i
        )
      );
    } catch (err) {
      console.error("❌ delete note:", err);
    }
  };

  const handleRemoveFromList = async (itemRowId: string) => {
    if (userRole === "viewer") return;

    try {
      await supabase.from("list_items").delete().eq("id", itemRowId);

      // Instantly hide from UI
      setItems((prev) => prev.filter((x) => x.id !== itemRowId));
    } catch (err) {
      console.error("❌ remove from list:", err);
    }
  };

  const openHoursModal = (hours: string[]) => {
    setHoursForModal(hours);
    setHoursVisible(true);
  };

  const openInGoogleMaps = (e: any) => {
    if (e.googleMapsUrl) return Linking.openURL(e.googleMapsUrl);
    if (e.lat && e.lon)
      return Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lon}`
      );
  };

  const openInAppleMaps = (e: any) => {
    if (Platform.OS === "ios" && e.lat && e.lon) {
      return Linking.openURL(
        `maps://0,0?q=${encodeURIComponent(e.name)}@${e.lat},${e.lon}`
      );
    }
    if (e.lat && e.lon) {
      return Linking.openURL(
        `https://maps.apple.com/?q=${encodeURIComponent(e.name)}&ll=${e.lat},${
          e.lon
        }`
      );
    }
  };

  const openDetailsModal = (e: any) => setSelectedRestaurant(e);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.tertiary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* HEADER */}
      <View style={styles.headerRow}>
        <IconButton
          icon="chevron-left"
          size={26}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.onSurface}
        />

        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Text style={styles.headerTitle}>{listInfo.title}</Text>
          {activeUsers.length > 1 && (
            <Badge
              size={20}
              style={{ backgroundColor: theme.colors.primary, marginLeft: 8 }}
            >
              {activeUsers.length}
            </Badge>
          )}
        </View>

        <IconButton
          icon="dots-vertical"
          size={24}
          onPress={() => setSettingsVisible(true)}
          iconColor={theme.colors.tertiary}
        />
      </View>

      {/* EMPTY STATE */}
      {!items.length && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 20,
            padding: 26,
            borderRadius: 18,
            backgroundColor: theme.colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.outline,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.onSurface,
              marginBottom: 8,
            }}
          >
            This list is empty
          </Text>

          <Button
            mode="contained"
            textColor={theme.colors.surface}
            style={{
              borderRadius: 99,
              paddingHorizontal: 18,
              backgroundColor: theme.colors.tertiary,
            }}
            onPress={() => navigation.goBack()}
          >
            Find restaurants
          </Button>
        </View>
      )}

      {/* LIST ITEMS */}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item, index }) => {
          const e = item.enriched;
          const isFavorite = e ? favoriteIds.has(e.id) : false;
          const notes = item.notes ?? [];
          const isLast = index === items.length - 1;

          return (
            <ModernRestaurantCard
              item={item}
              onPress={() => openDetailsModal(e)}
              notes={notes}
              userRole={userRole || "viewer"}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              newNoteText={newNoteText}
              setNewNoteText={setNewNoteText}
              showActions={true}
              isFavorite={isFavorite}
              isLast={isLast}
              preloadedLists={listsCache}
              listsReady={listsLoaded}
              onActionRemove={() => handleRemoveFromList(item.id)}
              onGoogleMaps={() => openInGoogleMaps(e)}
              onAppleMaps={() => openInAppleMaps(e)}
            />
          );
        }}
      />

      {/* HOURS MODAL */}
      <Portal>
        <Modal
          visible={hoursVisible}
          onDismiss={() => setHoursVisible(false)}
          contentContainerStyle={[
            styles.hoursModalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.hoursTitle, { color: theme.colors.onSurface }]}>
            Hours
          </Text>

          {!hoursForModal.length ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Hours unavailable
            </Text>
          ) : (
            hoursForModal.map((h, i) => (
              <Text
                key={i}
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 4,
                }}
              >
                {h}
              </Text>
            ))
          )}

          <Button mode="contained" onPress={() => setHoursVisible(false)}>
            Close
          </Button>
        </Modal>
      </Portal>

      <RestaurantDetailModal
        visible={!!selectedRestaurant}
        onDismiss={() => setSelectedRestaurant(null)}
        restaurant={selectedRestaurant}
      />

      {/* SETTINGS */}
      <ListSettingsModal
        visible={settingsVisible}
        onDismiss={() => setSettingsVisible(false)}
        listId={listId}
        listTitle={listInfo.title}
        listDescription={listInfo.description}
        isOwner={userRole === "owner"}
        onListUpdated={(t, d) => {
          setListInfo({ title: t, description: d });
          navigation.setParams({ title: t });
        }}
      />

      {/* DELETE LIST */}
      <Portal>
        <Modal
          visible={deleteVisible}
          onDismiss={() => setDeleteVisible(false)}
          contentContainerStyle={{
            backgroundColor: theme.colors.surface,
            padding: 24,
            marginHorizontal: 16,
            borderRadius: 22,
          }}
        >
          <Text style={{ fontSize: 21, fontWeight: "700", marginBottom: 16 }}>
            Delete List
          </Text>
          <Text
            style={{ marginBottom: 24, color: theme.colors.onSurfaceVariant }}
          >
            Are you sure you want to delete this list?
          </Text>

          <Button
            mode="contained"
            onPress={async () => {
              await deleteList(listId);
              setDeleteVisible(false);
              navigation.goBack();
            }}
          >
            Delete
          </Button>

          <Button mode="text" onPress={() => setDeleteVisible(false)}>
            Cancel
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 6,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    flexShrink: 1,
  },

  hoursModalContainer: {
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 16,
  },

  hoursTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
});
