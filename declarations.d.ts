declare module "@expo/vector-icons";

declare module "react-native-paper-dropdown" {
  import React from "react";
  import { TextInputProps } from "react-native-paper";

  interface DropDownItem {
    label: string;
    value: string;
  }

  interface DropDownProps extends Omit<TextInputProps, "theme"> {
    label: string;
    value: string;
    setValue: (value: string) => void;
    list: DropDownItem[];
    visible: boolean;
    showDropDown: () => void;
    onDismiss: () => void;
  }

  const DropDown: React.FC<DropDownProps>;

  export default DropDown;
}

declare global {
  const process: {
    env: Record<string, string | undefined>;
  };
}
export {};

declare module "react-native-skeleton-placeholder" {
  import * as React from "react";
  import { ViewProps } from "react-native";
  import { LinearGradient } from "expo-linear-gradient";

  export interface SkeletonPlaceholderProps extends ViewProps {
    backgroundColor?: string;
    highlightColor?: string;
    borderRadius?: number;
    speed?: number;
    children?: React.ReactNode;
    LinearGradientComponent?: typeof LinearGradient;
  }

  const SkeletonPlaceholder: React.FC<SkeletonPlaceholderProps>;

  export default SkeletonPlaceholder;
}
