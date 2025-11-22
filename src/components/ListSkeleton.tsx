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
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.tertiary,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Avatar circle */}
        <Animated.View style={[styles.avatar, { backgroundColor }]} />

        <View style={styles.content}>
          {/* Title */}
          <Animated.View style={[styles.title, { backgroundColor }]} />

          {/* Subtitle */}
          <Animated.View style={[styles.subtitle, { backgroundColor }]} />
        </View>

        {/* Chevron */}
        <Animated.View style={[styles.chevron, { backgroundColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    height: 16,
    width: "50%",
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitle: {
    height: 12,
    width: "30%",
    borderRadius: 4,
  },
  chevron: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
