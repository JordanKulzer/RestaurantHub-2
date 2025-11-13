// src/screens/AccountScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Card,
  Button,
  useTheme,
  FAB,
  Divider,
  Surface,
  Avatar,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import CreateListModal from "../components/CreateListModal";
import { getLists, ListWithCount } from "../utils/listsApi";

const mockStarred = [
  {
    id: "1",
    name: "Uchi Dallas",
    image: "https://picsum.photos/600/400?random=1",
  },
  {
    id: "2",
    name: "Velvet Taco",
    image: "https://picsum.photos/600/400?random=2",
  },
  {
    id: "3",
    name: "Katy Trail Ice House",
    image: "https://picsum.photos/600/400?random=3",
  },
];

export default function AccountScreen() {
  const theme = useTheme();
  const navigation: any = useNavigation();
  const [lists, setLists] = useState<ListWithCount[]>([]);
  const [starred] = useState(mockStarred);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadLists();
    }
  }, [isFocused]);

  const loadLists = useCallback(async () => {
    try {
      setLoadingLists(true);
      const data = await getLists();
      setLists(data);
    } catch (err) {
      console.error("❌ AccountScreen: getLists failed:", err);
    } finally {
      setLoadingLists(false);
    }
  }, []);

  const renderStarred = ({ item }: any) => (
    <TouchableOpacity style={styles.starredItem}>
      <Image source={{ uri: item.image }} style={styles.starredImage} />
      <Text style={[styles.starredLabel, { color: theme.colors.onSurface }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderListCard = ({ item }: { item: ListWithCount }) => (
    <TouchableOpacity
      style={{ width: "47%", marginBottom: 16 }}
      onPress={() =>
        navigation.navigate("ListDetail", {
          listId: item.id,
          title: item.title,
        })
      }
    >
      <Card
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        mode="elevated"
      >
        <Card.Content style={{ paddingVertical: 16 }}>
          <Text
            variant="titleMedium"
            style={{ fontWeight: "600", color: theme.colors.onSurface }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            {item.placesCount} place{item.placesCount === 1 ? "" : "s"}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>
            My Favorites
          </Text>
          <IconButton
            icon="account-circle"
            size={26}
            iconColor={theme.colors.tertiary}
            onPress={() => console.log("Open account section")}
          />
        </View>

        {/* Starred Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          ⭐ Starred
        </Text>
        {starred.length === 0 ? (
          <Surface
            style={[
              styles.emptySurface,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              You haven’t starred any restaurants yet.
            </Text>
          </Surface>
        ) : (
          <FlatList
            data={starred}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={renderStarred}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          />
        )}

        <Divider style={{ marginVertical: 20, opacity: 0.3 }} />

        {/* Lists Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          📋 Your Lists
        </Text>
        {loadingLists ? (
          <Surface
            style={[
              styles.emptySurface,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Loading your lists...
            </Text>
          </Surface>
        ) : lists.length === 0 ? (
          <Surface
            style={[
              styles.emptySurface,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No lists created yet.
            </Text>
            <Button
              mode="contained-tonal"
              onPress={() => setShowCreateModal(true)}
              textColor={theme.colors.onSecondaryContainer}
            >
              Create Your First List
            </Button>
          </Surface>
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

        {/* Account Info Section */}
        <Divider style={{ marginVertical: 20, opacity: 0.3 }} />
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          👤 Account
        </Text>
        <Surface
          style={[
            styles.accountCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          mode="flat"
        >
          <View style={styles.accountRow}>
            <Avatar.Icon
              size={50}
              icon="account"
              color="white"
              style={{ backgroundColor: theme.colors.tertiary }}
            />
            <View style={{ marginLeft: 12 }}>
              <Text
                style={{ fontWeight: "600", color: theme.colors.onSurface }}
              >
                Jordan Kulzer
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                View and manage profile
              </Text>
            </View>
          </View>
          <Button
            icon="logout"
            mode="outlined"
            textColor={theme.colors.tertiary}
            style={{ marginTop: 10, borderColor: theme.colors.tertiary }}
            onPress={() => console.log("Logout pressed")}
          >
            Log Out
          </Button>
        </Surface>
      </ScrollView>

      {/* Floating Button */}
      <FAB
        icon="plus"
        label="New List"
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.tertiary,
            shadowColor: theme.colors.tertiary,
          },
        ]}
        color="white"
        onPress={() => setShowCreateModal(true)}
      />

      <CreateListModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        onCreated={loadLists}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 8,
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
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptySurface: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 10,
  },
  accountCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
  },
});
