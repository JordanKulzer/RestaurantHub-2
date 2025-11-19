import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { supabase } from "../utils/supabaseClient";

import {
  HomeScreen,
  ShuffleScreen,
  AccountScreen,
  SearchScreen,
  LoginScreen,
  SignupScreen,
  ListDetailScreen,
  RestaurantDetailScreen,
  FavoritesDetailsScreen,
} from "../screens";

import { Session } from "@supabase/supabase-js";
import { AuthStackParamList, RootStackParamList, TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const MyStuffStack = createNativeStackNavigator();

function MyStuffNavigator() {
  return (
    <MyStuffStack.Navigator screenOptions={{ headerShown: false }}>
      <MyStuffStack.Screen name="AccountMain" component={AccountScreen} />
      <MyStuffStack.Screen name="ListDetail" component={ListDetailScreen} />
      <MyStuffStack.Screen
        name="FavoritesDetail"
        component={FavoritesDetailsScreen}
      />
    </MyStuffStack.Navigator>
  );
}

function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
          if (route.name === "My Stuff") icon = "favorite";
          return <MaterialIcons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shuffle" component={ShuffleScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="My Stuff" component={MyStuffNavigator} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => listener.subscription?.unsubscribe();
  }, []);

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <>
          <RootStack.Screen name="Tabs" component={TabNavigator} />
          <RootStack.Screen
            name="RestaurantDetail"
            component={RestaurantDetailScreen}
          />
        </>
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
