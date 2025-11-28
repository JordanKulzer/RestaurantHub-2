// components/ListSkeleton.tsx
import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

export default function ListSkeleton() {
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
        },
      ]}
    >
      <View style={styles.row}>
        {/* Icon (larger square with rounded corners) */}
        <Animated.View style={[styles.icon, { backgroundColor }]} />

        <View style={styles.content}>
          {/* Title */}
          <Animated.View style={[styles.title, { backgroundColor }]} />

          {/* Place count */}
          <Animated.View style={[styles.placeCount, { backgroundColor }]} />
        </View>

        {/* Chevron */}
        <Animated.View style={[styles.chevron, { backgroundColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    height: 17,
    width: "60%",
    borderRadius: 4,
    marginBottom: 8,
  },
  placeCount: {
    height: 14,
    width: "35%",
    borderRadius: 4,
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
