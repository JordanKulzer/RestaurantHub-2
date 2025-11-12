import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Animated,
  Easing,
} from "react-native";
import {
  Card,
  Text,
  Button,
  useTheme,
  Portal,
  Modal,
  IconButton,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import ImageViewing from "react-native-image-viewing";
import { fetchYelpDetails } from "../utils/yelpApi";

interface HomeSwipeCardProps {
  restaurant: any;
  onLike?: () => void;
  onDislike?: () => void;
  onUndo?: () => void;
}

export default function HomeSwipeCard({
  restaurant,
  onLike,
  onDislike,
  onUndo,
}: HomeSwipeCardProps) {
  const theme = useTheme();
  const defaultPhoto =
    restaurant.image ||
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png";

  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [photos, setPhotos] = useState<string[]>([defaultPhoto]);
  const [hasLoadedDetails, setHasLoadedDetails] = useState(false);
  const [hoursVisible, setHoursVisible] = useState(false);
  const [hours, setHours] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState<boolean | null>(
    restaurant.isOpen ?? null
  );
  const likeScale = useRef(new Animated.Value(1)).current;
  const dislikeScale = useRef(new Animated.Value(1)).current;
  const undoScale = useRef(new Animated.Value(1)).current;

  const pulse = (anim: Animated.Value, callback?: () => void) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start(() => callback && callback());
  };

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

  // Ensure we always have a photo to display
  const currentPhoto = photos[0] || defaultPhoto;

  return (
    <Card
      mode="elevated"
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
    >
      {/* --- Image + Gradient --- */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleNextPhoto}>
        <Image
          key={restaurant.id}
          source={{ uri: photos[activeIndex] || defaultPhoto }}
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

      {/* --- Info Section --- */}
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
              ({restaurant.reviews} reviews)
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

          <TouchableOpacity
            style={[{ paddingVertical: 4 }]}
            onPress={() => setHoursVisible(true)}
            activeOpacity={0.7}
          >
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

        {/* --- Link Buttons --- */}
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
              const query = encodeURIComponent(
                `${restaurant.name} ${restaurant.address || ""}`.trim()
              );
              Linking.openURL(
                restaurant.placeId
                  ? `https://www.google.com/maps/place/?q=place_id:${restaurant.placeId}`
                  : `https://www.google.com/maps/search/?api=1&query=${query}`
              );
            }}
          >
            Google
          </Button>

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

        {/* --- Like / Dislike / Undo Buttons --- */}
        <View style={styles.actionRow}>
          <Animated.View style={{ transform: [{ scale: dislikeScale }] }}>
            <IconButton
              icon="close"
              size={36}
              mode="contained"
              style={[
                styles.actionBtn,
                { backgroundColor: (theme.colors as any).dislikeColor },
              ]}
              iconColor="#fff"
              onPress={() => pulse(dislikeScale, onDislike)}
            />
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: undoScale }] }}>
            <IconButton
              icon="undo"
              size={28}
              mode="contained"
              style={[
                styles.actionBtnSmall,
                { backgroundColor: theme.colors.primary },
              ]}
              iconColor="#fff"
              onPress={() => pulse(undoScale, onUndo)}
            />
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <IconButton
              icon="heart"
              size={36}
              mode="contained"
              style={[
                styles.actionBtn,
                { backgroundColor: (theme.colors as any).likeColor },
              ]}
              iconColor="#fff"
              onPress={() => pulse(likeScale, onLike)}
            />
          </Animated.View>
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
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    marginRight: 6,
  },
  hoursText: {
    fontSize: 14,
    marginVertical: 2,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 10,
  },
  actionBtn: {
    elevation: 6,
  },
  actionBtnSmall: {
    elevation: 5,
  },
});
