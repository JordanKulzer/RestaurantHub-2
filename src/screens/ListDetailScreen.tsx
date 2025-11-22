// src/screens/ListDetailScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  TextInput as RNTextInput, // ✅ Add this alias
} from "react-native";
import {
  Text,
  useTheme,
  ActivityIndicator,
  Card,
  IconButton,
  Button,
  Portal,
  Modal,
  Badge,
  // TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "../utils/supabaseClient";
import { fetchRestaurantDetails } from "../utils/placesApi";
import QuickActionsMenu from "../components/QuickActionsMenu";
import { getFavorites } from "../utils/favoritesApis";
import RestaurantDetailModal from "../components/RestaurantDetailModal";
import { deleteList, getLists } from "../utils/listsApi";
import { theme } from "../theme";
import { getLocationCached } from "../utils/locationHelper";
import { useIsFocused } from "@react-navigation/native";
import { useRealtimeList, useListPresence } from "../hooks/useRealtimeList";
import { getUserRoleInList, leaveList } from "../utils/collaborationApi";
import { ListSettingsModal } from "../components";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ListCardProps {
  item: any;
  theme: any;
  isFavorite: boolean;
  onFavoriteChange: () => void;
  openDetailsModal: (restaurant: any) => void;
  openHoursModal: (hours: string[]) => void;
  openInGoogleMaps: (restaurant: any) => void;
  openInAppleMaps: (restaurant: any) => void;
  handleRemove: (itemId: string) => void;
  listsCache: any[];
  userRole: "owner" | "editor" | "viewer" | null;
  handleAddNote: (itemId: string) => void;
  handleDeleteNote: (itemId: string, noteId: string) => void;
  newNoteText: Record<string, string>;
  setNewNoteText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const EARTH_RADIUS_METERS = 6371000;

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

const metersToMiles = (m: number) => m * 0.000621371;

interface ListItemNote {
  id: string;
  list_item_id: string;
  user_id: string;
  note_text: string;
  created_at: string;
  user_email?: string;
}

interface ListItemRow {
  id: string;
  list_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_address: string | null;
  restaurant_source: "google" | "yelp";
  notes?: ListItemNote[];
}

const ListCard = ({
  item,
  theme,
  isFavorite,
  onFavoriteChange,
  openDetailsModal,
  openHoursModal,
  openInGoogleMaps,
  openInAppleMaps,
  handleRemove,
  listsCache,
  userRole,
  newNoteText,
  handleAddNote,
  handleDeleteNote,
  setNewNoteText,
}: ListCardProps) => {
  const e = item.enriched;

  return (
    <Card
      mode="elevated"
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          overflow: "hidden",
        },
      ]}
    >
      <View style={styles.infoSection}>
        <View style={styles.rowTop}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text
              numberOfLines={2}
              style={[styles.name, { color: theme.colors.onSurface }]}
            >
              {e?.name ?? item.restaurant_name}
            </Text>

            <View style={styles.metaRow}>
              {e?.rating != null && (
                <Text
                  style={[styles.metaText, { color: theme.colors.onSurface }]}
                >
                  ⭐ {e.rating.toFixed(1)}
                </Text>
              )}

              {e?.reviewCount != null && (
                <Text
                  style={[
                    styles.metaText,
                    { color: theme.colors.onSurface + "99" },
                  ]}
                >
                  ({e.reviewCount} reviews)
                </Text>
              )}
            </View>

            <View style={styles.hoursRow}>
              {e?.isOpen != null && (
                <Text
                  style={{
                    color: e.isOpen
                      ? theme.colors.primary
                      : theme.colors.secondary,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {e.isOpen ? "Open now" : "Closed"}
                </Text>
              )}

              {!!e?.hours?.length && (
                <TouchableOpacity onPress={() => openHoursModal(e.hours)}>
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

            {e?.address && (
              <Text
                style={[
                  styles.detail,
                  { color: theme.colors.onSurface + "99" },
                ]}
              >
                {e.address}
              </Text>
            )}

            {e?.distanceMiles != null && (
              <Text
                style={[
                  styles.detail,
                  { color: theme.colors.onSurface + "99" },
                ]}
              >
                {e.distanceMiles.toFixed(2)} mi away
              </Text>
            )}
          </View>

          {e && (
            <QuickActionsMenu
              restaurant={e}
              isFavorite={isFavorite}
              onFavoriteChange={onFavoriteChange}
              preloadedLists={listsCache}
              listsReady={true}
              onCreateNewList={() => {}}
            />
          )}
        </View>

        {/* Notes Section */}
        {/* Display Notes */}
        <View
          style={{
            marginTop: 8,
            // padding: 12,
            borderRadius: 12,

            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.outline,
          }}
        >
          {item.notes?.map((note: ListItemNote) => (
            <View key={note.id}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      color: theme.colors.onSurface,
                      marginBottom: 4,
                    }}
                  >
                    • {note.note_text}
                  </Text>
                </View>
                <IconButton
                  icon="delete-outline"
                  size={18}
                  onPress={() => handleDeleteNote(item.id, note.id)}
                  iconColor={theme.colors.error}
                  style={{ margin: 0 }}
                />
              </View>
            </View>
          ))}
        </View>
        {userRole !== "viewer" && (
          <View style={{ marginTop: 14, width: "100%" }}>
            {/* Add Note Input */}
            <View
              style={{
                borderRadius: 14,
                borderWidth: StyleSheet.hairlineWidth,
                backgroundColor: theme.dark
                  ? theme.colors.surface
                  : theme.colors.background,
                borderColor: theme.colors.outline,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                minHeight: 40,
              }}
            >
              <RNTextInput
                multiline
                value={newNoteText[item.id] || ""}
                onChangeText={(text) =>
                  setNewNoteText((prev) => ({ ...prev, [item.id]: text }))
                }
                placeholder="Add a note..."
                placeholderTextColor={theme.colors.onSurfaceVariant + "66"}
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: theme.colors.onSurface,
                  paddingVertical: 8,
                  lineHeight: 20,
                  paddingHorizontal: 0,
                  minHeight: 40, // ✅ Match container height
                  maxHeight: 100,
                  textAlignVertical: "center",
                }}
                cursorColor={theme.colors.primary} // ✅ Visible cursor
              />

              {/* Send icon button */}
              <TouchableOpacity
                onPress={() => handleAddNote(item.id)}
                disabled={!newNoteText[item.id]?.trim()}
                style={{
                  padding: 8,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color={
                    newNoteText[item.id]?.trim()
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant + "66"
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* For viewers, show notes as read-only */}
        {userRole === "viewer" && item.notes && item.notes.length > 0 && (
          <View style={{ marginTop: 14, width: "100%" }}>
            {item.notes.map((note: ListItemNote) => (
              <View
                key={note.id}
                style={{
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.dark
                    ? theme.colors.surfaceVariant
                    : theme.colors.background,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.colors.outline,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 20,
                    color: theme.colors.onSurface,
                    marginBottom: 4,
                  }}
                >
                  {note.note_text}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.colors.onSurfaceVariant + "99",
                  }}
                >
                  {note.user_email?.split("@")[0] || "Anonymous"} •{" "}
                  {new Date(note.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.linkRow}>
          <Button
            mode="outlined"
            icon="google-maps"
            textColor={theme.colors.primary}
            style={[styles.linkButton, { borderColor: theme.colors.primary }]}
            onPress={() => openInGoogleMaps(e)}
          >
            Google
          </Button>

          <Button
            mode="outlined"
            icon={Platform.OS === "ios" ? "map" : "map-marker"}
            textColor={theme.colors.tertiary}
            style={[styles.linkButton, { borderColor: theme.colors.tertiary }]}
            onPress={() => openInAppleMaps(e)}
          >
            Apple
          </Button>
        </View>
      </View>
    </Card>
  );
};

export default function ListDetailScreen({ route, navigation }: any) {
  const { listId, title } = route.params;
  const theme = useTheme();

  const modalStyle = {
    backgroundColor: theme.colors.surface,
    padding: 24,
    marginHorizontal: 16,
    borderRadius: 22,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
  };

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [hoursVisible, setHoursVisible] = useState(false);
  const [hoursForModal, setHoursForModal] = useState<string[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(
    null
  );
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [listInfo, setListInfo] = useState<{
    title: string;
    description: string | null;
  }>({
    title,
    description: null,
  });
  const hasEnrichedRef = React.useRef(false);
  const [listsCache, setListsCache] = useState<any[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);
  const [userRole, setUserRole] = useState<
    "owner" | "editor" | "viewer" | null
  >(null);
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});

  const isFocused = useIsFocused();

  const { isConnected } = useRealtimeList({
    listId,
    onItemAdded: (item) => {
      console.log("🔵 Real-time: Item added", item);
      loadItems();
    },
    onItemUpdated: (item) => {
      console.log("🟡 Real-time: Item updated", item);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ...item } : i))
      );
    },
    onItemDeleted: (itemId) => {
      console.log("🔴 Real-time: Item deleted", itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    },
    onListUpdated: (list) => {
      console.log("📝 Real-time: List updated", list);
      setListInfo({ title: list.title, description: list.description });
      navigation.setParams({ title: list.title });
    },
    onNoteChanged: () => {
      console.log("📝 Real-time: Note changed");
      loadItems();
    },
  });
  // ✅ Presence tracking
  const { activeUsers } = useListPresence(listId);

  useEffect(() => {
    if (isFocused) {
      preloadLists();
      loadUserRole();
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

  const loadUserRole = async () => {
    const role = await getUserRoleInList(listId);
    setUserRole(role);
  };

  const loadItems = async () => {
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

    if (error) {
      console.error("❌ list_items load failed:", error);
      setLoading(false);
      return;
    }

    setItems(data as any[]);

    if (!data || data.length === 0) {
      setLoading(false);
    }
  };

  const handleAddNote = async (itemId: string) => {
    if (userRole === "viewer") {
      alert("You don't have permission to add notes");
      return;
    }

    const noteText = newNoteText[itemId]?.trim();
    if (!noteText) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("list_item_notes")
        .insert({
          list_item_id: itemId,
          user_id: user.id,
          note_text: noteText,
        })
        .select()
        .single();

      if (error) throw error;

      // Add note to local state with user email
      const noteWithEmail = {
        ...data,
        user_email: user.email,
      };

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, notes: [noteWithEmail, ...(item.notes || [])] }
            : item
        )
      );

      // Clear input
      setNewNoteText((prev) => ({ ...prev, [itemId]: "" }));
    } catch (e) {
      console.error("❌ addNote failed:", e);
      alert("Failed to add note");
    }
  };

  const handleDeleteNote = async (itemId: string, noteId: string) => {
    if (userRole === "viewer") {
      alert("You don't have permission to delete notes");
      return;
    }

    try {
      const { error } = await supabase
        .from("list_item_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      // Remove note from local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                notes: item.notes?.filter(
                  (n: { id: string }) => n.id !== noteId
                ),
              }
            : item
        )
      );
    } catch (e) {
      console.error("❌ deleteNote failed:", e);
      alert("Failed to delete note");
    }
  };

  const loadLocation = async () => {
    try {
      const loc = await getLocationCached();
      setUserLocation({ lat: loc.latitude, lon: loc.longitude });
    } catch (e) {
      console.warn("⚠️ ListDetailScreen location error:", e);
    }
  };

  const loadFavorites = useCallback(async () => {
    try {
      const favs = await getFavorites();
      setFavoriteIds(new Set(favs.map((f) => f.id)));
    } catch (e) {
      console.error("❌ loadFavorites failed:", e);
    }
  }, []);

  const loadListInfo = async () => {
    const { data, error } = await supabase
      .from("lists")
      .select("title, description")
      .eq("id", listId)
      .single();

    if (!error && data) {
      setListInfo(data);
      //   setEditDescription(data.description ?? "");
    }
  };

  const enrichItems = useCallback(async () => {
    if (hasEnrichedRef.current) return;
    if (items.length === 0) return;

    try {
      const enriched = await Promise.all(
        items.map(async (item: ListItemRow) => {
          try {
            const details = await fetchRestaurantDetails(item.restaurant_id);

            let distanceMiles: number | null = null;
            const lat =
              details.geometry?.location?.lat ??
              details.geometry?.location?.latitude ??
              null;
            const lon =
              details.geometry?.location?.lng ??
              details.geometry?.location?.longitude ??
              null;

            if (
              userLocation &&
              typeof lat === "number" &&
              typeof lon === "number"
            ) {
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
                source: "google",
                name: item.restaurant_name,
                address: item.restaurant_address,
                rating: details.rating ?? null,
                reviewCount: details.user_ratings_total ?? null,
                isOpen: details.isOpen ?? null,
                hours: details.hours ?? [],
                distanceMiles,
                photos: details.photos ?? [],
                googleMapsUrl: details.googleUrl ?? null,
                lat,
                lon,
              },
            };
          } catch (err) {
            console.warn("❌ details load failed:", err);
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

  useEffect(() => {
    loadListInfo();
    loadItems();
    loadLocation();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    if (hasEnrichedRef.current) return;

    enrichItems();
  }, [enrichItems]);

  const handleRemove = async (itemId: string) => {
    if (userRole === "viewer") {
      alert("You don't have permission to remove items");
      return;
    }

    try {
      const { error } = await supabase
        .from("list_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      console.error("❌ removeFromList failed:", e);
    }
  };

  const openHoursModal = (hours: string[]) => {
    if (!hours || hours.length === 0) return;
    setHoursForModal(hours);
    setHoursVisible(true);
  };

  const openInGoogleMaps = (e: any) => {
    try {
      if (e.googleMapsUrl) {
        Linking.openURL(e.googleMapsUrl);
        return;
      }
      if (e.lat && e.lon) {
        const url = `https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lon}`;
        Linking.openURL(url);
        return;
      }
      if (e.address) {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          e.address
        )}`;
        Linking.openURL(url);
      }
    } catch (err) {
      console.error("❌ openInGoogleMaps failed:", err);
    }
  };

  const openInAppleMaps = (e: any) => {
    try {
      if (e.lat && e.lon) {
        if (Platform.OS === "ios") {
          const url = `maps://0,0?q=${encodeURIComponent(e.name)}@${e.lat},${
            e.lon
          }`;
          Linking.openURL(url);
        } else {
          const url = `https://maps.apple.com/?q=${encodeURIComponent(
            e.name
          )}&ll=${e.lat},${e.lon}`;
          Linking.openURL(url);
        }
        return;
      }

      if (e.address) {
        const base =
          Platform.OS === "ios"
            ? "maps://0,0?q="
            : "https://maps.apple.com/?q=";
        const url = `${base}${encodeURIComponent(e.address)}`;
        Linking.openURL(url);
      }
    } catch (err) {
      console.error("❌ openInAppleMaps failed:", err);
    }
  };

  const openDetailsModal = (e: any) => {
    setSelectedRestaurant(e);
  };

  const handleLeaveList = async () => {
    const success = await leaveList(listId);
    if (success) {
      navigation.goBack();
    } else {
      alert("Failed to leave list");
    }
  };

  // const ListCard = ({
  //   item,
  //   theme,
  //   isFavorite,
  //   onFavoriteChange,
  //   openDetailsModal,
  //   openHoursModal,
  //   openInGoogleMaps,
  //   openInAppleMaps,
  //   handleRemove,
  //   openNoteEditor,
  //   listsCache,
  //   userRole,
  // }: ListCardProps) => {
  //   const e = item.enriched;

  //   return (
  //     <Card
  //       mode="elevated"
  //       style={[
  //         styles.card,
  //         {
  //           backgroundColor: theme.colors.surface,
  //           overflow: "hidden",
  //         },
  //       ]}
  //     >
  //       <View style={styles.infoSection}>
  //         <View style={styles.rowTop}>
  //           <View style={{ flex: 1, paddingRight: 8 }}>
  //             <Text
  //               numberOfLines={2}
  //               style={[styles.name, { color: theme.colors.onSurface }]}
  //             >
  //               {e?.name ?? item.restaurant_name}
  //             </Text>

  //             <View style={styles.metaRow}>
  //               {e?.rating != null && (
  //                 <Text
  //                   style={[styles.metaText, { color: theme.colors.onSurface }]}
  //                 >
  //                   ⭐ {e.rating.toFixed(1)}
  //                 </Text>
  //               )}

  //               {e?.reviewCount != null && (
  //                 <Text
  //                   style={[
  //                     styles.metaText,
  //                     { color: theme.colors.onSurface + "99" },
  //                   ]}
  //                 >
  //                   ({e.reviewCount} reviews)
  //                 </Text>
  //               )}
  //             </View>

  //             <View style={styles.hoursRow}>
  //               {e?.isOpen != null && (
  //                 <Text
  //                   style={{
  //                     color: e.isOpen
  //                       ? theme.colors.primary
  //                       : theme.colors.secondary,
  //                     fontWeight: "600",
  //                     fontSize: 14,
  //                   }}
  //                 >
  //                   {e.isOpen ? "Open now" : "Closed"}
  //                 </Text>
  //               )}

  //               {!!e?.hours?.length && (
  //                 <TouchableOpacity onPress={() => openHoursModal(e.hours)}>
  //                   <Text
  //                     style={{
  //                       marginLeft: 8,
  //                       color: theme.colors.primary,
  //                       fontWeight: "600",
  //                       textDecorationLine: "underline",
  //                       fontSize: 14,
  //                     }}
  //                   >
  //                     View Hours
  //                   </Text>
  //                 </TouchableOpacity>
  //               )}
  //             </View>

  //             {e?.address && (
  //               <Text
  //                 style={[
  //                   styles.detail,
  //                   { color: theme.colors.onSurface + "99" },
  //                 ]}
  //               >
  //                 {e.address}
  //               </Text>
  //             )}

  //             {e?.distanceMiles != null && (
  //               <Text
  //                 style={[
  //                   styles.detail,
  //                   { color: theme.colors.onSurface + "99" },
  //                 ]}
  //               >
  //                 {e.distanceMiles.toFixed(2)} mi away
  //               </Text>
  //             )}
  //           </View>

  //           {e && (
  //             <QuickActionsMenu
  //               restaurant={e}
  //               isFavorite={isFavorite}
  //               onFavoriteChange={onFavoriteChange}
  //               preloadedLists={listsCache}
  //               listsReady={true}
  //               onCreateNewList={() => {}}
  //             />
  //           )}
  //         </View>

  //         {/* {item.notes && (
  //           <TouchableOpacity
  //             activeOpacity={0.9}
  //             onPress={() =>
  //               userRole !== "viewer" && openNoteEditor(item.id, item.notes)
  //             }
  //             style={{
  //               marginTop: 14,
  //               width: "100%",
  //               padding: 14,
  //               borderRadius: 14,
  //               borderWidth: StyleSheet.hairlineWidth,
  //               backgroundColor: theme.dark
  //                 ? theme.colors.surface
  //                 : theme.colors.background,
  //               borderColor: theme.colors.outline,
  //               position: "relative",
  //             }}
  //           >
  //             <Text
  //               style={{
  //                 fontSize: 14,
  //                 lineHeight: 20,
  //                 color:
  //                   theme.colors.onSurfaceVariant ?? theme.colors.onSurface,
  //               }}
  //             >
  //               {item.notes}
  //             </Text>

  //             {userRole !== "viewer" && (
  //               <View style={{ position: "absolute", top: 6, right: 6 }}>
  //                 <IconButton
  //                   icon="pencil"
  //                   size={18}
  //                   onPress={() => openNoteEditor(item.id, item.notes)}
  //                   iconColor={
  //                     theme.colors.onSurfaceVariant ?? theme.colors.onSurface
  //                   }
  //                   style={{ margin: 0 }}
  //                 />
  //               </View>
  //             )}
  //           </TouchableOpacity>
  //         )} */}
  //         {/* Notes Section */}
  //         {userRole !== "viewer" && (
  //           <View style={{ marginTop: 14, width: "100%" }}>
  //             {/* Add Note Input */}
  //             <View
  //               style={{
  //                 padding: 14,
  //                 borderRadius: 14,
  //                 borderWidth: StyleSheet.hairlineWidth,
  //                 backgroundColor: theme.dark
  //                   ? theme.colors.surface
  //                   : theme.colors.background,
  //                 borderColor: theme.colors.outline,
  //               }}
  //             >
  //               <TextInput
  //                 mode="flat"
  //                 multiline
  //                 numberOfLines={2}
  //                 value={newNoteText[item.id] || ""}
  //                 onChangeText={(text) =>
  //                   setNewNoteText((prev) => ({ ...prev, [item.id]: text }))
  //                 }
  //                 placeholder="Add a note..."
  //                 style={{
  //                   backgroundColor: "transparent",
  //                   fontSize: 14,
  //                 }}
  //                 textColor={
  //                   theme.colors.onSurfaceVariant ?? theme.colors.onSurface
  //                 }
  //                 underlineColor="transparent"
  //                 activeUnderlineColor="transparent"
  //                 right={
  //                   <TextInput.Icon
  //                     icon="send"
  //                     onPress={() => handleAddNote(item.id)}
  //                     disabled={!newNoteText[item.id]?.trim()}
  //                     color={
  //                       newNoteText[item.id]?.trim()
  //                         ? theme.colors.primary
  //                         : theme.colors.onSurfaceVariant + "66"
  //                     }
  //                   />
  //                 }
  //               />
  //             </View>

  //             {/* Display Notes */}
  //             {item.notes?.map((note: ListItemNote) => (
  //               <View
  //                 key={note.id}
  //                 style={{
  //                   marginTop: 8,
  //                   padding: 12,
  //                   borderRadius: 12,
  //                   backgroundColor: theme.dark
  //                     ? theme.colors.surfaceVariant
  //                     : theme.colors.background,
  //                   borderWidth: StyleSheet.hairlineWidth,
  //                   borderColor: theme.colors.outline,
  //                 }}
  //               >
  //                 <View
  //                   style={{
  //                     flexDirection: "row",
  //                     justifyContent: "space-between",
  //                     alignItems: "flex-start",
  //                   }}
  //                 >
  //                   <View style={{ flex: 1, paddingRight: 8 }}>
  //                     <Text
  //                       style={{
  //                         fontSize: 14,
  //                         lineHeight: 20,
  //                         color: theme.colors.onSurface,
  //                         marginBottom: 4,
  //                       }}
  //                     >
  //                       {note.note_text}
  //                     </Text>
  //                     <Text
  //                       style={{
  //                         fontSize: 12,
  //                         color: theme.colors.onSurfaceVariant + "99",
  //                       }}
  //                     >
  //                       {note.user_email?.split("@")[0] || "Anonymous"} •{" "}
  //                       {new Date(note.created_at).toLocaleDateString()}
  //                     </Text>
  //                   </View>
  //                   <IconButton
  //                     icon="delete-outline"
  //                     size={18}
  //                     onPress={() => handleDeleteNote(item.id, note.id)}
  //                     iconColor={theme.colors.error}
  //                     style={{ margin: 0 }}
  //                   />
  //                 </View>
  //               </View>
  //             ))}
  //           </View>
  //         )}

  //         {/* For viewers, show notes as read-only */}
  //         {userRole === "viewer" && item.notes && item.notes.length > 0 && (
  //           <View style={{ marginTop: 14, width: "100%" }}>
  //             {item.notes.map((note: ListItemNote) => (
  //               <View
  //                 key={note.id}
  //                 style={{
  //                   marginTop: 8,
  //                   padding: 12,
  //                   borderRadius: 12,
  //                   backgroundColor: theme.dark
  //                     ? theme.colors.surfaceVariant
  //                     : theme.colors.background,
  //                   borderWidth: StyleSheet.hairlineWidth,
  //                   borderColor: theme.colors.outline,
  //                 }}
  //               >
  //                 <Text
  //                   style={{
  //                     fontSize: 14,
  //                     lineHeight: 20,
  //                     color: theme.colors.onSurface,
  //                     marginBottom: 4,
  //                   }}
  //                 >
  //                   {note.note_text}
  //                 </Text>
  //                 <Text
  //                   style={{
  //                     fontSize: 12,
  //                     color: theme.colors.onSurfaceVariant + "99",
  //                   }}
  //                 >
  //                   {note.user_email?.split("@")[0] || "Anonymous"} •{" "}
  //                   {new Date(note.created_at).toLocaleDateString()}
  //                 </Text>
  //               </View>
  //             ))}
  //           </View>
  //         )}
  //         <View style={styles.linkRow}>
  //           <Button
  //             mode="outlined"
  //             icon="google-maps"
  //             textColor={theme.colors.primary}
  //             style={[styles.linkButton, { borderColor: theme.colors.primary }]}
  //             onPress={() => openInGoogleMaps(e)}
  //           >
  //             Google
  //           </Button>

  //           <Button
  //             mode="outlined"
  //             icon={Platform.OS === "ios" ? "map" : "map-marker"}
  //             textColor={theme.colors.tertiary}
  //             style={[
  //               styles.linkButton,
  //               { borderColor: theme.colors.tertiary },
  //             ]}
  //             onPress={() => openInAppleMaps(e)}
  //           >
  //             Apple
  //           </Button>
  //         </View>
  //       </View>
  //     </Card>
  //   );
  // };

  const renderItem = ({ item }: { item: any }) => {
    const e = item.enriched;
    const isFavorite = e ? favoriteIds.has(e.id) : false;

    return (
      <ListCard
        item={item}
        theme={theme}
        isFavorite={isFavorite}
        onFavoriteChange={loadFavorites}
        openDetailsModal={openDetailsModal}
        openHoursModal={openHoursModal}
        openInGoogleMaps={openInGoogleMaps}
        openInAppleMaps={openInAppleMaps}
        handleRemove={handleRemove}
        listsCache={listsCache}
        userRole={userRole}
        handleAddNote={handleAddNote}
        handleDeleteNote={handleDeleteNote}
        newNoteText={newNoteText}
        setNewNoteText={setNewNoteText}
      />
    );
  };

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
        pointerEvents="none"
        colors={[theme.colors.background, theme.colors.surface]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.headerRow}>
        <IconButton
          icon="chevron-left"
          size={26}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.onSurface}
        />

        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
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

      {!loading && items.length === 0 && (
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
            justifyContent: "center",
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

      <FlatList
        data={items}
        keyExtractor={(i) => i.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      />

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
          {hoursForModal.length > 0 ? (
            hoursForModal.map((line, idx) => (
              <Text
                key={idx}
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 4,
                }}
              >
                {line}
              </Text>
            ))
          ) : (
            <Text style={{ color: theme.colors.onSurface + "99" }}>
              Hours unavailable
            </Text>
          )}

          <Button
            mode="contained"
            onPress={() => setHoursVisible(false)}
            style={{ marginTop: 12 }}
          >
            Close
          </Button>
        </Modal>
      </Portal>

      <RestaurantDetailModal
        visible={!!selectedRestaurant}
        onDismiss={() => setSelectedRestaurant(null)}
        restaurant={selectedRestaurant}
      />

      {/* <ShareListModal
        visible={shareVisible}
        onDismiss={() => setShareVisible(false)}
        listId={listId}
        listTitle={listInfo.title}
        isOwner={userRole === "owner"}
      /> */}

      {/* Settings Modal (combines Edit + Share) */}
      <ListSettingsModal
        visible={settingsVisible}
        onDismiss={() => setSettingsVisible(false)}
        listId={listId}
        listTitle={listInfo.title}
        listDescription={listInfo.description}
        isOwner={userRole === "owner"}
        onListUpdated={(newTitle, newDescription) => {
          setListInfo({ title: newTitle, description: newDescription });
          navigation.setParams({ title: newTitle });
        }}
      />

      {/* Simple Delete Confirmation Modal */}
      <Portal>
        <Modal
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          contentContainerStyle={modalStyle}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 16,
              color: theme.colors.onSurface,
            }}
          >
            List Options
          </Text>

          {userRole === "owner" && (
            <Button
              mode="contained-tonal"
              style={{
                backgroundColor: theme.colors.secondary,
                borderRadius: 12,
                paddingVertical: 6,
                marginBottom: 12,
              }}
              textColor={theme.colors.surface}
              onPress={() => {
                setMenuVisible(false);
                setDeleteVisible(true);
              }}
            >
              Delete List
            </Button>
          )}

          {userRole !== "owner" && (
            <Button
              mode="contained-tonal"
              icon="exit-to-app"
              style={{
                backgroundColor: theme.colors.secondary,
                borderRadius: 12,
                paddingVertical: 6,
              }}
              textColor={theme.colors.surface}
              onPress={() => {
                setMenuVisible(false);
                handleLeaveList();
              }}
            >
              Leave List
            </Button>
          )}
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={deleteVisible}
          onDismiss={() => setDeleteVisible(false)}
          contentContainerStyle={modalStyle}
        >
          <Text
            style={{
              fontSize: 21,
              fontWeight: "700",
              marginBottom: 16,
              color: theme.colors.onSurface,
            }}
          >
            Delete List
          </Text>

          <Text
            style={{
              marginBottom: 24,
              color: theme.colors.onSurfaceVariant,
              lineHeight: 20,
            }}
          >
            Are you sure you want to delete this list? All saved restaurants
            will be removed.
          </Text>

          <Button
            mode="contained"
            onPress={async () => {
              await deleteList(listId);
              setDeleteVisible(false);
              navigation.goBack();
            }}
            textColor={theme.colors.surface}
            style={{
              backgroundColor: theme.colors.secondary,
              borderRadius: 12,
              paddingVertical: 6,
              marginBottom: 10,
            }}
          >
            Delete
          </Button>

          <Button
            mode="text"
            onPress={() => setDeleteVisible(false)}
            textColor={theme.colors.onSurface}
          >
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
    gap: 4,
  },
  card: {
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
  },
  infoSection: {
    padding: 14,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hoursModalContainer: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
  },
  hoursTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
    marginRight: 6,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  detail: {
    fontSize: 14,
    marginTop: 6,
  },
  linkRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  linkButton: {
    borderRadius: 20,
    flexGrow: 1,
  },
  headerTitle: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors?.onSurface ?? "#000",
  },
});
