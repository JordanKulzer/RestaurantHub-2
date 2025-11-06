import React from "react";
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

export type TabParamList = {
  Home: undefined;
  Shuffle: undefined;
  Profile: undefined;
  Favorites: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({
        route,
      }: {
        route: RouteProp<TabParamList, keyof TabParamList>;
      }): BottomTabNavigationOptions => ({
        headerShown: true,
        headerTitleAlign: "center",
        tabBarActiveTintColor: "#5e60ce",
        tabBarInactiveTintColor: "gray",
        headerStyle: { backgroundColor: "transparent" },
        tabBarStyle: { backgroundColor: "#fff" },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          let icon: keyof typeof MaterialIcons.glyphMap = "restaurant-menu";
          if (route.name === "Shuffle") icon = "shuffle";
          if (route.name === "Profile") icon = "person";
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
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: "My Favs" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
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
