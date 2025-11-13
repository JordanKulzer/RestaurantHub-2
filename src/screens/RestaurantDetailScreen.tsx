import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Text, Button, useTheme, ActivityIndicator } from "react-native-paper";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

import { fetchYelpDetails } from "../utils/yelpApi";
import QuickActionsMenu from "../components/QuickActionsMenu";

type Props = NativeStackScreenProps<RootStackParamList, "RestaurantDetail">;

export default function RestaurantDetailScreen({ route, navigation }: Props) {
  const { restaurantId } = route.params; // contains { restaurant_id, restaurant_name, etc. }
  const theme = useTheme();

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, []);

  const loadDetails = async () => {
    const d = await fetchYelpDetails(restaurantId);
    setDetails(d);
    setLoading(false);
  };

  const openMaps = () => {
    if (details?.coordinates) {
      const { latitude, longitude } = details.coordinates;
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(url);
    }
  };

  const openPhone = () => {
    if (details?.display_phone) {
      Linking.openURL(`tel:${details.display_phone}`);
    }
  };

  const openWebsite = () => {
    if (details?.url) Linking.openURL(details.url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.tertiary} />
      </View>
    );
  }

  const photos = details.photos?.length ? details.photos : [details.image_url];

  return (
    <View style={{ flex: 1 }}>
      {/* Top Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={{ fontSize: 16, color: theme.colors.onSurface }}>
          ← Back
        </Text>
      </TouchableOpacity>

      <ScrollView>
        {/* Photo Carousel (simple horizontal scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          style={{ width: "100%", height: 260 }}
        >
          {photos.map((p: string, index: number) => (
            <Image
              key={index}
              source={{ uri: p }}
              style={{ width: 400, height: 260 }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Content */}
        <View style={{ padding: 16 }}>
          <Text style={styles.name}>{details.name}</Text>

          <Text style={styles.subtitle}>
            ⭐ {details.rating} ({details.review_count} reviews)
          </Text>

          <Text style={styles.address}>{details.location?.address1}</Text>

          {/* Hours */}
          {details.hours?.[0]?.open && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.sectionTitle}>Hours</Text>
              {details.hours[0].open.map((h: any, idx: number) => (
                <Text key={idx} style={styles.hoursText}>
                  {formatHours(h)}
                </Text>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttons}>
            <Button mode="outlined" onPress={openMaps} style={styles.btn}>
              Directions
            </Button>
            {details.display_phone && (
              <Button mode="outlined" onPress={openPhone} style={styles.btn}>
                Call
              </Button>
            )}
            {details.url && (
              <Button mode="outlined" onPress={openWebsite} style={styles.btn}>
                Website
              </Button>
            )}
          </View>

          {/* Options Menu (favorite, add to list, share, etc.) */}
          <View style={{ marginTop: 20 }}>
            <QuickActionsMenu
              restaurant={{
                id: restaurantId,
                name: details.name,
                address: details.location?.address1,
                source: "yelp",
              }}
              isFavorite={false} // you will replace with Supabase
              onToggleFavorite={() => {}} // TODO: Supabase favorites
              onCreateNewList={() => {}} // already implemented
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Format Yelp hours into readable text */
function formatHours(openObj: any) {
  // Yelp gives { start: "0900", end: "1700", day: 0 }
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const day = dayNames[openObj.day];
  const start = openObj.start?.replace(/(\d{2})(\d{2})/, "$1:$2");
  const end = openObj.end?.replace(/(\d{2})(\d{2})/, "$1:$2");
  return `${day}: ${start} - ${end}`;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    padding: 16,
    paddingBottom: 6,
    zIndex: 50,
  },
  name: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.8,
    fontSize: 15,
  },
  address: {
    marginTop: 6,
    opacity: 0.7,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  hoursText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 2,
  },
  buttons: {
    flexDirection: "row",
    marginTop: 14,
    flexWrap: "wrap",
    gap: 10,
  },
  btn: {
    flexGrow: 1,
    marginRight: 5,
  },
});
