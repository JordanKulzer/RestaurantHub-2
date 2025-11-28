// src/config/toastConfig.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BaseToast, ErrorToast, InfoToast } from "react-native-toast-message";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import colors from "../constants/colors";

const toastConfig = {
  success: (props: any) => (
    <View style={[styles.toastContainer, styles.successToast]}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.text1}>{props.text1}</Text>
        {props.text2 && <Text style={styles.text2}>{props.text2}</Text>}
      </View>
    </View>
  ),

  error: (props: any) => (
    <View style={[styles.toastContainer, styles.errorToast]}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="alert-circle" size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.text1}>{props.text1}</Text>
        {props.text2 && <Text style={styles.text2}>{props.text2}</Text>}
      </View>
    </View>
  ),

  info: (props: any) => (
    <View style={[styles.toastContainer, styles.infoToast]}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="information" size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.text1}>{props.text1}</Text>
        {props.text2 && <Text style={styles.text2}>{props.text2}</Text>}
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successToast: {
    backgroundColor: colors.primary,
  },
  errorToast: {
    backgroundColor: colors.secondary,
  },
  infoToast: {
    backgroundColor: colors.tertiary,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  text1: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  text2: {
    fontSize: 14,
    fontWeight: "400",
    color: "#fff",
    opacity: 0.9,
  },
});

export default toastConfig;
