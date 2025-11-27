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

import { HomeRestaurant } from "../types/homeRestaurant";
import { fetchRestaurantInfo } from "../utils/fetchRestaurantInfo";
import QuickActionsMenu from "./QuickActionsMenu";

interface HomeSwipeCardProps {
  restaurant: HomeRestaurant;
  onLike?: () => void;
  onDislike?: () => void;
  onUndo?: () => void;
  isFavorite: boolean;
  onFavoriteChange: () => void;
  onCreateNewList: (callback?: (list: any) => void) => void;
  preloadedLists: any[];
  listsReady: boolean;
}

export default function HomeSwipeCard({
  restaurant,
  onLike,
  onDislike,
  onUndo,
  isFavorite,
  onFavoriteChange,
  onCreateNewList,
  preloadedLists,
  listsReady,
}: HomeSwipeCardProps) {
  const theme = useTheme();

  const defaultPhoto =
    restaurant.photos?.[0] ||
    restaurant.image ||
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png";

  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [photos, setPhotos] = useState<string[]>(
    Array.isArray(restaurant.photos) && restaurant.photos.length > 0
      ? restaurant.photos
      : [defaultPhoto]
  );
  const [hoursVisible, setHoursVisible] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const hours = restaurant.hours ?? [];
  const isOpen = restaurant.isOpen ?? null;

  const likeScale = useRef(new Animated.Value(1)).current;
  const dislikeScale = useRef(new Animated.Value(1)).current;
  const undoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const formatAddress = (address: string | null | undefined): string => {
    if (!address) return "";

    const parts = address.split(",").map((p) => p.trim());

    if (parts.length >= 3) {
      const stateZipPart = parts[2];
      const stateMatch = stateZipPart.match(/^([A-Z]{2})/);

      if (stateMatch) {
        const state = stateMatch[1];
        return `${parts[0]}, ${parts[1]}, ${state}`;
      }
    }

    return address;
  };

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

  const handleNextPhoto = () => {
    setHintVisible(false);
    if (photos.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % photos.length);
  };

  const currentPhoto = photos[activeIndex] || defaultPhoto;

  return (
    <Card
      mode="elevated"
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleNextPhoto}
        onLongPress={() => {
          setHintVisible(false);
          setViewerVisible(true);
        }}
      >
        <Image
          source={{ uri: currentPhoto }}
          style={styles.carouselImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 50,
            height: 50,
            backgroundColor: theme.colors.secondary + "DD",
            borderBottomLeftRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            elevation: 4,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
          pointerEvents="box-none"
        >
          <QuickActionsMenu
            restaurant={restaurant}
            isFavorite={isFavorite}
            onFavoriteChange={onFavoriteChange}
            onCreateNewList={onCreateNewList}
            preloadedLists={preloadedLists}
            listsReady={listsReady}
          />
        </View>
        {photos.length > 1 && (
          <View style={styles.photoIndicator}>
            <Text style={styles.photoIndicatorText}>
              {`${activeIndex + 1}/${photos.length}`}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.hintBadge,
            { backgroundColor: theme.colors.secondary + "CC" },
          ]}
        >
          <Text style={styles.hintText}>Tap photo for more</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.infoSection}>
        <Text style={[styles.name, { color: theme.colors.onSurface }]}>
          {restaurant.name}
        </Text>

        <View style={styles.metaRow}>
          {restaurant.rating != null && (
            <Text style={[styles.metaText, { color: theme.colors.onSurface }]}>
              {`⭐ ${restaurant.rating.toFixed(1)}`}
            </Text>
          )}

          {restaurant.reviewCount != null && (
            <Text
              style={[
                styles.metaText,
                { color: theme.colors.onSurface + "99" },
              ]}
            >
              {`(${restaurant.reviewCount} reviews)`}
            </Text>
          )}

          {restaurant.price != null && (
            <Text
              style={[
                styles.metaText,
                { color: theme.colors.onSurface + "99" },
              ]}
            >
              {`• ${restaurant.price}`}
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

          <TouchableOpacity onPress={() => setHoursVisible(true)}>
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

        {restaurant.address && (
          <Text
            style={[styles.detail, { color: theme.colors.onSurface + "99" }]}
          >
            {formatAddress(restaurant.address)}
          </Text>
        )}

        {restaurant.distanceMiles != null && (
          <Text
            style={[styles.detail, { color: theme.colors.onSurface + "99" }]}
          >
            {`${restaurant.distanceMiles.toFixed(2)} mi away`}
          </Text>
        )}

        <View style={styles.linkRow}>
          {/* Google Maps */}
          <Button
            mode="outlined"
            icon="google-maps"
            textColor={theme.colors.primary}
            style={[styles.linkButton, { borderColor: theme.colors.primary }]}
            onPress={() => Linking.openURL(restaurant.googleMapsUrl!)}
          >
            Google
          </Button>

          {/* Apple Maps */}
          <Button
            mode="outlined"
            icon={Platform.OS === "ios" ? "map" : "map-marker"}
            textColor={theme.colors.tertiary}
            style={[styles.linkButton, { borderColor: theme.colors.tertiary }]}
            onPress={() => {
              const url = `http://maps.apple.com/?daddr=${encodeURIComponent(
                restaurant.address || restaurant.name
              )}`;
              Linking.openURL(url);
            }}
          >
            Apple
          </Button>
        </View>

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
              size={40}
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
            hours.map((line, i) => (
              <Text
                key={i}
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
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  carouselImage: {
    width: "100%",
    height: 240,
    borderRadius: 10,
  },
  infoSection: { padding: 16 },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  detail: { fontSize: 13, marginBottom: 3 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  metaText: { fontSize: 14, marginRight: 6 },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },
  linkButton: { flex: 1, borderRadius: 25 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionBtn: { elevation: 6 },
  actionBtnSmall: { elevation: 5 },
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
  hoursModal: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
  },
  hoursTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  hoursText: {
    fontSize: 14,
    marginVertical: 2,
    textAlign: "center",
  },
});
