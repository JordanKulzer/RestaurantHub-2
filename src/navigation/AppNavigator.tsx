import React, { useEffect, useState } from "react";
import { StyleSheet, Linking } from "react-native";
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
  FavoritesDetailScreen,
  JoinListScreen,
  FriendsScreen,
  WinnersDetailScreen,
  SettingsScreen,
} from "../screens";
import { Session } from "@supabase/supabase-js";
import { AuthStackParamList, RootStackParamList, TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AccountStack = createNativeStackNavigator();

function AccountNavigator() {
  return (
    <AccountStack.Navigator screenOptions={{ headerShown: false }}>
      <AccountStack.Screen name="AccountMain" component={AccountScreen} />
      <AccountStack.Screen name="ListDetail" component={ListDetailScreen} />
      <AccountStack.Screen
        name="FavoritesDetail"
        component={FavoritesDetailScreen}
      />
      <AccountStack.Screen
        name="WinnersDetail"
        component={WinnersDetailScreen}
      />
      <AccountStack.Screen name="Friends" component={FriendsScreen} />
      <AccountStack.Screen name="Settings" component={SettingsScreen} />
    </AccountStack.Navigator>
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
          if (route.name === "Account") icon = "favorite";
          return <MaterialIcons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shuffle" component={ShuffleScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Account" component={AccountNavigator} />
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

  // ✅ Handle deep links for joining lists
  useEffect(() => {
    // Handle initial URL when app opens from a link
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log("📱 App opened with URL:", url);
        // URL will be handled by React Navigation linking config
      }
    };

    handleInitialURL();

    // Handle URLs when app is already open
    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("📱 Deep link received:", url);
      // URL will be handled by React Navigation linking config
    });

    return () => {
      subscription.remove();
    };
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
          {/* ✅ Add JoinListScreen for handling share links */}
          <RootStack.Screen
            name="JoinList"
            component={JoinListScreen}
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
        </>
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
