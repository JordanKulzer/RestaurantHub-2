import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { Text, Card, Button, useTheme, FAB, Divider } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { CreateListModal } from "../components";
import { SafeAreaView } from "react-native-safe-area-context";

const mockStarred = [
  {
    id: "1",
    name: "Uchi Dallas",
    image: "https://picsum.photos/600/400?random=1",
  },
  {
    id: "2",
    name: "Velvet Taco",
    image: "https://picsum.photos/600/400?random=1",
  },
  {
    id: "3",
    name: "Katy Trail Ice House",
    image: "https://picsum.photos/600/400?random=1",
  },
  {
    id: "4",
    name: "Uchi Dallas",
    image: "https://picsum.photos/600/400?random=1",
  },
  {
    id: "5",
    name: "Velvet Taco",
    image: "https://picsum.photos/600/400?random=1",
  },
  {
    id: "6",
    name: "Katy Trail Ice House",
    image: "https://picsum.photos/600/400?random=1",
  },
];

const mockLists = [
  {
    id: "a",
    title: "Date Night Spots",
    count: 4,
    image: "https://picsum.photos/600/400?random=1",
  },
  {
    id: "b",
    title: "Coffee Runs ☕",
    count: 7,
    image: "https://picsum.photos/600/400?random=1",
  },
  {
    id: "c",
    title: "Brunch Goals",
    count: 5,
    image: "https://picsum.photos/600/400?random=1",
  },
];

// const mockStarred: any[] = []; // 👈 Simulate empty initially
// const mockLists: any[] = []; // 👈 Simulate empty initially

export default function FavoritesScreen() {
  const theme = useTheme();
  const [lists, setLists] = useState(mockLists);
  const [starred, setStarred] = useState(mockStarred);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const renderStarred = ({ item }: any) => (
    <TouchableOpacity style={styles.starredItem}>
      <Image source={{ uri: item.image }} style={styles.starredImage} />
      <Text style={styles.starredLabel}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderListCard = ({ item }: any) => (
    <Card style={styles.card} mode="elevated">
      <View style={styles.imageWrapper}>
        <Card.Cover source={{ uri: item.image }} />
      </View>
      <Card.Content style={{ paddingVertical: 8 }}>
        <Text variant="titleMedium" style={{ fontWeight: "600" }}>
          {item.title}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {item.count} places
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>⭐ Starred</Text>
        {starred.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              You haven’t starred any restaurants yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={starred}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={renderStarred}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        )}

        <Divider style={{ marginVertical: 16 }} />

        <Text style={styles.sectionTitle}>📋 Your Lists</Text>
        {lists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No lists created yet.</Text>
            <Button
              mode="contained-tonal"
              onPress={() => setShowCreateModal(true)}
            >
              Create Your First List
            </Button>
          </View>
        ) : (
          <FlatList
            data={lists}
            renderItem={renderListCard}
            numColumns={2}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            columnWrapperStyle={{
              justifyContent: "space-between",
              paddingHorizontal: 16,
            }}
          />
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        label="New List"
        onPress={() => setShowCreateModal(true)}
        color="white"
      />
      <CreateListModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        onCreate={(list) =>
          setLists((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              title: list.name,
              count: 0,
              image: list.photoUri ?? "https://picsum.photos/600/400?random=10",
            },
          ])
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  starredItem: {
    marginRight: 12,
    alignItems: "center",
  },
  starredImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
  },
  starredLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  card: {
    width: "47%",
    marginBottom: 16,
    borderRadius: 12,
  },
  imageWrapper: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#5e60ce",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 12,
    opacity: 0.8,
  },
});
