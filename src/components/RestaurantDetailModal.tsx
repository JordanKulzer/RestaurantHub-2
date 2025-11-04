import React from "react";
import { View, ScrollView, Image, Linking, StyleSheet } from "react-native";
import { Modal, Portal, Button, Text, Card } from "react-native-paper";

export default function RestaurantDetailModal({
  visible,
  onDismiss,
  restaurant,
}: any) {
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
      // .slice(0, 2)
      .map((t: string) => t.replace(/_/g, " "))
      .join(", ") || null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss}>
        <Card style={styles.card}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{restaurant.name}</Text>
            <Text style={styles.subtitle}>
              ⭐ {restaurant.rating || "N/A"} • {restaurant.address}
            </Text>
            {restaurant.distance !== undefined && (
              <Text style={styles.distanceText}>
                📍 {restaurant.distance.toFixed(1)} mi away
              </Text>
            )}
            {categoryList && (
              <Text style={styles.category}>🍽️ {categoryList}</Text>
            )}
            {restaurant.photos?.length > 0 && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.photoScroll}
              >
                {restaurant.photos.map((photo: string, i: number) => (
                  <Image
                    key={i}
                    source={{ uri: photo }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}

            {/* 🕒 Hours */}
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

            {/* 🌐 Links */}
            <View style={styles.buttons}>
              {restaurant.googleUrl && (
                <Button
                  mode="contained"
                  buttonColor="#5e60ce"
                  onPress={() => openLink(restaurant.googleUrl)}
                  style={styles.linkButton}
                >
                  Open in Google Maps
                </Button>
              )}
              {restaurant.website && (
                <Button
                  mode="outlined"
                  textColor="#5e60ce"
                  onPress={() => openLink(restaurant.website)}
                  style={styles.linkButton}
                >
                  Visit Website
                </Button>
              )}
            </View>

            {/* ✖️ Close */}
            <Button
              mode="text"
              textColor="#999"
              onPress={onDismiss}
              style={{ marginTop: 12 }}
            >
              Close
            </Button>
          </ScrollView>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    borderRadius: 20,
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 16,
    elevation: 10,
  },
  scrollContent: {
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: "#333",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
  },
  photoScroll: {
    marginVertical: 8,
  },
  photo: {
    width: 280,
    height: 180,
    borderRadius: 12,
    marginRight: 8,
  },
  hoursSection: {
    marginVertical: 12,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#444",
  },
  hourText: {
    fontSize: 14,
    color: "#666",
  },
  buttons: {
    width: "100%",
    marginTop: 16,
    gap: 8,
  },
  linkButton: {
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 14,
    color: "#5e60ce",
    textAlign: "center",
    marginBottom: 6,
  },
  category: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginBottom: 12,
    textTransform: "capitalize",
  },
});
