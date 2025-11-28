// src/screens/SavedScreen.tsx
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CreateListModal from "../components/CreateListModal";
import { getLists, ListWithCount } from "../utils/listsApi";
import { getFavorites } from "../utils/favoritesApis";
import { AccountModal, ListSkeleton } from "../components";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeMode } from "../contexts/ThemeContext";

interface FavoritesItem {
  id: "favorites";
  title: "Favorites";
  description: null;
  placesCount: number;
  isFavorites: true;
}

type CombinedListItem = ListWithCount | FavoritesItem;

export default function SavedScreen() {
  const theme = useTheme();
  const navigation: any = useNavigation();
  const isFocused = useIsFocused();
  const { isDarkMode, setThemeMode } = useThemeMode();

  const [lists, setLists] = useState<ListWithCount[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

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

  const toggleDarkMode = () => {
    setThemeMode(isDarkMode ? "light" : "dark");
  };

  const getListColor = (id: string, isFavorites: boolean) => {
    if (isFavorites) return theme.colors.tertiary;
    // Generate consistent color based on list id
    const colors = [
      theme.colors.tertiary,
      theme.colors.primary,
      theme.colors.secondary,
      "#8B5CF6", // purple
      "#EC4899", // pink
      "#F59E0B", // amber
    ];
    const index =
      id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  const renderListCard = ({ item }: { item: CombinedListItem }) => {
    const isFavorites = "isFavorites" in item && item.isFavorites;
    const listColor = getListColor(item.id, isFavorites);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
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
        style={[
          styles.listItemContainer,
          {
            backgroundColor: isDarkMode
              ? theme.colors.elevation.level1
              : theme.colors.surface,
          },
        ]}
      >
        {/* Left side - Icon */}
        <View style={[styles.listIcon, { backgroundColor: listColor }]}>
          <MaterialCommunityIcons
            name={isFavorites ? "heart" : "silverware-fork-knife"}
            size={28}
            color="#fff"
          />
        </View>

        {/* Middle - Text content */}
        <View style={styles.listContent}>
          <Text
            style={[styles.listName, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {item.description && !isFavorites ? (
            <Text
              style={[
                styles.listDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          ) : null}

          <Text
            style={[
              styles.placeCount,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {item.placesCount} place{item.placesCount === 1 ? "" : "s"}
          </Text>
        </View>

        {/* Right - Chevron */}
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={theme.colors.onSurfaceVariant}
        />
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
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: theme.colors.tertiary,
              }}
            >
              My Stuff
            </Text>
            <IconButton
              icon="account-circle-outline"
              size={28}
              iconColor={theme.colors.tertiary}
              onPress={() => setShowAccountModal(true)}
            />
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Lists
          </Text>
        </View>

        {loadingLists ? (
          <View>
            {Array.from({ length: 3 }).map((_, index) => (
              <ListSkeleton key={index} />
            ))}
          </View>
        ) : lists.length === 0 ? (
          <>
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

            {/* Create First List Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowCreateModal(true)}
              style={[
                styles.createListItem,
                {
                  backgroundColor: isDarkMode
                    ? theme.colors.elevation.level1
                    : theme.colors.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.createListIcon,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={32}
                  color={theme.colors.primary}
                />
              </View>

              <View style={styles.listContent}>
                <Text
                  style={[
                    styles.createListText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Create a new list
                </Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <FlatList
              data={combinedData}
              renderItem={renderListCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />

            {/* Create New List Button */}
            <View style={{ paddingHorizontal: 16 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowCreateModal(true)}
                style={[
                  styles.createListItem,
                  {
                    backgroundColor: isDarkMode
                      ? theme.colors.elevation.level1
                      : theme.colors.surface,
                  },
                ]}
              >
                <View
                  style={[
                    styles.createListIcon,
                    { backgroundColor: theme.colors.primary + "20" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={32}
                    color={theme.colors.primary}
                  />
                </View>

                <View style={styles.listContent}>
                  <Text
                    style={[
                      styles.createListText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Create a new list
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <CreateListModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        onCreated={loadLists}
      />
      <AccountModal
        visible={showAccountModal}
        onDismiss={() => setShowAccountModal(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  listItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  listIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  listContent: {
    flex: 1,
  },
  listName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  placeCount: {
    fontSize: 14,
  },
  createListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  createListIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  createListText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
