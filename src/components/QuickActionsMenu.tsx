// src/components/QuickActionsMenu.tsx
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
import { addFavorite, removeFavorite } from "../utils/favoritesApis";
import { getLists, addToList, removeFromList } from "../utils/listsApi";
import { toPointer } from "../utils/restaurantPointers";
import { supabase } from "../utils/supabaseClient";

interface Props {
  restaurant: any;
  isFavorite: boolean;
  onFavoriteChange?: () => void;
  onCreateNewList: (onCreated: (newList: any) => void) => void;
}

type ListRow = {
  id: string;
  title: string;
  description?: string | null;
  created_at: string;
  placesCount?: number;
};

type MembershipMap = Record<
  string,
  {
    itemId: string;
  }
>;

export default function QuickActionsMenu({
  restaurant,
  isFavorite,
  onFavoriteChange,
  onCreateNewList,
}: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipMap>({});
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    if (visible) {
      loadListsAndMemberships();
    }
  }, [visible, restaurant?.id]);

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const loadListsAndMemberships = async () => {
    try {
      setLoadingLists(true);
      const data = await getLists();
      setLists(data);

      const pointer = toPointer(restaurant);

      const { data: listItems, error } = await supabase
        .from("list_items")
        .select("id, list_id")
        .eq("restaurant_id", pointer.id);

      if (error) {
        console.error("❌ list_items membership query failed:", error);
        setMemberships({});
        return;
      }

      const map: MembershipMap = {};
      (listItems ?? []).forEach((row: any) => {
        map[row.list_id] = { itemId: row.id };
      });
      setMemberships(map);
    } catch (e) {
      console.error("❌ getLists/memberships failed:", e);
    } finally {
      setLoadingLists(false);
    }
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

  const handleToggleFavorite = async () => {
    try {
      const pointer = toPointer(restaurant);
      if (isFavorite) {
        await removeFavorite(pointer.id);
      } else {
        await addFavorite(pointer);
      }
      onFavoriteChange?.();
    } catch (e) {
      console.error("❌ favorite toggle failed:", e);
    }
  };

  const handleToggleListItem = async (listId: string) => {
    const pointer = toPointer(restaurant);
    const membership = memberships[listId];

    try {
      if (membership) {
        // Already in this list → remove
        await removeFromList(membership.itemId);
        setMemberships((prev) => {
          const copy = { ...prev };
          delete copy[listId];
          return copy;
        });
      } else {
        // Not in this list → add
        const inserted = await addToList(listId, pointer);
        setMemberships((prev) => ({
          ...prev,
          [listId]: { itemId: inserted.id },
        }));
      }
      closeMenu();
    } catch (e) {
      console.error("❌ add/remove list failed:", e);
    }
  };

  const handleCreateNewList = () => {
    const pointer = toPointer(restaurant);

    closeMenu();
    onCreateNewList(async (newList) => {
      try {
        const inserted = await addToList(newList.id, pointer);
        setMemberships((prev) => ({
          ...prev,
          [newList.id]: { itemId: inserted.id },
        }));
      } catch (e) {
        console.error("❌ addToList (new list) failed:", e);
      }
    });
  };

  const renderIcon = (name: string, color: string) => (
    <Icon source={name} color={color} size={20} />
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
        width: 240,
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

      {/* ❤️ Favorites */}
      <Menu.Item
        onPress={handleToggleFavorite}
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        leadingIcon={() =>
          renderIcon(
            isFavorite ? "heart" : "heart-outline",
            theme.colors.tertiary
          )
        }
        titleStyle={{ color: theme.colors.tertiary }}
        rippleColor={theme.colors.tertiary + "22"}
      />

      <Divider
        style={{ backgroundColor: theme.colors.outlineVariant, opacity: 0.5 }}
      />

      {/* ➕ Create New List */}
      <Menu.Item
        onPress={handleCreateNewList}
        title="Create New List"
        leadingIcon={() => renderIcon("plus", theme.colors.tertiary)}
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

          {loadingLists ? (
            <Menu.Item
              title="Loading lists…"
              disabled
              titleStyle={{ color: theme.colors.onSurfaceVariant }}
              leadingIcon={() =>
                renderIcon("clock-outline", theme.colors.tertiary)
              }
            />
          ) : (
            lists.map((l) => {
              const membership = memberships[l.id];
              const isInList = !!membership;

              return (
                <Menu.Item
                  key={l.id}
                  onPress={() => handleToggleListItem(l.id)}
                  title={
                    isInList ? `Remove from ${l.title}` : `Add to ${l.title}`
                  }
                  leadingIcon={() =>
                    renderIcon(
                      isInList ? "playlist-remove" : "playlist-plus",
                      isInList ? theme.colors.secondary : theme.colors.tertiary
                    )
                  }
                  titleStyle={
                    isInList
                      ? { color: theme.colors.secondary }
                      : { color: theme.colors.tertiary }
                  }
                  rippleColor={theme.colors.tertiary + "22"}
                />
              );
            })
          )}
        </>
      ) : (
        <Menu.Item
          title="No lists available"
          disabled
          titleStyle={{ color: theme.colors.tertiary + "88" }}
          leadingIcon={() =>
            renderIcon("alert-circle-outline", theme.colors.tertiary)
          }
        />
      )}

      <Divider
        style={{ backgroundColor: theme.colors.outlineVariant, opacity: 0.5 }}
      />

      {/* 📤 Share */}
      <Menu.Item
        onPress={handleShare}
        title="Share"
        leadingIcon={() => renderIcon("share-variant", theme.colors.tertiary)}
        titleStyle={{ color: theme.colors.tertiary }}
        rippleColor={theme.colors.tertiary + "22"}
      />
    </Menu>
  );
}
