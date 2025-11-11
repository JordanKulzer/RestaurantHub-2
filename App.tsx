import React, { useEffect } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import AppNavigator from "./src/navigation/AppNavigator";
import { theme, darkTheme } from "./src/theme";
import Toast from "react-native-toast-message";
import { testGooglePlacesApi } from "./src/utils/testPlacesApi";

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    testGooglePlacesApi();
  }, []);

  return (
    <PaperProvider theme={isDark ? darkTheme : theme}>
      <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
        <AppNavigator />
      </NavigationContainer>
      <Toast />
    </PaperProvider>
  );
}
