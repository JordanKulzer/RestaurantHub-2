// components/UpgradeModal.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Portal, Text, Button, useTheme } from "react-native-paper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  freeLimit: number;
  onMaybeLater?: () => void;
}

export default function UpgradeModal({
  visible,
  onDismiss,
  freeLimit,
  onMaybeLater,
}: Props) {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          ✨ Unlock Unlimited Swipes
        </Text>

        <Text style={[styles.subtitle, { color: theme.colors.onSurface }]}>
          You've reached your daily limit of {freeLimit} swipes
        </Text>

        <View style={styles.list}>
          {[
            "Unlimited swipes every day",
            "Unlimited rewinds",
            "Advanced filters",
            "Save unlimited favorites",
          ].map((t, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.icon}>⭐</Text>
              <Text style={[styles.text, { color: theme.colors.onSurface }]}>
                {t}
              </Text>
            </View>
          ))}
        </View>

        <Button
          mode="contained"
          onPress={() => {
            console.log("Navigate to premium subscription");
            onDismiss();
          }}
          buttonColor={theme.colors.primary}
          style={styles.button}
        >
          Upgrade to Premium - $4.99/month
        </Button>

        <Button
          mode="text"
          textColor={theme.colors.onSurface + "99"}
          onPress={() => {
            if (onMaybeLater) onMaybeLater(); // <-- use custom behavior
            else onDismiss(); // fallback to old behavior
          }}
        >
          Maybe Later
        </Button>

        <Text style={[styles.note, { color: theme.colors.onSurface + "66" }]}>
          Free swipes reset daily at midnight
        </Text>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 24, textAlign: "center" },
  list: { width: "100%", marginBottom: 24 },
  item: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  icon: { fontSize: 22, marginRight: 12 },
  text: { fontSize: 16 },
  button: { width: "100%", borderRadius: 25, paddingVertical: 4 },
  note: { fontSize: 12, marginTop: 16, textAlign: "center" },
});
