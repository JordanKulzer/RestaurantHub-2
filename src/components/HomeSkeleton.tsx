import React from "react";
import { View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder-expo";
import { LinearGradient } from "expo-linear-gradient";

export default function HomeSkeleton() {
  return (
    <SkeletonPlaceholder borderRadius={12}>
      <View style={{ marginBottom: 24 }}>
        <View style={{ height: 220, marginBottom: 20 }} />
      </View>

      <View style={{ height: 28, width: 180, marginBottom: 12 }} />
      <View style={{ height: 100, marginBottom: 20 }} />

      {[...Array(3)].map((_, i) => (
        <View key={i} style={{ height: 160, marginBottom: 20 }} />
      ))}
    </SkeletonPlaceholder>
  );
}
