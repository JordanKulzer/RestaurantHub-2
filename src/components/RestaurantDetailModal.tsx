import React, { useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  Image,
  Linking,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import {
  Modal,
  Portal,
  Button,
  Text,
  Card,
  useTheme,
  Divider,
  IconButton,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function RestaurantDetailModal({
  visible,
  onDismiss,
  restaurant,
}: any) {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  if (!restaurant) return null;

  const openLink = (url: string) => {
    if (url) Linking.openURL(url);
  };

  const categoryList =
    restaurant.types
      ?.filter(
        (t: string) =>
          !["establishment", "point_of_interest", "food"].includes(t)
      )
      .map((t: string) => t.replace(/_/g, " "))
      .join(", ") || null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Animated.View
          style={[
            styles.animatedContainer,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <Card
            style={[
              styles.card,
              { backgroundColor: theme.colors.elevation.level1 },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {restaurant.photos?.[0] && (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: restaurant.photos[0] }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.4)"]}
                    style={styles.imageOverlay}
                  />
                  <IconButton
                    icon="close"
                    size={22}
                    iconColor="#fff"
                    style={styles.closeIcon}
                    onPress={onDismiss}
                  />
                </View>
              )}

              <View style={styles.infoContainer}>
                <Text style={styles.title}>{restaurant.name}</Text>
                <Text style={styles.subtitle}>{restaurant.address}</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>
                    ⭐ {restaurant.rating || "N/A"}
                  </Text>
                  {restaurant.distance && (
                    <Text style={styles.detailText}>
                      📍 {restaurant.distance.toFixed(1)} mi
                    </Text>
                  )}
                  {categoryList && (
                    <Text style={styles.detailText}>🍽️ {categoryList}</Text>
                  )}
                </View>

                <Divider style={{ marginVertical: 12, width: "90%" }} />

                {restaurant.hours?.length > 0 && (
                  <View style={styles.hoursSection}>
                    <Text style={styles.sectionTitle}>Hours</Text>
                    {restaurant.hours.map((h: string, i: number) => (
                      <Text key={i} style={styles.hourText}>
                        {h}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.buttons}>
                  {restaurant.googleUrl && (
                    <Button
                      mode="contained"
                      icon="map-marker"
                      buttonColor={theme.colors.primary}
                      onPress={() => openLink(restaurant.googleUrl)}
                      style={styles.linkButton}
                    >
                      Open in Maps
                    </Button>
                  )}
                  {restaurant.website && (
                    <Button
                      mode="outlined"
                      textColor={theme.colors.primary}
                      icon="web"
                      onPress={() => openLink(restaurant.website)}
                      style={styles.linkButton}
                    >
                      Visit Website
                    </Button>
                  )}
                </View>

                {!restaurant.photos?.[0] && (
                  <Button
                    onPress={onDismiss}
                    textColor="#888"
                    style={{ marginTop: 8 }}
                  >
                    Close
                  </Button>
                )}
              </View>
            </ScrollView>
          </Card>
        </Animated.View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { paddingHorizontal: 20 },
  animatedContainer: { alignItems: "center" },
  card: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 6,
  },
  scrollContent: { alignItems: "center" },
  imageWrapper: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  photo: { width: "100%", height: "100%" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  closeIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  infoContainer: { padding: 16, alignItems: "center" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#222",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  detailText: { fontSize: 14, color: "#555" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  hourText: { fontSize: 14, color: "#666" },
  hoursSection: { alignItems: "center", marginBottom: 8 },
  buttons: { width: "100%", gap: 8, marginTop: 12 },
  linkButton: { borderRadius: 12 },
});
