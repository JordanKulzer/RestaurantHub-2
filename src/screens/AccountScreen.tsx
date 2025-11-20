// src/screens/AccountScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Card,
  Button,
  useTheme,
  Divider,
  Surface,
  Avatar,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import CreateListModal from "../components/CreateListModal";
import { getLists, ListWithCount } from "../utils/listsApi";
import { getFavorites } from "../utils/favoritesApis";

// Special type for the Favorites "list"
interface FavoritesItem {
  id: "favorites";
  title: "Favorites";
  description: null;
  placesCount: number;
  isFavorites: true;
}

type CombinedListItem = ListWithCount | FavoritesItem;

export default function AccountScreen() {
  const theme = useTheme();
  const navigation: any = useNavigation();
  const isFocused = useIsFocused();

  const [lists, setLists] = useState<ListWithCount[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);

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

  const loadFavoritesCount = useCallback(async () => {
    try {
      const favs = await getFavorites();
      setFavoritesCount(favs.length);
    } catch (err) {
      console.error("❌ AccountScreen: getFavorites failed:", err);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadLists();
      loadFavoritesCount();
    }
  }, [isFocused, loadLists, loadFavoritesCount]);

  // Combine favorites and lists
  const combinedData: CombinedListItem[] = [
    {
      id: "favorites",
      title: "Favorites",
      description: null,
      placesCount: favoritesCount,
      isFavorites: true,
    },
    ...lists,
  ];

  const renderListCard = ({ item }: { item: CombinedListItem }) => {
    const isFavorites = "isFavorites" in item && item.isFavorites;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (isFavorites) {
            navigation.navigate("FavoritesDetail", {
              title: "Favorites",
            });
          } else {
            navigation.navigate("ListDetail", {
              listId: item.id,
              title: item.title,
            });
          }
        }}
      >
        <Card
          mode="elevated"
          style={[
            styles.fullListCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isFavorites
                ? theme.colors.tertiary
                : theme.colors.outline,
            },
          ]}
        >
          <View style={styles.fullListCardRow}>
            {isFavorites && (
              <Avatar.Icon
                size={40}
                icon="heart"
                color={theme.colors.surface}
                style={{
                  backgroundColor: theme.colors.tertiary,
                  marginRight: 12,
                }}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: isFavorites
                    ? theme.colors.onTertiaryContainer
                    : theme.colors.onSurface,
                }}
                numberOfLines={1}
              >
                {item.title}
              </Text>

              {item.description ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 4,
                  }}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              ) : null}

              <Text
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: isFavorites
                    ? theme.colors.onTertiaryContainer
                    : theme.colors.onSurfaceVariant,
                }}
              >
                {item.placesCount} place{item.placesCount === 1 ? "" : "s"}
              </Text>
            </View>

            <IconButton
              icon="chevron-right"
              size={22}
              iconColor={
                isFavorites
                  ? theme.colors.onTertiaryContainer
                  : theme.colors.onSurfaceVariant
              }
            />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Top Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.screenTitle, { color: theme.colors.onBackground }]}
            >
              My Stuff
            </Text>
            <IconButton
              icon="cog-outline"
              size={24}
              iconColor={theme.colors.onBackground}
              onPress={() => console.log("Open settings / account")}
            />
          </View>
        </View>

        {/* Combined Lists Section */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Lists
          </Text>
          {lists.length > 0 && (
            <Button
              mode="text"
              compact
              textColor={theme.colors.primary}
              onPress={() => setShowCreateModal(true)}
            >
              New list
            </Button>
          )}
        </View>

        {loadingLists ? (
          <Surface
            style={[
              styles.emptySurface,
              { backgroundColor: theme.colors.surface },
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
          <>
            {/* Show Favorites card even when no lists */}
            <FlatList
              data={[
                {
                  id: "favorites",
                  title: "Favorites",
                  description: null,
                  placesCount: favoritesCount,
                  isFavorites: true,
                },
              ]}
              renderItem={renderListCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />

            <Surface
              style={[
                styles.emptySurface,
                { backgroundColor: theme.colors.surface, marginTop: 14 },
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
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                Start a list for date nights, brunch spots, or travel ideas.
              </Text>
              <Button
                mode="contained"
                onPress={() => setShowCreateModal(true)}
                textColor={theme.colors.surface}
                style={{
                  backgroundColor: theme.colors.tertiary,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                }}
              >
                Create your first list
              </Button>
            </Surface>
          </>
        ) : (
          <FlatList
            data={combinedData}
            renderItem={renderListCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        )}

        <Divider style={{ marginVertical: 22, opacity: 0.15 }} />

        {/* Account / Logout Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.onSurface, marginLeft: 16 },
          ]}
        >
          Account
        </Text>
        <Surface
          style={[
            styles.accountCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
          mode="flat"
        >
          <View style={styles.accountRow}>
            <Avatar.Icon
              size={46}
              icon="email-outline"
              color={theme.colors.surface}
              style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text
                style={{
                  fontWeight: "600",
                  color: theme.colors.onSurface,
                  fontSize: 15,
                }}
              >
                Account & Settings
              </Text>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                Manage your profile and sign out.
              </Text>
            </View>
          </View>
          <Button
            icon="logout"
            mode="outlined"
            textColor={theme.colors.secondary}
            style={{
              marginTop: 10,
              borderColor: theme.colors.secondary,
              borderRadius: 999,
            }}
            onPress={() => console.log("Logout pressed")}
          >
            Log out
          </Button>
        </Surface>
      </ScrollView>

      <CreateListModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        onCreated={loadLists}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySurface: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 6,
  },
  accountCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 26,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fullListCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  fullListCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
