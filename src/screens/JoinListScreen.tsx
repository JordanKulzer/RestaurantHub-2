// src/screens/JoinListScreen.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button, ActivityIndicator, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { joinListViaShareLink } from "../utils/collaborationApi";

export default function JoinListScreen({ route, navigation }: any) {
  const { shareLinkId } = route.params;
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [listId, setListId] = useState<string | null>(null);

  useEffect(() => {
    handleJoinList();
  }, [shareLinkId]);

  const handleJoinList = async () => {
    setLoading(true);
    setError(null);

    const result = await joinListViaShareLink(shareLinkId);

    if (result.success) {
      setSuccess(true);
      setListId(result.listId || null);
    } else {
      setError(result.error || "Failed to join list");
    }

    setLoading(false);
  };

  const handleGoToList = () => {
    if (listId) {
      navigation.replace("ListDetail", { listId, title: "Shared List" });
    }
  };

  const handleGoHome = () => {
    navigation.navigate("Home");
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.content}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[
              styles.loadingText,
              { color: theme.colors.onSurface, marginTop: 24 },
            ]}
          >
            Joining list...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>❌</Text>
          <Text
            style={[
              styles.title,
              { color: theme.colors.onSurface, marginTop: 16 },
            ]}
          >
            Unable to Join List
          </Text>
          <Text
            style={[
              styles.description,
              { color: theme.colors.onSurfaceVariant, marginTop: 8 },
            ]}
          >
            {error}
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleGoHome}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              textColor={theme.colors.surface}
            >
              Go to Home
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>🎉</Text>
          <Text
            style={[
              styles.title,
              { color: theme.colors.onSurface, marginTop: 16 },
            ]}
          >
            Successfully Joined!
          </Text>
          <Text
            style={[
              styles.description,
              { color: theme.colors.onSurfaceVariant, marginTop: 8 },
            ]}
          >
            You can now view and collaborate on this list
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleGoToList}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              textColor={theme.colors.surface}
            >
              View List
            </Button>

            <Button
              mode="outlined"
              onPress={handleGoHome}
              style={[
                styles.button,
                { borderColor: theme.colors.primary, marginTop: 12 },
              ]}
              textColor={theme.colors.primary}
            >
              Go to Home
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
  },
  buttonContainer: {
    width: "100%",
    marginTop: 32,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 6,
  },
});
