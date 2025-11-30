// src/components/QuickActionsMenu.tsx
import React, { useEffect, useRef, useState } from "react";
import { Share, View } from "react-native";
import {
  Menu,
  IconButton,
  Divider,
  Text,
  useTheme,
  Icon,
  Portal,
} from "react-native-paper";
import { addFavorite, removeFavorite } from "../utils/favoritesApis";
import { getLists, addToList, removeFromList } from "../utils/listsApi";
import { toPointer } from "../utils/restaurantPointers";
import { supabase } from "../utils/supabaseClient";

interface Props {
  restaurant: any;
  isFavorite: boolean;

  /** New props */
  isWinner?: boolean;
  onRemoveWinner?: (restaurantId: string) => void;
  iconColor?: string;

  onFavoriteChange?: () => void;
  onCreateNewList: (onCreated: (newList: any) => void) => void;

  preloadedLists?: any[];
  listsReady?: boolean;
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

  /** NEW */
  isWinner = false,
  onRemoveWinner,
  iconColor = "#fff",

  preloadedLists = [],
  listsReady = false,
}: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [lists, setLists] = useState<ListRow[]>(preloadedLists);
  const [memberships, setMemberships] = useState<MembershipMap>({});
  const [loadingLists, setLoadingLists] = useState(!listsReady);

  const buttonRef = useRef<View>(null);
  const [anchorPosition, setAnchorPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (preloadedLists.length > 0) {
      setLists(preloadedLists);
      setLoadingLists(false);
    }
  }, [preloadedLists]);

  useEffect(() => {
    if (restaurant?.id) {
      loadMemberships();
    }
  }, [restaurant?.id]);

  const openMenu = () => {
    if (buttonRef.current) {
      buttonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setAnchorPosition({
          x: pageX + width / 2,
          y: pageY + height,
        });
        setVisible(true);
      });
    } else {
      setVisible(true);
    }
  };

  const closeMenu = () => setVisible(false);

  const loadMemberships = async () => {
    try {
      const pointer = toPointer(restaurant);

      const { data: listItems } = await supabase
        .from("list_items")
        .select("id, list_id")
        .eq("restaurant_id", pointer.id);

      const map: MembershipMap = {};
      (listItems ?? []).forEach((row: any) => {
        map[row.list_id] = { itemId: row.id };
      });
      setMemberships(map);
    } catch (e) {
      console.error("❌ memberships query failed:", e);
      setMemberships({});
    }
  };

  const handleShare = async () => {
    closeMenu();
    try {
      await Share.share({
        message: `Check out ${restaurant.name}! ${restaurant.address ?? ""}`,
      });
    } catch (error) {
      console.error("❌ Share failed:", error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const pointer = toPointer(restaurant);
      if (isFavorite) await removeFavorite(pointer.id);
      else await addFavorite(pointer);

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
        await removeFromList(membership.itemId);
        setMemberships((prev) => {
          const copy = { ...prev };
          delete copy[listId];
          return copy;
        });
      } else {
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
        console.error("❌ addToList(new) failed:", e);
      }
    });
  };

  const renderIcon = (name: string, color: string) => (
    <Icon source={name} color={color} size={20} />
  );

  return (
    <>
      <View ref={buttonRef} collapsable={false}>
        <IconButton
          icon="plus-circle-outline"
          size={26}
          iconColor={iconColor} // <--- NEW OVERRIDE
          onPress={openMenu}
          style={{
            borderRadius: 50,
            elevation: 2,
            margin: 0,
            padding: 0,
            marginTop: -10,
          }}
        />
      </View>

      <Portal>
        <Menu
          visible={visible}
          onDismiss={closeMenu}
          anchor={anchorPosition}
          anchorPosition="bottom"
          contentStyle={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            paddingVertical: 4,
            width: 240,
            elevation: 5,
          }}
        >
          {/* QUICK ACTIONS HEADER */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
            <Text
              style={{
                color: theme.colors.tertiary,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              Quick Actions
            </Text>
          </View>

          {/* FAVORITES */}
          <Menu.Item
            onPress={handleToggleFavorite}
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            leadingIcon={() =>
              renderIcon(
                isFavorite ? "heart" : "heart-outline",
                isFavorite ? theme.colors.secondary : theme.colors.tertiary
              )
            }
            titleStyle={{
              color: isFavorite
                ? theme.colors.secondary
                : theme.colors.tertiary,
            }}
          />

          <Divider />

          {/* CREATE NEW LIST
          <Menu.Item
            onPress={handleCreateNewList}
            title="Create New List"
            leadingIcon={() => renderIcon("plus", theme.colors.tertiary)}
            titleStyle={{ color: theme.colors.tertiary }}
          /> */}

          {/* USER LISTS */}
          {lists.length > 0 && (
            <>
              <Divider />
              <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                <Text
                  style={{
                    color: theme.colors.tertiary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Your Lists
                </Text>
              </View>
              <Menu.Item
                onPress={handleCreateNewList}
                title="Create New List"
                leadingIcon={() => renderIcon("plus", theme.colors.tertiary)}
                titleStyle={{ color: theme.colors.tertiary }}
              />

              {!loadingLists &&
                lists.map((l) => {
                  const membership = memberships[l.id];
                  const isInList = !!membership;

                  return (
                    <Menu.Item
                      key={l.id}
                      onPress={() => handleToggleListItem(l.id)}
                      title={
                        isInList
                          ? `Remove from ${l.title}`
                          : `Add to ${l.title}`
                      }
                      leadingIcon={() =>
                        renderIcon(
                          isInList ? "playlist-remove" : "playlist-plus",
                          isInList
                            ? theme.colors.secondary
                            : theme.colors.tertiary
                        )
                      }
                      titleStyle={{
                        color: isInList
                          ? theme.colors.secondary
                          : theme.colors.tertiary,
                      }}
                    />
                  );
                })}
            </>
          )}

          <Divider />

          {/* WINNER SECTION (NEW) */}
          {isWinner && (
            <>
              <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                <Text
                  style={{
                    color: theme.colors.tertiary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Winner Actions
                </Text>
              </View>

              <Menu.Item
                onPress={() => {
                  closeMenu();
                  onRemoveWinner?.(restaurant.id);
                }}
                title="Remove Winner"
                leadingIcon={() =>
                  renderIcon("trophy-outline", theme.colors.secondary)
                }
                titleStyle={{ color: theme.colors.secondary }}
              />

              <Divider />
            </>
          )}

          {/* SHARE */}
          <Menu.Item
            onPress={handleShare}
            title="Share"
            leadingIcon={() =>
              renderIcon("share-variant", theme.colors.tertiary)
            }
            titleStyle={{ color: theme.colors.tertiary }}
          />
        </Menu>
      </Portal>
    </>
  );
}
