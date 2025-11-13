import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { supabase } from "../utils/supabaseClient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (!error) {
      navigation.navigate("Login");
    } else {
      console.log("❌ Sign-up error:", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={{ marginBottom: 24 }}>
        Create Account
      </Text>

      <TextInput
        label="Email"
        value={email}
        mode="outlined"
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        label="Password"
        value={password}
        secureTextEntry
        mode="outlined"
        onChangeText={setPassword}
        style={styles.input}
      />

      <Button
        mode="contained"
        loading={loading}
        disabled={!email || !password}
        onPress={handleSignup}
        style={styles.button}
      >
        Sign Up
      </Button>

      <Button onPress={() => navigation.navigate("Login")}>
        Back to Login
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  input: { marginBottom: 14 },
  button: { marginVertical: 6 },
});
