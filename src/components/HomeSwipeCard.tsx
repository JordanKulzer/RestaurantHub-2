import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import {
  Card,
  Text,
  Button,
  useTheme,
  Portal,
  Modal,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import ImageViewing from "react-native-image-viewing";
import { fetchYelpDetails } from "../utils/yelpApi";

export default function HomeSwipeCard({ restaurant }: any) {
  const theme = useTheme();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [photos, setPhotos] = useState<string[]>([
    restaurant.image ||
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png",
  ]);
  const [hasLoadedDetails, setHasLoadedDetails] = useState(false);
  const [hoursVisible, setHoursVisible] = useState(false);
  const [hours, setHours] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState<boolean | null>(
    restaurant.isOpen ?? null
  );

  useEffect(() => {
    let mounted = true;
    const loadDetails = async () => {
      try {
        const details = await fetchYelpDetails(restaurant.id);
        if (!mounted) return;

        if (details?.photos?.length > 1) setPhotos(details.photos);
        if (details?.hours) setHours(details.hours);
        if (typeof details?.isOpen === "boolean") setIsOpen(details.isOpen);
        setHasLoadedDetails(true);
      } catch (err) {
        console.warn("⚠️ Prefetch failed:", err);
      }
    };
    loadDetails();
    return () => {
      mounted = false;
    };
  }, [restaurant.id]);

  const handleNextPhoto = async () => {
    if (!hasLoadedDetails && restaurant.id) {
      try {
        const details = await fetchYelpDetails(restaurant.id);
        if (details?.photos?.length > 1) setPhotos(details.photos);
      } catch (err) {
        console.warn("⚠️ Failed to fetch Yelp photos:", err);
      }
      setHasLoadedDetails(true);
    }
    if (photos.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % photos.length);
  };

  return (
    <Card
      mode="elevated"
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handleNextPhoto}>
        <Image
          source={{ uri: photos[activeIndex] }}
          style={styles.carouselImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)"]}
          style={StyleSheet.absoluteFillObject}
        />

        {photos.length > 1 && (
          <View style={styles.photoIndicator}>
            <Text style={styles.photoIndicatorText}>
              {activeIndex + 1}/{photos.length}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.hintBadge,
            { backgroundColor: theme.colors.secondary + "CC" },
          ]}
        >
          <Text style={styles.hintText}>Tap for more photos</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.infoSection}>
        <Text style={[styles.name, { color: theme.colors.onSurface }]}>
          {restaurant.name}
        </Text>
        <View style={styles.metaRow}>
          {restaurant.rating && (
            <Text style={[styles.metaText, { color: theme.colors.onSurface }]}>
              ⭐ {restaurant.rating.toFixed(1)} / 5.0
            </Text>
          )}
          {restaurant.reviews && (
            <Text
              style={[
                styles.metaText,
                { color: theme.colors.onSurface + "99" },
              ]}
            >
              ({restaurant.reviews})
            </Text>
          )}
          {restaurant.price && (
            <Text
              style={[
                styles.metaText,
                { color: theme.colors.onSurface + "99" },
              ]}
            >
              • {restaurant.price}
            </Text>
          )}
        </View>

        <View style={styles.hoursRow}>
          {isOpen !== null && (
            <Text
              style={[
                styles.metaText,
                {
                  color: isOpen ? theme.colors.primary : theme.colors.secondary,
                  fontWeight: "600",
                },
              ]}
            >
              {isOpen ? "Open now" : "Closed"}
            </Text>
          )}

          <Button
            mode="contained-tonal"
            compact
            onPress={() => setHoursVisible(true)}
            textColor={theme.colors.primary}
            style={{ marginLeft: 8, borderRadius: 20, paddingHorizontal: 10 }}
            labelStyle={{ fontWeight: "600" }}
          >
            View Hours
          </Button>
        </View>

        {restaurant.categories && (
          <Text
            style={[
              styles.categories,
              { color: theme.colors.onSurface + "99" },
            ]}
          >
            {restaurant.categories}
          </Text>
        )}
        {restaurant.address && (
          <Text
            style={[styles.detail, { color: theme.colors.onSurface + "99" }]}
          >
            {restaurant.address}
          </Text>
        )}
        {restaurant.distanceMiles && (
          <Text
            style={[styles.detail, { color: theme.colors.onSurface + "99" }]}
          >
            {restaurant.distanceMiles} mi away
          </Text>
        )}

        <View style={styles.linkRow}>
          {restaurant.yelpUrl && (
            <Button
              mode="outlined"
              icon="open-in-new"
              textColor={theme.colors.secondary}
              style={[
                styles.linkButton,
                {
                  flex: 1,
                  marginRight: 6,
                  borderColor: theme.colors.secondary,
                },
              ]}
              onPress={() => Linking.openURL(restaurant.yelpUrl)}
            >
              Yelp
            </Button>
          )}

          {/* Google Maps fallback (placeId OR name/address) */}
          <Button
            mode="outlined"
            icon="google-maps"
            textColor={theme.colors.tertiary}
            style={[
              styles.linkButton,
              {
                flex: 1,
                marginRight: Platform.OS === "ios" ? 6 : 0,
                borderColor: theme.colors.tertiary,
              },
            ]}
            onPress={() => {
              if (restaurant.placeId) {
                Linking.openURL(
                  `https://www.google.com/maps/place/?q=place_id:${restaurant.placeId}`
                );
              } else {
                const query = encodeURIComponent(
                  `${restaurant.name} ${restaurant.address || ""}`.trim()
                );
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${query}`
                );
              }
            }}
          >
            Google
          </Button>

          {/* Apple Maps */}
          {Platform.OS === "ios" && (
            <Button
              mode="outlined"
              icon="map"
              textColor={theme.colors.primary}
              style={[
                styles.linkButton,
                { flex: 1, borderColor: theme.colors.primary },
              ]}
              onPress={() => {
                const encoded = encodeURIComponent(
                  `${restaurant.name} ${restaurant.address || ""}`.trim()
                );
                Linking.openURL(`http://maps.apple.com/?q=${encoded}`);
              }}
            >
              Apple
            </Button>
          )}
        </View>
      </View>

      <ImageViewing
        images={photos.map((p) => ({ uri: p }))}
        imageIndex={activeIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />
      <Portal>
        <Modal
          visible={hoursVisible}
          onDismiss={() => setHoursVisible(false)}
          contentContainerStyle={[
            styles.hoursModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.hoursTitle, { color: theme.colors.onSurface }]}>
            Hours
          </Text>

          {hours.length > 0 ? (
            hours.map((entry: any, i: number) => {
              const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
              const dayLabel = days[entry.day];
              return (
                <Text
                  key={i}
                  style={[
                    styles.hoursText,
                    { color: theme.colors.onSurface + "CC" },
                  ]}
                >
                  {dayLabel}: {entry.start.slice(0, 2)}:{entry.start.slice(2)} –{" "}
                  {entry.end.slice(0, 2)}:{entry.end.slice(2)}
                </Text>
              );
            })
          ) : (
            <Text style={{ color: theme.colors.onSurface + "99" }}>
              Hours unavailable
            </Text>
          )}

          <Button onPress={() => setHoursVisible(false)}>Close</Button>
        </Modal>
      </Portal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 0 },
  carouselImage: { width: "100%", height: 240 },
  infoSection: { padding: 16 },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  categories: { fontSize: 14, marginBottom: 6 },
  detail: { fontSize: 13, marginBottom: 3 },
  photoIndicator: {
    position: "absolute",
    bottom: 8,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  photoIndicatorText: { color: "#fff", fontSize: 12 },
  hintBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hintText: { color: "#fff", fontSize: 13, fontWeight: "500" },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginTop: 10,
  },
  linkButton: {
    borderRadius: 25,
    minWidth: 100,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  metaText: {
    fontSize: 14,
    marginRight: 6,
  },
  hoursModal: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    alignSelf: "center",
  },
  hoursTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  hoursText: {
    fontSize: 14,
    marginVertical: 2,
    textAlign: "center",
  },
});
