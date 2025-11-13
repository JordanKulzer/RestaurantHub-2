import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Text, useTheme, ActivityIndicator, Icon } from "react-native-paper";
import { supabase } from "../utils/supabaseClient";
import { fetchYelpDetails } from "../utils/yelpApi";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "ListDetail">;

interface ListItemRow {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_address: string | null;
  restaurant_source: "yelp" | "google";
}

export default function ListDetailScreen({ route, navigation }: Props) {
  const { listId, title } = route.params;
  const theme = useTheme();

  const [items, setItems] = useState<ListItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriched, setEnriched] = useState<any[]>([]);

  // Load list items from Supabase
  const loadItems = async () => {
    const { data, error } = await supabase
      .from("list_items")
      .select("*")
      .eq("list_id", listId);

    if (error) {
      console.error("❌ list_items load failed:", error);
      return;
    }
    setItems(data);
  };

  // Enrich each restaurant with Yelp + Google data
  const enrichRestaurants = useCallback(async () => {
    const promises = items.map(async (item) => {
      const yelp = await fetchYelpDetails(item.restaurant_id);
      return {
        ...item,
        yelp,
      };
    });

    const resolved = await Promise.all(promises);
    setEnriched(resolved);
    setLoading(false);
  }, [items]);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      enrichRestaurants();
    }
  }, [items]);

  const openDetail = (restaurantId: string) => {
    navigation.navigate("RestaurantDetail", { restaurantId });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.tertiary} size="large" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const photo =
      item.yelp?.photos?.[0] ??
      item.yelp?.image_url ??
      "https://upload.wikimedia.org/wikipedia/commons/ac/No_image_available.svg";

    const rating = item.yelp?.rating;
    const reviews = item.yelp?.review_count;
    const isOpen = item.yelp?.hours?.[0]?.is_open_now;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openDetail(item.restaurant_id)}
      >
        <Image source={{ uri: photo }} style={styles.thumb} />

        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.colors.onSurface }]}>
            {item.restaurant_name}
          </Text>

          <Text style={{ color: theme.colors.onSurface + "99", fontSize: 13 }}>
            ⭐ {rating ?? "?"} ({reviews ?? 0}) •{" "}
            {isOpen ? "Open Now" : "Closed"}
          </Text>

          <Text
            style={{
              color: theme.colors.onSurface + "66",
              marginTop: 2,
              fontSize: 13,
            }}
          >
            {item.restaurant_address ?? "Address unavailable"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.surface }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon
            source="chevron-left"
            size={28}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 20,
            fontWeight: "600",
            marginLeft: 8,
            color: theme.colors.onSurface,
          }}
        >
          {title}
        </Text>
      </View>
      <FlatList
        data={enriched}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  thumb: {
    width: 74,
    height: 74,
    borderRadius: 10,
    marginRight: 14,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
});
