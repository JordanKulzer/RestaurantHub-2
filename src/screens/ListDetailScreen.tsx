// src/screens/ListDetailScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Platform,
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
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "../utils/supabaseClient";
import { fetchRestaurantDetails } from "../utils/placesApi";
import QuickActionsMenu from "../components/QuickActionsMenu";
import { getFavorites } from "../utils/favoritesApis";
import RestaurantDetailModal from "../components/RestaurantDetailModal";
import { deleteList, updateList } from "../utils/listsApi";
import { theme } from "../theme";
import { getLocationCached } from "../utils/locationHelper";

interface ListCardProps {
  item: any; // we can refine this further if needed
  theme: any;
  isFavorite: boolean;
  onFavoriteChange: () => void;
  openDetailsModal: (restaurant: any) => void;
  openHoursModal: (hours: string[]) => void;
  openInGoogleMaps: (restaurant: any) => void;
  openInAppleMaps: (restaurant: any) => void;
  handleRemove: (itemId: string) => void;
}

// Distance helpers (same math as your other utilities)
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

interface ListItemRow {
  id: string;
  list_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_address: string | null;
  restaurant_source: "google" | "yelp";
}

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
  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState("");
  const [listInfo, setListInfo] = useState<{
    title: string;
    description: string | null;
  }>({
    title,
    description: null,
  });
  // -------------------------------------------------------------
  // Load basic list items
  // -------------------------------------------------------------
  const loadItems = async () => {
    const { data, error } = await supabase
      .from("list_items")
      .select("*")
      .eq("list_id", listId);

    if (error) {
      console.error("❌ list_items load failed:", error);
      setLoading(false);
      return;
    }

    setItems(data as ListItemRow[]);

    // ✅ If empty list, stop loading immediately
    if (!data || data.length === 0) {
      setLoading(false);
    }
  };
  // -------------------------------------------------------------
  // Location for distance
  // -------------------------------------------------------------
  const loadLocation = async () => {
    try {
      const loc = await getLocationCached(); // handles permission + caching
      setUserLocation({ lat: loc.latitude, lon: loc.longitude });
    } catch (e) {
      console.warn("⚠️ ListDetailScreen location error:", e);
    }
  };
  // -------------------------------------------------------------
  // Favorites
  // -------------------------------------------------------------
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
      setEditDescription(data.description ?? "");
    }
  };

  // -------------------------------------------------------------
  // Enrich items with Google details + distance
  // -------------------------------------------------------------
  const enrichItems = useCallback(async () => {
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
    enrichItems();
  }, [items, userLocation]);

  // -------------------------------------------------------------
  // Remove from list
  // -------------------------------------------------------------
  const handleRemove = async (itemId: string) => {
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

  // -------------------------------------------------------------
  // Hours modal helpers
  // -------------------------------------------------------------
  const openHoursModal = (hours: string[]) => {
    if (!hours || hours.length === 0) return;
    setHoursForModal(hours);
    setHoursVisible(true);
  };

  // -------------------------------------------------------------
  // Maps helpers
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // Detail modal
  // -------------------------------------------------------------
  const openDetailsModal = (e: any) => {
    setSelectedRestaurant(e);
  };

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
  }: ListCardProps) => {
    const e = item.enriched;

    const [photoIndex, setPhotoIndex] = useState(0);

    const photo =
      e?.photos?.[0] ??
      "https://upload.wikimedia.org/wikipedia/commons/ac/No_image_available.svg";
    const photos = e?.photos?.length ? e.photos : [photo];

    return (
      <Card
        mode="elevated"
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <View style={{ position: "relative" }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              const next = (photoIndex + 1) % photos.length;
              setPhotoIndex(next);
            }}
            onLongPress={() => e && openDetailsModal(e)}
          >
            <View style={{ position: "relative" }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  const next = (photoIndex + 1) % photos.length;
                  setPhotoIndex(next);
                }}
                onLongPress={() => e && openDetailsModal(e)}
              >
                <Image
                  source={{ uri: photos[photoIndex] }}
                  style={styles.thumb}
                />

                {/* NEW: photo counter indicator */}
                {photos.length > 1 && (
                  <>
                    <View style={styles.photoIndicator}>
                      <Text style={styles.photoIndicatorText}>
                        {`${photoIndex + 1}/${photos.length}`}
                      </Text>
                    </View>

                    {/* Existing badge */}
                    <View
                      style={[
                        styles.hintBadge,
                        { backgroundColor: theme.colors.secondary + "CC" },
                      ]}
                    >
                      <Text style={styles.hintText}>Tap for more photos</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

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
                    {`⭐ ${e.rating.toFixed(1)}`}
                  </Text>
                )}

                {e?.reviewCount != null && (
                  <Text
                    style={[
                      styles.metaText,
                      { color: theme.colors.onSurface + "99" },
                    ]}
                  >
                    {`(${e.reviewCount} reviews)`}
                  </Text>
                )}

                {e?.price && (
                  <Text
                    style={[
                      styles.metaText,
                      { color: theme.colors.onSurface + "99" },
                    ]}
                  >
                    {`• ${e.price}`}
                  </Text>
                )}
              </View>

              <View style={styles.hoursRow}>
                {e?.isOpen != null && (
                  <Text
                    style={[
                      styles.metaText,
                      {
                        color: e.isOpen
                          ? theme.colors.primary
                          : theme.colors.secondary,
                        fontWeight: "600",
                      },
                    ]}
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
                  {`${e.distanceMiles.toFixed(2)} mi away`}
                </Text>
              )}
            </View>

            {e && (
              <QuickActionsMenu
                restaurant={e}
                isFavorite={isFavorite}
                onFavoriteChange={onFavoriteChange}
                onCreateNewList={() => {}}
              />
            )}
          </View>

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
              style={[
                styles.linkButton,
                { borderColor: theme.colors.tertiary },
              ]}
              onPress={() => openInAppleMaps(e)}
            >
              Apple
            </Button>
          </View>
        </View>
      </Card>
    );
  };

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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <LinearGradient
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

        <Text style={styles.headerTitle}>{title}</Text>

        <IconButton
          icon="dots-vertical"
          size={24}
          onPress={() => setMenuVisible(true)}
          iconColor={theme.colors.onSurface}
        />
      </View>

      {/* List Description Section */}
      {listInfo?.description && listInfo.description.trim().length > 0 && (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 10,
            padding: 14,
            borderRadius: 14,
            backgroundColor: theme.colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.outline,
          }}
        >
          <Text
            style={{
              color: theme.colors.onSurface,
              fontSize: 15,
              lineHeight: 20,
            }}
          >
            {listInfo.description}
          </Text>
        </View>
      )}

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

          <Text
            style={{
              fontSize: 14,
              color: theme.colors.onSurfaceVariant,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 18,
            }}
          >
            Add restaurants from anywhere in the app using the “Add to List”
            button.
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

      {/* Hours Modal */}
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
          {hoursForModal.map((line, idx) => (
            <Text
              key={idx}
              style={{
                color: theme.colors.onSurfaceVariant,
                marginBottom: 4,
              }}
            >
              {line}
            </Text>
          ))}
          <Button
            mode="contained"
            onPress={() => setHoursVisible(false)}
            style={{ marginTop: 12 }}
          >
            Close
          </Button>
        </Modal>
      </Portal>

      {/* Full Detail Modal */}
      <RestaurantDetailModal
        visible={!!selectedRestaurant}
        onDismiss={() => setSelectedRestaurant(null)}
        restaurant={selectedRestaurant}
      />
      {/* Edit / Delete Modal */}
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

          <Button
            mode="contained-tonal"
            onPress={() => {
              setMenuVisible(false);
              setEditVisible(true);
            }}
            style={{
              marginBottom: 12,
              backgroundColor: theme.colors.tertiary,
              borderRadius: 12,
              paddingVertical: 6,
            }}
            textColor={theme.colors.surface}
          >
            Edit List
          </Button>

          <Button
            mode="contained-tonal"
            style={{
              backgroundColor: theme.colors.secondary,
              borderRadius: 12,
              paddingVertical: 6,
            }}
            textColor={theme.colors.surface}
            onPress={() => {
              setMenuVisible(false);
              setDeleteVisible(true);
            }}
          >
            Delete List
          </Button>
        </Modal>
      </Portal>
      {/* Edit List Modal */}
      <Portal>
        <Modal
          visible={editVisible}
          onDismiss={() => setEditVisible(false)}
          contentContainerStyle={modalStyle}
        >
          <Text
            style={{
              fontSize: 21,
              fontWeight: "700",
              marginBottom: 18,
              color: theme.colors.onSurface,
            }}
          >
            Edit List
          </Text>

          <TextInput
            label="Title"
            value={editTitle}
            onChangeText={setEditTitle}
            mode="outlined"
            style={{ marginBottom: 14 }}
          />

          <TextInput
            label="Description (optional)"
            value={editDescription}
            onChangeText={setEditDescription}
            multiline
            mode="outlined"
            style={{ marginBottom: 24 }}
          />

          <Button
            mode="contained"
            onPress={async () => {
              const newDescription =
                editDescription.trim() === "" ? null : editDescription;

              await updateList(listId, {
                title: editTitle,
                description: newDescription,
              });

              setListInfo({
                title: editTitle,
                description: newDescription,
              });

              navigation.setParams({ title: editTitle });
              setEditVisible(false);
            }}
            textColor={theme.colors.surface}
            style={{
              backgroundColor: theme.colors.tertiary, // forest green
              borderRadius: 12,
              paddingVertical: 6,
              marginBottom: 10,
            }}
          >
            Save Changes
          </Button>

          <Button
            mode="text"
            onPress={() => setEditVisible(false)}
            textColor={theme.colors.onSurface}
            style={{ marginTop: 4 }}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>

      {/* Delete List Modal */}
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
              backgroundColor: theme.colors.secondary, // burnt orange
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
    paddingVertical: 12,
    gap: 4,
  },
  card: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 3,
  },
  thumb: {
    height: 170,
    width: "100%",
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
  hintBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  hintText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  photoIndicator: {
    position: "absolute",
    bottom: 8,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  photoIndicatorText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors?.onSurface ?? "#000",
  },
});
