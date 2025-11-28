// src/components/ShuffleSessionSelector.tsx
import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ShuffleSessionSelectorProps {
  onStartCollaborative: () => void;
  onJoinSession: () => void;
}

export default function ShuffleSessionSelector({
  onStartCollaborative,
  onJoinSession,
}: ShuffleSessionSelectorProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        Shuffle with a friend
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onStartCollaborative}
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary + "15",
              borderColor: theme.colors.primary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="account-multiple-plus"
            size={36}
            color={theme.colors.tertiary}
          />
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.onTertiaryContainer },
            ]}
          >
            Host Session
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onJoinSession}
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary + "15",
              borderColor: theme.colors.primary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="login"
            size={36}
            color={theme.colors.tertiary}
          />
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.onSecondaryContainer },
            ]}
          >
            Join Session
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.orText, { color: theme.colors.onSurfaceVariant }]}>
        or begin shuffling below!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonSubtext: {
    fontSize: 12,
    textAlign: "center",
  },
  orText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});
