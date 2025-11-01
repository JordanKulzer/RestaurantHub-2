import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Avatar, Card, Button } from "react-native-paper";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Avatar.Image
        size={100}
        source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }}
      />
      <Text style={styles.name}>Jordan Kulzer</Text>

      <Card style={styles.card}>
        <Card.Title title="Favorites" />
        <Card.Content>
          <Text>• Cane Rosso</Text>
          <Text>• Musume</Text>
        </Card.Content>
      </Card>

      <Button mode="outlined" style={styles.logoutButton}>
        Log Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 20 },
  name: { fontSize: 20, fontWeight: "600", marginVertical: 10 },
  card: { width: "100%", marginTop: 20 },
  logoutButton: { marginTop: 20 },
});
