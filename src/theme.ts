import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import colors from "./constants/colors";

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary, // forest green
    secondary: colors.secondary, // burnt orange
    tertiary: colors.tertiary, // navy
    surface: colors.surfaceLight,
    background: colors.backgroundLight,
    onSurface: colors.textPrimary,
    onBackground: colors.textPrimary,
    outline: colors.borderLight,
    likeColor: colors.likeColor,
    dislikeColor: colors.dislikeColor,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary, // forest green
    secondary: colors.secondary, // burnt orange
    tertiary: colors.tertiary, // navy
    surface: colors.surfaceDark,
    background: colors.backgroundDark,
    onSurface: "#EAEAEA",
    onBackground: "#EAEAEA",
    outline: colors.borderDark,
    likeColor: colors.likeColor,
    dislikeColor: colors.dislikeColor,
  },
};
