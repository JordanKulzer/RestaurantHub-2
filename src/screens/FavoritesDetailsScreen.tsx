// src/screens/FavoritesDetailScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  StyleSheet,
  Linking,
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
import { getFavorites } from "../utils/favoritesApis";
import { fetchRestaurantDetails } from "../utils/placesApi";
import QuickActionsMenu from "../components/QuickActionsMenu";
import RestaurantDetailModal from "../components/RestaurantDetailModal";
import { getLocationCached } from "../utils/locationHelper";
import { supabase } from "../utils/supabaseClient";

const EARTH_RADIUS_METERS = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
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

export default function FavoritesDetailScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { title } = route.params;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(
    null
  );
  const [editingNoteForId, setEditingNoteForId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [hoursVisible, setHoursVisible] = useState(false);
  const [hoursForModal, setHoursForModal] = useState<string[]>([]);

  const openHoursModal = (hours: string[]) => {
    setHoursForModal(hours);
    setHoursVisible(true);
  };

  // ----------------------------------------
  // Load favorites
  // ----------------------------------------
  const loadFavorites = async () => {
    const data = await getFavorites();
    setItems(data);
  };

  // ----------------------------------------
  // Location
  // ----------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const { latitude, longitude } = await getLocationCached();
        setLocation({ lat: latitude, lon: longitude });
      } catch (e) {
        console.warn("⚠️ FavoritesDetailScreen location error:", e);
      }
    })();
  }, []);

  useEffect(() => {
    loadFavorites();
  }, []);

  // ----------------------------------------
  // Enrich favorites
  // ----------------------------------------
  const enrich = useCallback(async () => {
    try {
      const enriched = await Promise.all(
        items.map(async (fav) => {
          try {
            const d = await fetchRestaurantDetails(fav.id);

            const lat =
              d.geometry?.location?.lat ??
              d.geometry?.location?.latitude ??
              null;

            const lon =
              d.geometry?.location?.lng ??
              d.geometry?.location?.longitude ??
              null;

            let distanceMiles = null;
            if (
              location &&
              typeof lat === "number" &&
              typeof lon === "number"
            ) {
              const meters = getDistanceMeters(
                location.lat,
                location.lon,
                lat,
                lon
              );
              distanceMiles = parseFloat(metersToMiles(meters).toFixed(1));
            }

            return {
              ...fav,
              enriched: {
                id: fav.id,
                name: d.name ?? fav.name,
                address:
                  d.formatted_address ?? d.address ?? fav.address ?? null,

                rating: d.rating ?? null,
                reviewCount: d.user_ratings_total ?? null,
                isOpen: d.isOpen ?? null,
                hours: d.hours ?? [],
                price: d.price_level_symbol ?? d.price ?? null,

                distanceMiles,

                photos: d.photos ?? [],
                googleMapsUrl: d.googleUrl ?? d.website ?? null,

                lat,
                lon,
              },
            };
          } catch (err) {
            console.warn("❌ enrich failed:", err);
            return { ...fav, enriched: null };
          }
        })
      );

      setItems(enriched);
    } finally {
      setLoading(false);
    }
  }, [items, location]);

  useEffect(() => {
    if (items.length > 0) enrich();
    else setLoading(false);
  }, [items.length, location]);

  // ----------------------------------------
  // Maps
  // ----------------------------------------
  const openGoogleMaps = (e: any) => {
    if (!e) return;
    if (e.googleMapsUrl) {
      Linking.openURL(e.googleMapsUrl);
      return;
    }
    if (e.lat && e.lon) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lon}`
      );
    }
  };

  const openAppleMaps = (e: any) => {
    if (!e) return;

    if (Platform.OS === "ios" && e.lat && e.lon) {
      Linking.openURL(
        `maps://0,0?q=${encodeURIComponent(e.name)}@${e.lat},${e.lon}`
      );
      return;
    }

    if (e.lat && e.lon) {
      Linking.openURL(
        `https://maps.apple.com/?q=${encodeURIComponent(e.name)}&ll=${e.lat},${
          e.lon
        }`
      );
    }
  };

  const handleSaveNote = async (favId: string, note: string) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .update({ notes: note || null })
        .eq("id", favId);

      if (error) throw error;

      setItems((prev) =>
        prev.map((item) =>
          item.uuid === favId ? { ...item, notes: note || null } : item
        )
      );

      setEditingNoteForId(null);
      setNoteText("");
    } catch (err) {
      console.error("❌ saveFavoriteNote failed:", err);
    }
  };

  const openNoteEditor = (id: string, currentNote: string | null) => {
    setEditingNoteForId(id);
    setNoteText(currentNote || "");
  };

  // ----------------------------------------
  // Render card
  // ----------------------------------------
  const renderItem = ({ item }: any) => {
    const e = item.enriched;

    const photo =
      e?.photos?.[0] ??
      "https://upload.wikimedia.org/wikipedia/commons/ac/No_image_available.svg";

    const photos = e?.photos?.length ? e.photos : [photo];

    return (
      <Card
        mode="elevated"
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        {/* Photo Section */}
        {/* <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (photos.length > 1) {
              const next = (photoIndex + 1) % photos.length;
              setPhotoIndex(next);
            }
          }}
          onLongPress={() => e && setSelectedRestaurant(e)}
        >
          <Image source={{ uri: photos[photoIndex] }} style={styles.thumb} />

          {photos.length > 1 && (
            <>
              <View style={styles.photoIndicator}>
                <Text style={styles.photoIndicatorText}>
                  {photoIndex + 1}/{photos.length}
                </Text>
              </View>

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
        </TouchableOpacity> */}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                numberOfLines={2}
                style={[styles.name, { color: theme.colors.onSurface }]}
              >
                {e?.name}
              </Text>

              {/* Rating + price + review count */}
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

                {e?.price && (
                  <Text
                    style={[
                      styles.metaText,
                      { color: theme.colors.onSurface + "99" },
                    ]}
                  >
                    • {e.price}
                  </Text>
                )}
              </View>

              {/* Open/Closed + Hours */}
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

              {/* Address */}
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

              {/* Distance */}
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

            {/* Action Menu */}
            {e && (
              <QuickActionsMenu
                restaurant={e}
                isFavorite={true}
                onFavoriteChange={loadFavorites}
                onCreateNewList={() => {}}
              />
            )}
          </View>

          {/* Notes (full width) */}
          {item.notes && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => openNoteEditor(item.uuid, item.notes)}
              style={{
                width: "100%",
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                borderWidth: StyleSheet.hairlineWidth,
                backgroundColor: theme.dark
                  ? theme.colors.surface
                  : theme.colors.background,
                borderColor: theme.colors.outline,
                position: "relative",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color:
                    theme.colors.onSurfaceVariant ?? theme.colors.onSurface,
                }}
              >
                {item.notes}
              </Text>

              <View style={{ position: "absolute", top: 6, right: 6 }}>
                <IconButton
                  icon="pencil"
                  size={18}
                  onPress={() => openNoteEditor(item.uuid, item.notes)}
                  iconColor={
                    theme.colors.onSurfaceVariant ?? theme.colors.onSurface
                  }
                  style={{ margin: 0 }}
                />
              </View>
            </TouchableOpacity>
          )}

          {/* Add Note (full width) */}
          {!item.notes && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => openNoteEditor(item.uuid, null)}
              style={{
                width: "100%",
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                borderWidth: StyleSheet.hairlineWidth,
                backgroundColor: theme.dark
                  ? theme.colors.surface
                  : theme.colors.background,
                borderColor: theme.colors.outline,
                position: "relative",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color:
                    theme.colors.onSurfaceVariant ?? theme.colors.onSurface,
                }}
              >
                Add Note
              </Text>

              <View style={{ position: "absolute", top: 6, right: 6 }}>
                <IconButton
                  icon="note-plus"
                  size={18}
                  onPress={() => openNoteEditor(item.uuid, null)}
                  iconColor={
                    theme.colors.onSurfaceVariant ?? theme.colors.onSurface
                  }
                  style={{ margin: 0 }}
                />
              </View>
            </TouchableOpacity>
          )}

          {/* Maps Buttons */}
          <View style={styles.linkRow}>
            <Button
              mode="outlined"
              icon="google-maps"
              textColor={theme.colors.primary}
              style={[styles.linkButton, { borderColor: theme.colors.primary }]}
              onPress={() => openGoogleMaps(e)}
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
              onPress={() => openAppleMaps(e)}
            >
              Apple
            </Button>
          </View>
        </View>
      </Card>
    );
  };

  // ---------------------------------------------------
  // Loading State
  // ---------------------------------------------------
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
      {/* Header */}
      <View style={styles.headerRow}>
        <IconButton
          icon="chevron-left"
          size={26}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.onSurface}
        />
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
      {/* Empty State */}
      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={{ color: theme.colors.onSurface, fontSize: 16 }}>
            No favorites yet
          </Text>
          <Text
            style={{
              color: theme.colors.onSurfaceVariant,
              fontSize: 13,
              marginTop: 6,
              textAlign: "center",
            }}
          >
            Swipe right on restaurants to favorite them.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        />
      )}
      {/* Full Detail Modal */}
      <RestaurantDetailModal
        visible={!!selectedRestaurant}
        restaurant={selectedRestaurant}
        onDismiss={() => setSelectedRestaurant(null)}
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
      <Portal>
        <Modal
          visible={!!editingNoteForId}
          onDismiss={() => {
            setEditingNoteForId(null);
            setNoteText("");
          }}
          contentContainerStyle={{
            backgroundColor: theme.colors.surface,
            padding: 24,
            marginHorizontal: 16,
            borderRadius: 22,
          }}
        >
          <Text
            style={{
              fontSize: 21,
              fontWeight: "700",
              marginBottom: 18,
              color: theme.colors.onSurface,
            }}
          >
            Favorite Note
          </Text>

          <TextInput
            label="Add your notes"
            value={noteText}
            onChangeText={setNoteText}
            multiline
            mode="outlined"
            numberOfLines={4}
            style={{ marginBottom: 24 }}
          />

          <Button
            mode="contained"
            textColor={theme.colors.surface}
            style={{
              backgroundColor: theme.colors.tertiary,
              borderRadius: 12,
              paddingVertical: 6,
              marginBottom: 10,
            }}
            onPress={() => {
              if (editingNoteForId) {
                handleSaveNote(editingNoteForId, noteText);
              }
            }}
          >
            Save Note
          </Button>

          <Button
            mode="text"
            textColor={theme.colors.onSurface}
            onPress={() => {
              setEditingNoteForId(null);
              setNoteText("");
            }}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },

  emptyBox: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
});
