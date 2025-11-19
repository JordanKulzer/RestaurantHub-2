// components/HomeSkeleton.tsx
import React from "react";
import { View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder-expo";
import { useTheme } from "react-native-paper";

export default function HomeSkeleton() {
  const theme = useTheme();

  const surface = theme.colors.surface;
  const highlight = theme.colors.tertiary + "88"; // strong, noticeable shimmer

  return (
    <SkeletonPlaceholder
      backgroundColor={surface} // neutral base
      highlightColor={highlight} // high contrast brand shimmer
      speed={1100}
    >
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 16,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Image section */}
        <View style={{ height: 240, width: "100%" }} />

        <View style={{ padding: 16 }}>
          {/* Title */}
          <View style={{ height: 22, width: "60%", marginBottom: 12 }} />

          {/* Rating row */}
          <View style={{ height: 16, width: "40%", marginBottom: 12 }} />

          {/* Address lines */}
          <View style={{ height: 14, width: "80%", marginBottom: 8 }} />
          <View style={{ height: 14, width: "70%", marginBottom: 20 }} />

          {/* Link buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <View style={{ height: 36, width: "48%", borderRadius: 25 }} />
            <View style={{ height: 36, width: "48%", borderRadius: 25 }} />
          </View>

          {/* Action row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-evenly",
              marginTop: 6,
            }}
          >
            <View style={{ height: 50, width: 50, borderRadius: 25 }} />
            <View style={{ height: 40, width: 40, borderRadius: 20 }} />
            <View style={{ height: 50, width: 50, borderRadius: 25 }} />
          </View>
        </View>
      </View>
    </SkeletonPlaceholder>
  );
}
