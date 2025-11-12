import React from "react";
import { StyleSheet } from "react-native"; // ✅ add this
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import {
  HomeScreen,
  ShuffleScreen,
  ProfileScreen,
  FavoritesScreen,
  SearchScreen,
} from "../screens";
import { useTheme } from "react-native-paper";

export type TabParamList = {
  Home: undefined;
  Shuffle: undefined;
  Profile: undefined;
  Search: undefined;
  Favorites: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // headerTitleAlign: "center",
        // headerStyle: { backgroundColor: theme.colors.surface },
        headerTitleStyle: { color: theme.colors.onSurface },
        tabBarActiveTintColor: theme.colors.tertiary,
        tabBarInactiveTintColor: theme.colors.onSurface + "99",
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarIcon: ({ color, size }) => {
          let icon: keyof typeof MaterialIcons.glyphMap = "restaurant-menu";
          if (route.name === "Shuffle") icon = "shuffle";
          if (route.name === "Search") icon = "search";
          if (route.name === "Favorites") icon = "favorite";
          return <MaterialIcons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name="Shuffle"
        component={ShuffleScreen}
        options={{ title: "Shuffler" }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: "Search" }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: "My Stuff" }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RootTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
    </Stack.Navigator>
  );
}
