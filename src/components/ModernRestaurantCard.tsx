import React from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
import { Text, IconButton, useTheme, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import QuickActionsMenu from "./QuickActionsMenu";

const formatAddress = (address: string | null | undefined): string => {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 3) {
    const stateZipPart = parts[2];
    const stateMatch = stateZipPart.match(/^([A-Z]{2})/);
    if (stateMatch) {
      const state = stateMatch[1];
      return `${parts[0]}, ${parts[1]}, ${state}`;
    }
  }
  return address;
};

export default function ModernRestaurantCard({
  item,
  onPress,
  onGoogleMaps,
  onAppleMaps,
  notes,
  userRole,
  onAddNote,
  onDeleteNote,
  newNoteText,
  setNewNoteText,
  showActions = false,
  isFavorite = false,
  onActionRemove,
  preloadedLists,
  listsReady,
  isWinner = false,
  onRemoveWinner = () => {},
  isLast = false,
}) {
  const theme = useTheme();
  const e = item.enriched ?? item;

  const photo =
    e?.photos?.[0] ??
    "https://upload.wikimedia.org/wikipedia/commons/ac/No_image_available.svg";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: "transparent",
          borderBottomWidth: isLast ? 0 : 1.5,
          borderBottomColor: theme.colors.outline,
        },
      ]}
    >
      {/* -------------------------------------------------- */}
      {/* TOP ROW: Thumbnail + Details + Quick Actions */}
      {/* -------------------------------------------------- */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {/* Thumbnail */}
        <View style={styles.thumbBox}>
          <Image source={{ uri: photo }} style={styles.thumb} />
        </View>

        {/* Details */}
        <View style={{ flex: 1, paddingRight: 6 }}>
          <Text
            style={[styles.title, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {e?.name}
          </Text>

          <View style={styles.row}>
            {!!e?.rating && (
              <Text style={[styles.meta, { color: theme.colors.onSurface }]}>
                ⭐ {e.rating.toFixed(1)}
              </Text>
            )}

            {!!e?.reviewCount && (
              <Text
                style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
              >
                ({e.reviewCount})
              </Text>
            )}

            {!!e?.price && (
              <Text
                style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
              >
                • {e.price}
              </Text>
            )}
          </View>

          {e?.address && (
            <Text
              style={[styles.address, { color: theme.colors.onSurfaceVariant }]}
            >
              {formatAddress(e.address)}
            </Text>
          )}

          {!!e?.distanceMiles && (
            <Text
              style={[styles.address, { color: theme.colors.onSurfaceVariant }]}
            >
              {e.distanceMiles.toFixed(2)} mi away
            </Text>
          )}
        </View>

        {/* Right-side Actions */}
        {showActions && (
          <QuickActionsMenu
            restaurant={e}
            isFavorite={isFavorite}
            onFavoriteChange={onActionRemove}
            onCreateNewList={() => {}}
            preloadedLists={preloadedLists}
            listsReady={listsReady}
            iconColor={theme.colors.primary}
            isWinner={isWinner}
            onRemoveWinner={onRemoveWinner}
          />
        )}
      </View>

      {/* -------------------------------------------------- */}
      {/* NOTES SECTION — FULL WIDTH BELOW TOP ROW */}
      {/* -------------------------------------------------- */}
      {Array.isArray(notes) && (
        <View
          style={{
            marginTop: 16,
            padding: 12,

            // borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.outline,
            // backgroundColor: theme.dark
            //   ? theme.colors.elevation.level2
            //   : theme.colors.surfaceVariant,
            width: "100%",
          }}
        >
          <Text
            style={{
              fontWeight: "600",
              color: theme.colors.onSurface,
              marginBottom: 8,
            }}
          >
            Notes
          </Text>

          {/* Existing Notes */}
          {notes.map((note) => (
            <View
              key={note.id}
              style={{
                marginBottom: 10,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flex: 1, paddingRight: 8, justifyContent: "center" }}
              >
                <Text style={{ color: theme.colors.onSurface, fontSize: 14 }}>
                  • {note.note_text}
                </Text>

                {!!note.user_email && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 2,
                    }}
                  >
                    {note.user_email.split("@")[0]} •{" "}
                    {new Date(note.created_at).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {userRole !== "viewer" && (
                <IconButton
                  icon="delete-outline"
                  size={18}
                  onPress={() => onDeleteNote(item.id, note.id)}
                  iconColor={theme.colors.error}
                />
              )}
            </View>
          ))}

          {/* Add Note Input */}
          {userRole !== "viewer" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 12,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.surface,
                paddingHorizontal: 10,
              }}
            >
              <RNTextInput
                multiline
                value={newNoteText[item.id] || ""}
                onChangeText={(text) =>
                  setNewNoteText((prev) => ({ ...prev, [item.id]: text }))
                }
                placeholder="Add a note..."
                placeholderTextColor={theme.colors.onSurfaceVariant + "66"}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  fontSize: 14,
                  color: theme.colors.onSurface,
                }}
              />

              <TouchableOpacity
                onPress={() => onAddNote(item.id)}
                disabled={!newNoteText[item.id]?.trim()}
                style={{ padding: 6 }}
              >
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color={
                    newNoteText[item.id]?.trim()
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant + "66"
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* -------------------------------------------------- */}
      {/* MAP BUTTONS — FULL WIDTH */}
      {/* -------------------------------------------------- */}
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          marginTop: 16,
          width: "100%",
        }}
      >
        <Button
          mode="outlined"
          textColor={theme.colors.primary}
          style={{ flex: 1, borderRadius: 20 }}
          icon="google-maps"
          onPress={onGoogleMaps}
        >
          Google
        </Button>

        <Button
          mode="outlined"
          textColor={theme.colors.tertiary}
          style={{ flex: 1, borderRadius: 20 }}
          icon={Platform.OS === "ios" ? "map" : "map-marker"}
          onPress={onAppleMaps}
        >
          Apple
        </Button>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  thumbBox: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 14,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  meta: {
    marginRight: 6,
    fontSize: 14,
  },
  address: {
    fontSize: 13,
    marginBottom: 4,
  },
});
