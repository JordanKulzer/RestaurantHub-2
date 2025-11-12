// src/components/AddToListModal.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Portal, Text, Button, useTheme } from "react-native-paper";

interface AddToListModalProps {
  visible: boolean;
  onDismiss: () => void;
  restaurant?: any; // can be typed later
  onAddToLiked: (restaurant: any) => void;
  onAddToExistingList: (restaurant: any) => void;
  onCreateNewList: (restaurant: any) => void;
}

export default function AddToListModal({
  visible,
  onDismiss,
  restaurant,
  onAddToLiked,
  onAddToExistingList,
  onCreateNewList,
}: AddToListModalProps) {
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
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Add this restaurant to:
        </Text>

        <Button
          mode="contained"
          buttonColor={theme.colors.tertiary}
          textColor="#fff"
          style={styles.button}
          onPress={() => {
            if (restaurant) onAddToLiked(restaurant);
            onDismiss();
          }}
        >
          ❤️ Liked
        </Button>

        <Button
          mode="outlined"
          textColor={theme.colors.primary}
          style={styles.button}
          onPress={() => {
            if (restaurant) onAddToExistingList(restaurant);
            onDismiss();
          }}
        >
          📋 Add to existing list
        </Button>

        <Button
          mode="outlined"
          textColor={theme.colors.secondary}
          style={styles.button}
          onPress={() => {
            if (restaurant) onCreateNewList(restaurant);
            onDismiss();
          }}
        >
          ➕ Create new list
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: "auto",
    marginHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    marginVertical: 8,
    borderRadius: 25,
  },
});
