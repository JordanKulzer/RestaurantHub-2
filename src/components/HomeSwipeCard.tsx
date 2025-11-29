// src/components/HomeSwipeCard.tsx
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
  Dimensions,
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
import { Ionicons } from "@expo/vector-icons";

import { HomeRestaurant } from "../types/homeRestaurant";
import QuickActionsMenu from "./QuickActionsMenu";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

  const [leftTapFeedback, setLeftTapFeedback] = useState(false);
  const [rightTapFeedback, setRightTapFeedback] = useState(false);
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

  const handlePhotoTap = (event: any) => {
    setHintVisible(false);
    if (photos.length <= 1) return;

    const { locationX } = event.nativeEvent;
    const tapZone = SCREEN_WIDTH / 2;

    if (locationX < tapZone) {
      // Left half - go to previous photo
      if (activeIndex > 0) {
        setLeftTapFeedback(true);
        setTimeout(() => setLeftTapFeedback(false), 200);
        setActiveIndex(activeIndex - 1);
      }
    } else {
      // Right half - go to next photo
      if (activeIndex < photos.length - 1) {
        setRightTapFeedback(true);
        setTimeout(() => setRightTapFeedback(false), 200);
        setActiveIndex(activeIndex + 1);
      }
    }
  };

  const currentPhoto = photos[activeIndex] || defaultPhoto;

  return (
    <Card
      mode="elevated"
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePhotoTap}
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

        {/* Left Tap Feedback */}
        {leftTapFeedback && (
          <View style={styles.leftTapOverlay}>
            <View style={styles.tapFlash} />
          </View>
        )}

        {/* Right Tap Feedback */}
        {rightTapFeedback && (
          <View style={styles.rightTapOverlay}>
            <View style={styles.tapFlash} />
          </View>
        )}

        {/* Photo Indicator Bars */}
        {photos.length > 1 && (
          <View style={styles.photoIndicatorBars}>
            {photos.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.photoBar,
                  {
                    backgroundColor:
                      idx === activeIndex ? "#fff" : "rgba(255, 255, 255, 0.5)",
                  },
                ]}
              />
            ))}
          </View>
        )}

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)"]}
          style={StyleSheet.absoluteFillObject}
        />

        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 20,
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

        {hintVisible && photos.length > 1 && (
          <View
            style={[
              styles.hintBadge,
              { backgroundColor: theme.colors.secondary + "CC" },
            ]}
          >
            <Text style={styles.hintText}>Tap left/right for more photos</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.infoSection}>
        <Text
          style={[styles.name, { color: theme.colors.onSurface }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
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
          <Button
            mode="outlined"
            icon="google-maps"
            textColor={theme.colors.primary}
            style={[styles.linkButton, { borderColor: theme.colors.primary }]}
            onPress={() => Linking.openURL(restaurant.googleMapsUrl!)}
          >
            Google
          </Button>

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
  },
  carouselImage: {
    width: "100%",
    height: 320,
  },
  photoIndicatorBars: {
    position: "absolute",
    bottom: 12,
    left: 8,
    right: 8,
    flexDirection: "row",
    gap: 4,
    zIndex: 10,
  },
  photoBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  leftTapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_WIDTH / 2,
    height: 320,
    zIndex: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  rightTapOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    width: SCREEN_WIDTH / 2,
    height: 320,
    zIndex: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  tapFlash: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  infoSection: {
    padding: 16,
  },
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
    marginTop: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionBtn: { elevation: 6 },
  actionBtnSmall: { elevation: 5 },
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
});
