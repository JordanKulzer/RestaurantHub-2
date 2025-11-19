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
import { LinearGradient } from "expo-linear-gradient";

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
  const isFocused = useIsFocused();

  const [lists, setLists] = useState<ListWithCount[]>([]);
  const [starred] = useState(mockStarred);
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

  useEffect(() => {
    if (isFocused) {
      loadLists();
    }
  }, [isFocused, loadLists]);

  const renderStarred = ({ item }: any) => (
    <TouchableOpacity style={styles.starredItem} activeOpacity={0.9}>
      <Image source={{ uri: item.image }} style={styles.starredImage} />
      <View style={styles.starredOverlay}>
        <Text
          style={[styles.starredLabel, { color: theme.colors.surface }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderListCard = ({ item }: { item: ListWithCount }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() =>
        navigation.navigate("ListDetail", {
          listId: item.id,
          title: item.title,
        })
      }
    >
      <Card
        mode="elevated"
        style={[
          styles.fullListCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <View style={styles.fullListCardRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.onSurface,
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
                color: theme.colors.onSurfaceVariant,
              }}
            >
              {item.placesCount} place{item.placesCount === 1 ? "" : "s"}
            </Text>
          </View>

          <IconButton
            icon="chevron-right"
            size={22}
            iconColor={theme.colors.onSurfaceVariant}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );

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
        {/* Top Header / Profile Card */}
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

          {/* <Surface
            style={[
              styles.profileCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            mode="elevated"
          >
            <View style={styles.profileRow}>
              <Avatar.Icon
                size={56}
                icon="account"
                color={theme.colors.surface}
                style={{ backgroundColor: theme.colors.tertiary }}
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  style={{
                    fontWeight: "600",
                    fontSize: 16,
                    color: theme.colors.onSurface,
                  }}
                >
                  Jordan Kulzer
                </Text>
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  Save places you love and build lists to share later.
                </Text>
              </View>
            </View>

            <View style={styles.profileStatsRow}>
              <View style={styles.statPill}>
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.colors.onSurfaceVariant,
                  }}
                >
                  {lists.length} list{lists.length === 1 ? "" : "s"}
                </Text>
              </View>
              <Button
                mode="outlined"
                compact
                textColor={theme.colors.primary}
                style={{
                  borderColor: theme.colors.primary,
                  borderRadius: 99,
                  paddingHorizontal: 8,
                  paddingVertical: 0,
                }}
                onPress={() => setShowCreateModal(true)}
              >
                New list
              </Button>
            </View>
          </Surface> */}
        </View>

        {/* Starred Section */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Favorites
          </Text>
          <Button
            mode="text"
            compact
            textColor={theme.colors.primary}
            onPress={() =>
              navigation.navigate("FavoritesDetail", {
                title: "Favorites",
              })
            }
          >
            View all
          </Button>
        </View>

        {starred.length === 0 ? (
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
              You haven’t starred any restaurants yet.
            </Text>
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                fontSize: 13,
              }}
            >
              Swipe on places you love to star them.
            </Text>
          </Surface>
        ) : (
          <FlatList
            data={starred}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={renderStarred}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 4,
            }}
          />
        )}

        <Divider style={{ marginVertical: 22, opacity: 0.15 }} />

        {/* Lists Section */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Your Lists
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
        ) : (
          <FlatList
            data={lists}
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
  profileCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileStatsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
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
  starredItem: {
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  starredImage: {
    width: 130,
    height: 110,
  },
  starredOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  starredLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  listCardWrapper: {
    width: "47%",
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listCardContent: {
    paddingVertical: 14,
  },
  listMetaRow: {
    marginTop: 6,
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
