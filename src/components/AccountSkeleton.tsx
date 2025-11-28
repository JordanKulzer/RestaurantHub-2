// components/AccountSkeleton.tsx
import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

export default function AccountSkeleton() {
  const theme = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const backgroundColor = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surface, theme.colors.tertiary + "88"],
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.dark
            ? theme.colors.elevation.level1
            : theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      {/* Avatar */}
      <Animated.View style={[styles.avatar, { backgroundColor }]} />

      {/* Display Name */}
      <Animated.View style={[styles.displayName, { backgroundColor }]} />

      {/* Username */}
      <Animated.View style={[styles.username, { backgroundColor }]} />

      {/* Edit Button */}
      <Animated.View style={[styles.editButton, { backgroundColor }]} />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {/* Stat 1 */}
        <View style={styles.stat}>
          <Animated.View style={[styles.statValue, { backgroundColor }]} />
          <Animated.View style={[styles.statLabel, { backgroundColor }]} />
        </View>

        <View
          style={[styles.divider, { backgroundColor: theme.colors.outline }]}
        />

        {/* Stat 2 */}
        <View style={styles.stat}>
          <Animated.View style={[styles.statValue, { backgroundColor }]} />
          <Animated.View style={[styles.statLabel, { backgroundColor }]} />
        </View>

        <View
          style={[styles.divider, { backgroundColor: theme.colors.outline }]}
        />

        {/* Stat 3 */}
        <View style={styles.stat}>
          <Animated.View style={[styles.statValue, { backgroundColor }]} />
          <Animated.View style={[styles.statLabel, { backgroundColor }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 12,
  },
  displayName: {
    width: 120,
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  username: {
    width: 100,
    height: 16,
    borderRadius: 4,
    marginBottom: 16,
  },
  editButton: {
    width: 100,
    height: 36,
    borderRadius: 20,
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
    width: 40,
    height: 28,
    borderRadius: 4,
    marginBottom: 4,
  },
  statLabel: {
    width: 60,
    height: 14,
    borderRadius: 4,
  },
  divider: {
    width: 1,
    height: 40,
  },
});
