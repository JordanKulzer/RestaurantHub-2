import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import {
  Text,
  useTheme,
  ActivityIndicator,
  Portal,
  Dialog,
  TextInput,
  Button,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { supabase } from "../utils/supabaseClient";
import {
  getUserProfile,
  updateUserProfile,
  getFriendCount,
  UserProfile,
} from "../utils/friendsApi";
import { getLists, ListWithCount } from "../utils/listsApi";
import { getFavorites } from "../utils/favoritesApis";
import { getWinners } from "../utils/winnersApi";
import CreateListModal from "../components/CreateListModal";
import { ListSkeleton, AccountSkeleton } from "../components";
import { useThemeMode } from "../contexts/ThemeContext";

interface FavoritesItem {
  id: "favorites";
  title: "Favorites";
  description: null;
  placesCount: number;
  isFavorites: true;
}

interface WinnersItem {
  id: "winners";
  title: "Previous Winners";
  description: null;
  placesCount: number;
  isWinners: true;
}

type CombinedListItem = ListWithCount | FavoritesItem | WinnersItem;

export default function AccountScreen() {
  const theme = useTheme();
  const navigation: any = useNavigation();
  const { isDarkMode, setThemeMode } = useThemeMode();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState("");
  const [editedUsername, setEditedUsername] = useState("");
  const [saving, setSaving] = useState(false);

  // Lists state
  const [lists, setLists] = useState<ListWithCount[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [winnersCount, setWinnersCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get or create user profile
      let userProfile = await getUserProfile();

      // ✅ If profile doesn't exist, create it
      if (!userProfile) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const newProfile = {
            id: user.id,
            display_name: user.email?.split("@")[0] || "User",
            username: user.email || "",
            avatar_url: null,
            total_shuffles: 0,
          };

          const { error } = await supabase
            .from("user_profiles")
            .insert(newProfile);

          if (!error) {
            userProfile = newProfile;
          } else {
            console.error("Error creating profile:", error);
          }
        }
      }

      setProfile(userProfile);
      setEditedDisplayName(userProfile?.display_name || "");
      setEditedUsername(userProfile?.username || "");

      // Get friend count
      const count = await getFriendCount();
      setFriendCount(count);

      // Load lists, favorites, and winners
      await loadLists();
      await loadFavoritesCount();
      await loadWinnersCount();
    } catch (error) {
      console.error("Error loading account data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadLists = async () => {
    try {
      setLoadingLists(true);
      const data = await getLists();
      setLists(data);
    } catch (err) {
      console.error("❌ AccountScreen: getLists failed:", err);
    } finally {
      setLoadingLists(false);
    }
  };

  const loadFavoritesCount = async () => {
    try {
      const favs = await getFavorites();
      setFavoritesCount(favs.length);
    } catch (err) {
      console.error("❌ AccountScreen: getFavorites failed:", err);
    }
  };

  const loadWinnersCount = async () => {
    try {
      const winners = await getWinners();
      setWinnersCount(winners.length);
    } catch (err) {
      console.error("❌ AccountScreen: getWinners failed:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await updateUserProfile({
        display_name: editedDisplayName,
        username: editedUsername,
      });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              display_name: editedDisplayName,
              username: editedUsername,
            }
          : null
      );

      setEditModalVisible(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const toggleDarkMode = () => {
    setThemeMode(isDarkMode ? "light" : "dark");
  };

  const getInitial = () => {
    if (profile?.display_name) {
      return profile.display_name.charAt(0).toUpperCase();
    }
    return "?";
  };

  const getListColor = (
    id: string,
    isFavorites: boolean,
    isWinners: boolean
  ) => {
    if (isFavorites) return theme.colors.tertiary;
    if (isWinners) return theme.colors.secondary;
    const colors = [
      theme.colors.tertiary,
      theme.colors.primary,
      theme.colors.secondary,
      "#8B5CF6",
      "#EC4899",
      "#F59E0B",
    ];
    const index =
      id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  // Combine favorites, winners, and lists
  const combinedData: CombinedListItem[] = [
    {
      id: "favorites",
      title: "Favorites",
      description: null,
      placesCount: favoritesCount,
      isFavorites: true,
    },
    {
      id: "winners",
      title: "Previous Winners",
      description: null,
      placesCount: winnersCount,
      isWinners: true,
    },
    ...lists,
  ];

  const renderListCard = ({ item }: { item: CombinedListItem }) => {
    const isFavorites = "isFavorites" in item && item.isFavorites;
    const isWinners = "isWinners" in item && item.isWinners;
    const listColor = getListColor(item.id, isFavorites, isWinners);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (isFavorites) {
            navigation.navigate("FavoritesDetail", {
              title: "Favorites",
            });
          } else if (isWinners) {
            navigation.navigate("WinnersDetail");
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
            name={
              isFavorites
                ? "heart"
                : isWinners
                ? "trophy"
                : "silverware-fork-knife"
            }
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

          {item.description && !isFavorites && !isWinners ? (
            <Text
              style={[
                styles.listDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
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

  if (loading) {
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
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerRow}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: theme.colors.tertiary,
                }}
              >
                Account
              </Text>
              <IconButton
                icon="cog-outline"
                size={24}
                iconColor={theme.colors.onBackground}
                onPress={() => navigation.navigate("Settings")}
              />
            </View>
          </View>

          {/* Profile Skeleton */}
          <AccountSkeleton />

          {/* Lists Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              My Lists
            </Text>
          </View>

          {/* List Skeletons */}
          <View style={{ paddingHorizontal: 16 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <ListSkeleton key={index} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: theme.colors.tertiary,
              }}
            >
              Account
            </Text>
            <IconButton
              icon="cog-outline"
              size={24}
              iconColor={theme.colors.onBackground}
              onPress={() => navigation.navigate("Settings")}
            />
          </View>
        </View>

        {/* Profile Section */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.dark
                ? theme.colors.elevation.level1
                : theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          {/* Avatar */}
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Text
              variant="headlineLarge"
              style={[
                styles.avatarText,
                { color: theme.colors.onPrimaryContainer },
              ]}
            >
              {getInitial()}
            </Text>
          </View>

          {/* Name and Username */}
          <Text
            variant="headlineSmall"
            style={[styles.displayName, { color: theme.colors.onSurface }]}
          >
            {profile?.display_name || "User"}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.username, { color: theme.colors.onSurfaceVariant }]}
          >
            @{profile?.username || "username"}
          </Text>

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={[styles.editButton, { borderColor: theme.colors.outline }]}
            onPress={() => setEditModalVisible(true)}
          >
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurface }}
            >
              Edit Profile
            </Text>
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text
                variant="titleLarge"
                style={[styles.statValue, { color: theme.colors.onSurface }]}
              >
                {profile?.total_shuffles || 0}
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.statLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Shuffles
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.outline },
              ]}
            />

            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigation.navigate("Friends")}
            >
              <Text
                variant="titleLarge"
                style={[styles.statValue, { color: theme.colors.tertiary }]}
              >
                {friendCount}
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.statLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Friends
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.outline },
              ]}
            />

            <View style={styles.stat}>
              <Text
                variant="titleLarge"
                style={[styles.statValue, { color: theme.colors.onSurface }]}
              >
                {lists.length}
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.statLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Lists
              </Text>
            </View>
          </View>
        </View>

        {/* Lists Section */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            My Lists
          </Text>
        </View>

        {loadingLists ? (
          <View style={{ paddingHorizontal: 16 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <ListSkeleton key={index} />
            ))}
          </View>
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

      {/* Modals */}
      <CreateListModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        onCreated={loadLists}
      />

      <Portal>
        <Dialog
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
        >
          <Dialog.Title>Edit Profile</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Display Name"
              value={editedDisplayName}
              onChangeText={setEditedDisplayName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Username"
              value={editedUsername}
              onChangeText={setEditedUsername}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditModalVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveProfile} loading={saving}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontWeight: "bold",
  },
  displayName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  username: {
    marginBottom: 16,
  },
  editButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontWeight: "700",
  },
  statLabel: {
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
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
  input: {
    marginBottom: 12,
  },
});
