import React, { useState } from "react";
import { Share } from "react-native";
import { Menu, IconButton } from "react-native-paper";

interface Props {
  restaurant: any;
  isFavorite: boolean;
  onToggleFavorite: (r: any) => void;
  onAddToList: (r: any) => void;
}

function RestaurantOptionsMenu({
  restaurant,
  isFavorite,
  onToggleFavorite,
  onAddToList,
}: Props) {
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

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
  return (
    <Menu
      key={visible ? "open" : "closed"}
      visible={visible}
      onDismiss={closeMenu}
      anchor={
        <IconButton
          icon="dots-vertical"
          size={22}
          onPress={openMenu}
          accessibilityLabel="Restaurant options"
        />
      }
      anchorPosition="bottom"
    >
      <Menu.Item
        onPress={() => {
          closeMenu();
          onToggleFavorite(restaurant);
        }}
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        leadingIcon={isFavorite ? "heart" : "heart-outline"}
      />

      <Menu.Item
        onPress={() => {
          closeMenu();
          onAddToList(restaurant);
        }}
        title="Add to List"
        leadingIcon="playlist-plus"
      />

      <Menu.Item
        onPress={handleShare}
        title="Share"
        leadingIcon="share-variant"
      />
    </Menu>
  );
}

export default RestaurantOptionsMenu;
