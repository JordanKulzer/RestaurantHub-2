// components/HomeSkeleton.tsx
import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

export default function HomeSkeleton() {
  const theme = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false, // ✅
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
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Image section */}
      <Animated.View style={[styles.image, { backgroundColor }]} />

      <View style={styles.content}>
        {/* Title */}
        <Animated.View style={[styles.title, { backgroundColor }]} />

        {/* Rating */}
        <Animated.View style={[styles.rating, { backgroundColor }]} />

        {/* Address lines */}
        <Animated.View style={[styles.addressLine1, { backgroundColor }]} />
        <Animated.View style={[styles.addressLine2, { backgroundColor }]} />

        {/* Link buttons */}
        <View style={styles.buttonRow}>
          <Animated.View style={[styles.button, { backgroundColor }]} />
          <Animated.View style={[styles.button, { backgroundColor }]} />
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <Animated.View style={[styles.actionButton, { backgroundColor }]} />
          <Animated.View
            style={[styles.actionButtonSmall, { backgroundColor }]}
          />
          <Animated.View style={[styles.actionButton, { backgroundColor }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
  },
  image: {
    height: 240,
    width: "100%",
  },
  content: {
    padding: 16,
  },
  title: {
    height: 22,
    width: "60%",
    marginBottom: 12,
    borderRadius: 4,
  },
  rating: {
    height: 16,
    width: "40%",
    marginBottom: 12,
    borderRadius: 4,
  },
  addressLine1: {
    height: 14,
    width: "80%",
    marginBottom: 8,
    borderRadius: 4,
  },
  addressLine2: {
    height: 14,
    width: "70%",
    marginBottom: 20,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  button: {
    height: 36,
    flex: 1,
    borderRadius: 25,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 6,
  },
  actionButton: {
    height: 50,
    width: 50,
    borderRadius: 25,
  },
  actionButtonSmall: {
    height: 40,
    width: 40,
    borderRadius: 20,
  },
});
