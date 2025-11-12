import React, { useEffect, useState } from "react";
import { View } from "react-native";
import {
  Menu,
  Divider,
  Checkbox,
  TextInput,
  Button,
  Text,
  useTheme,
} from "react-native-paper";
import {
  getLists,
  createList,
  addToList,
  SavedList,
} from "../utils/tempListStorage";

interface AddToListMenuProps {
  visible: boolean;
  onDismiss: () => void;
  anchor: React.ReactNode;
  onAddToFavorites?: () => void;
}

export default function AddToListMenu({
  visible,
  onDismiss,
  anchor,
  onAddToFavorites,
}: AddToListMenuProps) {
  const theme = useTheme();
  const [lists, setLists] = useState<SavedList[]>([]);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) loadLists();
  }, [visible]);

  const loadLists = async () => {
    const data = await getLists();
    setLists(data);
  };

  const toggleListSelection = (id: string) => {
    setSelectedLists((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await createList(newListName);
    setNewListName("");
    setCreating(false);
    await loadLists();
  };

  const handleSaveSelections = async () => {
    for (const id of selectedLists) {
      //await addToList(id);
    }
    setSelectedLists(new Set());
    onDismiss();
  };

  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor}
      anchorPosition="bottom"
      style={{ width: 280 }}
    >
      {/* ❤️ Favorites */}
      <Text
        style={{
          marginLeft: 16,
          marginTop: 4,
          marginBottom: 2,
          fontWeight: "600",
          color: theme.colors.onSurfaceVariant,
          fontSize: 13,
        }}
      >
        Favorites
      </Text>
      <Menu.Item
        leadingIcon={() => (
          <Checkbox
            status="checked"
            color={theme.colors.primary}
            onPress={onAddToFavorites}
          />
        )}
        title="Add to Favorites"
        onPress={onAddToFavorites}
      />

      <Divider style={{ marginVertical: 4 }} />

      {/* ➕ Create New List */}
      <Text
        style={{
          marginLeft: 16,
          marginTop: 2,
          marginBottom: 2,
          fontWeight: "600",
          color: theme.colors.onSurfaceVariant,
          fontSize: 13,
        }}
      >
        Create New List
      </Text>
      {!creating ? (
        <Menu.Item
          leadingIcon="plus"
          title="New List"
          onPress={() => setCreating(true)}
        />
      ) : (
        <View style={{ padding: 8 }}>
          <TextInput
            mode="outlined"
            dense
            placeholder="List name"
            value={newListName}
            onChangeText={setNewListName}
            style={{ marginBottom: 6 }}
          />
          <Button
            mode="contained-tonal"
            compact
            onPress={handleCreateList}
            disabled={!newListName.trim()}
          >
            Create
          </Button>
        </View>
      )}

      <Divider style={{ marginVertical: 4 }} />

      {/* 🗂️ Add To... */}
      <Text
        style={{
          marginLeft: 16,
          marginTop: 2,
          marginBottom: 2,
          fontWeight: "600",
          color: theme.colors.onSurfaceVariant,
          fontSize: 13,
        }}
      >
        Add to...
      </Text>
      {lists.length === 0 ? (
        <Menu.Item title="No lists yet" disabled />
      ) : (
        lists.map((l) => (
          <Menu.Item
            key={l.id}
            title={l.name}
            leadingIcon={() => (
              <Checkbox
                status={selectedLists.has(l.id) ? "checked" : "unchecked"}
                onPress={() => toggleListSelection(l.id)}
                color={theme.colors.primary}
              />
            )}
            onPress={() => toggleListSelection(l.id)}
          />
        ))
      )}

      {selectedLists.size > 0 && (
        <View style={{ padding: 8 }}>
          <Button
            mode="contained"
            buttonColor={theme.colors.primary}
            textColor="#fff"
            onPress={handleSaveSelections}
          >
            Save Selections ({selectedLists.size})
          </Button>
        </View>
      )}
    </Menu>
  );
}
