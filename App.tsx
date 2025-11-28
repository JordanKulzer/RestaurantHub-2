import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { PaperProvider } from "react-native-paper";
import AppNavigator from "./src/navigation/AppNavigator";
import { theme, darkTheme } from "./src/theme";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useThemeMode } from "./src/contexts/ThemeContext";
import toastConfig from "./src/config/toastConfig";

function AppContent() {
  const { isDarkMode } = useThemeMode();

  return (
    <PaperProvider theme={isDarkMode ? darkTheme : theme}>
      <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
        <AppNavigator />
      </NavigationContainer>
      <Toast config={toastConfig} />
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
