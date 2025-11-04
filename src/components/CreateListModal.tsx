// src/components/CreateListModal.tsx
import React, { useState } from "react";
import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  useTheme,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onCreate: (list: { name: string; photoUri?: string | null }) => void;
}

export default function CreateListModal({
  visible,
  onDismiss,
  onCreate,
}: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate save delay
    onCreate({ name: name.trim(), photoUri: photo });
    setName("");
    setPhoto(null);
    setLoading(false);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text style={styles.header}>Create New List</Text>

        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.imagePreview} />
          ) : (
            <Text style={{ color: colors.primary }}>+ Add Photo</Text>
          )}
        </TouchableOpacity>

        <TextInput
          label="List Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleCreate}
          disabled={!name.trim() || loading}
          loading={loading}
          style={styles.createButton}
        >
          Create List
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: "white",
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
  imagePicker: {
    alignItems: "center",
    justifyContent: "center",
    height: 150,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  input: { marginBottom: 16 },
  createButton: { marginTop: 4 },
});
