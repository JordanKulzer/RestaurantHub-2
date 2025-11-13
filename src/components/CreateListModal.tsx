// src/components/CreateListModal.tsx
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  useTheme,
} from "react-native-paper";
import { createList } from "../utils/listsApi";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** Called after a list is successfully created so parent can reload */
  onCreated: () => void;
}

export default function CreateListModal({
  visible,
  onDismiss,
  onCreated,
}: Props) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    try {
      setLoading(true);
      await createList(trimmed);
      setName("");
      onCreated();
      onDismiss();
    } catch (err) {
      console.error("❌ CreateListModal: failed to create list:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName("");
      onDismiss();
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text style={[styles.header, { color: theme.colors.onSurface }]}>
          Create New List
        </Text>

        <TextInput
          label="List Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />

        <View style={styles.buttonRow}>
          <Button
            mode="text"
            onPress={handleClose}
            disabled={loading}
            textColor={theme.colors.onSurfaceVariant}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleCreate}
            disabled={!name.trim() || loading}
            loading={loading}
          >
            Create
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
