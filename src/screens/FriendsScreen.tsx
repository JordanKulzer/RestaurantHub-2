// src/screens/FriendsScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import {
  Text,
  useTheme,
  IconButton,
  Button,
  Avatar,
  Chip,
  Surface,
  Searchbar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  getFriends,
  getPendingFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from "../utils/friendsApi";
import Toast from "react-native-toast-message";

type Tab = "friends" | "requests" | "add";

export default function FriendsScreen({ navigation }: any) {
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    const [friendsData, requestsData] = await Promise.all([
      getFriends(),
      getPendingFriendRequests(),
    ]);
    setFriends(friendsData);
    setRequests(requestsData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const results = await searchUsers(query);
    setSearchResults(results);
  };

  const handleSendRequest = async (username: string) => {
    try {
      setLoading(true);
      await sendFriendRequest(username);
      Toast.show({
        type: "success",
        text1: "Friend request sent!",
      });
      setSearchQuery("");
      setSearchResults([]);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      Toast.show({
        type: "success",
        text1: "Friend request accepted!",
      });
      loadData();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to accept request",
      });
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      await removeFriend(friendshipId);
      Toast.show({
        type: "success",
        text1: "Friend removed",
      });
      loadData();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to remove friend",
      });
    }
  };

  const renderFriend = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: theme.colors.surface }]}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <Avatar.Text
          size={48}
          label={item.display_name?.charAt(0)?.toUpperCase() || "U"}
          style={{ backgroundColor: theme.colors.tertiary }}
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.onSurface,
            }}
          >
            {item.display_name}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: theme.colors.onSurfaceVariant,
            }}
          >
            @{item.username}
          </Text>
        </View>
      </View>

      <IconButton
        icon="dots-vertical"
        size={20}
        onPress={() => {
          // Show options: Remove, Block
        }}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: theme.colors.onSurface,
          }}
        >
          Friends
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "friends" && {
              borderBottomColor: theme.colors.tertiary,
            },
          ]}
          onPress={() => setActiveTab("friends")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "friends"
                    ? theme.colors.tertiary
                    : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "requests" && {
              borderBottomColor: theme.colors.tertiary,
            },
          ]}
          onPress={() => setActiveTab("requests")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "requests"
                    ? theme.colors.tertiary
                    : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "add" && {
              borderBottomColor: theme.colors.tertiary,
            },
          ]}
          onPress={() => setActiveTab("add")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "add"
                    ? theme.colors.tertiary
                    : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            Add Friends
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === "friends" && (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.friendship_id}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      {activeTab === "add" && (
        <View style={{ padding: 16 }}>
          <Searchbar
            placeholder="Search by username"
            onChangeText={handleSearch}
            value={searchQuery}
            style={{ marginBottom: 16 }}
          />
          <FlatList
            data={searchResults}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.listItem,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <Avatar.Text
                    size={48}
                    label={item.display_name?.charAt(0)?.toUpperCase() || "U"}
                    style={{ backgroundColor: theme.colors.tertiary }}
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: theme.colors.onSurface,
                      }}
                    >
                      {item.display_name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.colors.onSurfaceVariant,
                      }}
                    >
                      @{item.username}
                    </Text>
                  </View>
                </View>

                <Button
                  mode="outlined"
                  onPress={() => handleSendRequest(item.username)}
                  disabled={loading}
                  style={{ borderRadius: 20 }}
                  textColor={theme.colors.primary}
                >
                  Add
                </Button>
              </View>
            )}
            keyExtractor={(item) => item.id}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
});
