import React, { useEffect, useState } from "react";
import { Share, View } from "react-native";
import {
  Menu,
  IconButton,
  Divider,
  Text,
  useTheme,
  Icon,
} from "react-native-paper";
import { getLists, addToList } from "../utils/listsApi";

interface Props {
  restaurant: any;
  isFavorite: boolean;
  onToggleFavorite: (r: any) => void;
  onCreateNewList: () => void;
}

type ListRow = {
  id: string;
  title: string;
  description?: string | null;
  created_at: string;
};

export default function RestaurantOptionsMenu({
  restaurant,
  isFavorite,
  onToggleFavorite,
  onCreateNewList,
}: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [lists, setLists] = useState<ListRow[]>([]);

  const openMenu = async () => {
    await loadLists();
    setVisible(true);
  };
  const closeMenu = () => setVisible(false);

  const loadLists = async () => {
    const data = await getLists();
    setLists(data);
  };

  const handleShare = async () => {
    closeMenu();
    try {
      await Share.share({
        message: `Check out ${restaurant.name}! ${
          restaurant.address ? restaurant.address : ""
        }`,
      });
    } catch (error) {
      console.error("❌ Share failed:", error);
    }
  };

  const handleAddToList = async (listId: string) => {
    await addToList(listId, restaurant);
    closeMenu();
  };

  const renderIcon = (name: string) => (
    <Icon source={name} color={theme.colors.tertiary} size={20} />
  );

  return (
    <Menu
      key={visible ? "open" : "closed"}
      visible={visible}
      onDismiss={closeMenu}
      anchor={
        <IconButton
          icon="plus-circle-outline"
          size={26}
          iconColor={theme.colors.tertiary}
          onPress={openMenu}
          style={{
            borderRadius: 50,
            elevation: 2,
          }}
        />
      }
      contentStyle={{
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        paddingVertical: 4,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
        width: 220,
      }}
      anchorPosition="bottom"
    >
      {/* Section Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <Text
          style={{
            color: theme.colors.tertiary,
            fontWeight: "600",
            fontSize: 13,
          }}
        >
          Quick Actions
        </Text>
      </View>

      {/* ❤️ Add / Remove from Favorites */}
      <Menu.Item
        onPress={() => {
          // closeMenu();
          onToggleFavorite(restaurant);
        }}
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        leadingIcon={() => renderIcon(isFavorite ? "heart" : "heart-outline")}
        titleStyle={{ color: theme.colors.tertiary }}
        rippleColor={theme.colors.tertiary + "22"}
      />

      <Divider
        style={{ backgroundColor: theme.colors.outlineVariant, opacity: 0.5 }}
      />

      {/* ➕ Create New List */}
      <Menu.Item
        onPress={() => {
          closeMenu();
          onCreateNewList();
        }}
        title="Create New List"
        leadingIcon={() => renderIcon("plus")}
        titleStyle={{ color: theme.colors.tertiary }}
        rippleColor={theme.colors.tertiary + "22"}
      />

      {/* 🗂️ User Lists */}
      {lists.length > 0 ? (
        <>
          <Divider
            style={{
              backgroundColor: theme.colors.outlineVariant,
              opacity: 0.5,
            }}
          />
          <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
            <Text
              style={{
                color: theme.colors.tertiary,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              Your Lists
            </Text>
          </View>
          {lists.map((l) => (
            <Menu.Item
              key={l.id}
              onPress={() => handleAddToList(l.id)}
              title={`Add to ${l.title}`}
              leadingIcon={() => renderIcon("playlist-plus")}
              titleStyle={{ color: theme.colors.tertiary }}
              rippleColor={theme.colors.tertiary + "22"}
            />
          ))}
        </>
      ) : (
        <Menu.Item
          title="No lists available"
          disabled
          titleStyle={{ color: theme.colors.tertiary + "88" }}
          leadingIcon={() => renderIcon("alert-circle-outline")}
        />
      )}

      <Divider
        style={{ backgroundColor: theme.colors.outlineVariant, opacity: 0.5 }}
      />

      {/* 📤 Share */}
      <Menu.Item
        onPress={handleShare}
        title="Share"
        leadingIcon={() => renderIcon("share-variant")}
        titleStyle={{ color: theme.colors.tertiary }}
        rippleColor={theme.colors.tertiary + "22"}
      />
    </Menu>
  );
}
