// src/components/ListSettingsModal.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Share, ScrollView, Alert } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  useTheme,
  IconButton,
  List,
  ActivityIndicator,
  TextInput,
  Surface,
  Snackbar,
  Chip,
} from "react-native-paper";
import {
  generateShareLink,
  getShareLink,
  getCollaborators,
  removeCollaborator,
  Collaborator,
} from "../utils/collaborationApi";
import { updateList, deleteList } from "../utils/listsApi";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ListSettingsModalProps {
  visible: boolean;
  onDismiss: () => void;
  listId: string;
  listTitle: string;
  listDescription: string | null;
  isOwner: boolean;
  onListUpdated: (title: string, description: string | null) => void;
  onListDeleted?: () => void;
}

export default function ListSettingsModal({
  visible,
  onDismiss,
  listId,
  listTitle,
  listDescription,
  isOwner,
  onListUpdated,
  onListDeleted,
}: ListSettingsModalProps) {
  const theme = useTheme();

  // Edit state
  const [editTitle, setEditTitle] = useState(listTitle);
  const [editDescription, setEditDescription] = useState(listDescription || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Share state
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loadingShare, setLoadingShare] = useState(false);

  // Collaborators state
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"edit" | "collaborators">("edit");

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (visible && listId) {
      setEditTitle(listTitle);
      setEditDescription(listDescription || "");
      loadShareLink();
      loadCollaborators();
    }
  }, [visible, listId, listTitle, listDescription]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const loadShareLink = async () => {
    setLoadingShare(true);
    let link = await getShareLink(listId);

    // If no link exists, generate one automatically
    if (!link) {
      const linkId = await generateShareLink(listId);
      link = linkId;
    }

    setShareLink(link);
    setLoadingShare(false);
  };

  const loadCollaborators = async () => {
    setLoadingCollaborators(true);
    const collabs = await getCollaborators(listId);
    setCollaborators(collabs);
    setLoadingCollaborators(false);
  };

  const handleSaveChanges = async () => {
    if (!editTitle.trim()) {
      showToast("List title cannot be empty", "error");
      return;
    }

    setSaving(true);
    try {
      const newDescription =
        editDescription.trim() === "" ? null : editDescription;

      await updateList(listId, {
        title: editTitle,
        description: newDescription,
      });

      onListUpdated(editTitle, newDescription);
      showToast("List updated successfully");
    } catch (error) {
      console.error("❌ Failed to update list:", error);
      showToast("Failed to update list", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = () => {
    Alert.alert(
      "Delete List",
      `Are you sure you want to delete "${listTitle}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteList(listId);
              showToast("List deleted successfully");
              setTimeout(() => {
                onDismiss();
                onListDeleted?.();
              }, 1000);
            } catch (error) {
              console.error("❌ Failed to delete list:", error);
              showToast("Failed to delete list", "error");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleShareLink = async () => {
    if (!shareLink) {
      showToast("Share link not available", "error");
      return;
    }

    const fullLink = `foodfinder://list/join/${shareLink}`;
    try {
      await Share.share({
        message: `Join my list "${listTitle}" on FoodFinder!\n\n${fullLink}`,
        title: `Join ${listTitle}`,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    Alert.alert(
      "Remove Collaborator",
      "Are you sure you want to remove this person from the list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const success = await removeCollaborator(listId, userId);
            if (success) {
              setCollaborators((prev) =>
                prev.filter((c) => c.user_id !== userId)
              );
              showToast("Collaborator removed");
            } else {
              showToast("Failed to remove collaborator", "error");
            }
          },
        },
      ]
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            List Settings
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurface}
          />
        </View>

        {/* Tab Navigation - Chip Style */}
        <View style={styles.tabContainer}>
          <Chip
            mode="outlined"
            selected={activeTab === "edit"}
            onPress={() => setActiveTab("edit")}
            style={[
              styles.tabChip,
              {
                borderColor: theme.colors.tertiary,
                backgroundColor:
                  activeTab === "edit" ? theme.colors.tertiary : "transparent",
              },
            ]}
            textStyle={{
              color: activeTab === "edit" ? "#fff" : theme.colors.tertiary,
              fontWeight: "600",
            }}
            icon={activeTab === "edit" ? "pencil" : "pencil-outline"}
          >
            {activeTab === "edit" ? "Edit Your List" : "Tap to Edit"}
          </Chip>

          <Chip
            mode="outlined"
            selected={activeTab === "collaborators"}
            onPress={() => setActiveTab("collaborators")}
            style={[
              styles.tabChip,
              {
                borderColor: theme.colors.tertiary,
                backgroundColor:
                  activeTab === "collaborators"
                    ? theme.colors.tertiary
                    : "transparent",
              },
            ]}
            textStyle={{
              color:
                activeTab === "collaborators" ? "#fff" : theme.colors.tertiary,
              fontWeight: "600",
            }}
            icon={
              activeTab === "collaborators"
                ? "account-group"
                : "account-group-outline"
            }
          >
            {activeTab === "collaborators"
              ? `Collaborators (${collaborators.length})`
              : "Tap To Collab"}
          </Chip>
        </View>

        {/* Fixed height content container */}
        <View style={styles.contentContainer}>
          {/* EDIT TAB */}
          {activeTab === "edit" && (
            <ScrollView
              style={styles.section}
              showsVerticalScrollIndicator={false}
            >
              {isOwner ? (
                <>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    List Details
                  </Text>

                  <TextInput
                    label="Title"
                    value={editTitle}
                    onChangeText={setEditTitle}
                    mode="outlined"
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                  />

                  <TextInput
                    label="Description (optional)"
                    value={editDescription}
                    onChangeText={setEditDescription}
                    multiline
                    numberOfLines={4}
                    mode="outlined"
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                  />

                  <Button
                    mode="outlined"
                    onPress={handleSaveChanges}
                    loading={saving}
                    disabled={saving || !editTitle.trim()}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: theme.colors.primary + "15",
                        borderColor: theme.colors.primary,
                        borderWidth: 1,
                      },
                    ]}
                    labelStyle={[
                      styles.actionButtonLabel,
                      { color: theme.colors.onSecondaryContainer },
                    ]}
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons
                        name="content-save-outline"
                        size={24}
                        color={theme.colors.tertiary}
                      />
                    )}
                    contentStyle={{ paddingVertical: 8 }}
                  >
                    Save Changes
                  </Button>

                  {/* Danger Zone */}
                  <View style={styles.dangerZone}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.error },
                      ]}
                    >
                      Danger Zone
                    </Text>
                    <Text
                      style={[
                        styles.dangerZoneDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Deleting this list will remove it for all collaborators.
                      This action cannot be undone.
                    </Text>

                    <Button
                      mode="outlined"
                      onPress={handleDeleteList}
                      loading={deleting}
                      disabled={deleting}
                      style={[
                        styles.deleteButton,
                        { borderColor: theme.colors.error },
                      ]}
                      labelStyle={[
                        styles.deleteButtonLabel,
                        { color: theme.colors.error },
                      ]}
                      icon="delete-outline"
                    >
                      Delete List
                    </Button>
                  </View>
                </>
              ) : (
                <View style={styles.nonOwnerEditView}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    List Details
                  </Text>
                  <Surface
                    style={[
                      styles.infoBox,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                    elevation={1}
                  >
                    <Text
                      style={[
                        styles.infoLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Title
                    </Text>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {listTitle}
                    </Text>

                    {listDescription && (
                      <>
                        <Text
                          style={[
                            styles.infoLabel,
                            {
                              color: theme.colors.onSurfaceVariant,
                              marginTop: 16,
                            },
                          ]}
                        >
                          Description
                        </Text>
                        <Text
                          style={[
                            styles.infoValue,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {listDescription}
                        </Text>
                      </>
                    )}
                  </Surface>

                  <Text
                    style={[
                      styles.nonOwnerNote,
                      { color: theme.colors.onSurfaceVariant, marginTop: 24 },
                    ]}
                  >
                    Only the list owner can edit list details
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* COLLABORATORS TAB */}
          {activeTab === "collaborators" && (
            <View style={styles.section}>
              <View style={styles.shareSection}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Share This List
                </Text>

                {loadingShare ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                    style={{ marginTop: 12 }}
                  />
                ) : shareLink ? (
                  <View style={styles.linkContainer}>
                    <Button
                      mode="outlined"
                      onPress={handleShareLink}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: theme.colors.primary + "15",
                          borderColor: theme.colors.primary,
                          borderWidth: 1,
                        },
                      ]}
                      labelStyle={[
                        styles.actionButtonLabel,
                        { color: theme.colors.onSecondaryContainer },
                      ]}
                      icon={({ size, color }) => (
                        <MaterialCommunityIcons
                          name="share-variant-outline"
                          size={24}
                          color={theme.colors.tertiary}
                        />
                      )}
                      contentStyle={{ paddingVertical: 8 }}
                    >
                      Share Invite Link
                    </Button>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Unable to generate share link
                  </Text>
                )}
              </View>

              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.onSurface, marginTop: 24 },
                ]}
              >
                Collaborators ({collaborators.length})
              </Text>

              {loadingCollaborators ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primary}
                  style={{ marginTop: 12 }}
                />
              ) : collaborators.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  No collaborators yet. Share the list to invite people!
                </Text>
              ) : (
                <ScrollView
                  style={styles.collaboratorsList}
                  showsVerticalScrollIndicator={false}
                >
                  {collaborators.map((collab) => (
                    <Surface
                      key={collab.id}
                      style={[
                        styles.collaboratorItem,
                        { backgroundColor: theme.colors.primary + "15" },
                      ]}
                      elevation={1}
                    >
                      <List.Item
                        title={collab.user_id.substring(0, 8)}
                        description={
                          collab.role.charAt(0).toUpperCase() +
                          collab.role.slice(1)
                        }
                        titleStyle={{ fontWeight: "600" }}
                        left={(props) => (
                          <List.Icon
                            {...props}
                            icon={
                              collab.role === "owner"
                                ? "crown"
                                : collab.role === "editor"
                                ? "pencil"
                                : "eye"
                            }
                            color={
                              collab.role === "owner"
                                ? theme.colors.tertiary
                                : theme.colors.primary
                            }
                          />
                        )}
                        right={(props) =>
                          isOwner && collab.role !== "owner" ? (
                            <IconButton
                              {...props}
                              icon="close"
                              size={20}
                              onPress={() =>
                                handleRemoveCollaborator(collab.user_id)
                              }
                              iconColor={theme.colors.error}
                            />
                          ) : null
                        }
                      />
                    </Surface>
                  ))}
                </ScrollView>
              )}

              {!isOwner && (
                <Text
                  style={[
                    styles.nonOwnerNote,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Only the list owner can remove collaborators
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Footer */}
        {/* <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={onDismiss}
            style={[
              styles.doneButton,
              { backgroundColor: theme.colors.primary },
            ]}
            labelStyle={styles.doneButtonLabel}
          >
            Done
          </Button>
        </View> */}
      </Modal>

      {/* Toast Notification */}
      <Snackbar
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={3000}
        style={{
          backgroundColor:
            toastType === "success"
              ? theme.colors.tertiary
              : theme.colors.error,
        }}
        action={{
          label: "Dismiss",
          onPress: () => setToastVisible(false),
        }}
      >
        {toastMessage}
      </Snackbar>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 16,
    borderRadius: 24,
    height: 600,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
  },
  tabChip: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: 0.3,
    paddingTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  inputOutline: {
    borderRadius: 12,
  },
  actionButton: {
    borderRadius: 14,
    marginTop: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 6,
  },
  dangerZone: {
    marginVertical: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 0, 0, 0.1)",
  },
  dangerZoneDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  deleteButton: {
    borderRadius: 14,
    borderWidth: 2,
    marginTop: 8,
  },
  deleteButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 6,
  },
  shareSection: {
    marginTop: 8,
  },
  linkContainer: {
    marginTop: 12,
  },
  collaboratorsList: {
    flex: 1,
    marginTop: 12,
  },
  collaboratorItem: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 24,
    fontStyle: "italic",
    lineHeight: 20,
  },
  nonOwnerNote: {
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 16,
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
  },
  doneButton: {
    borderRadius: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  doneButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 6,
  },
  nonOwnerEditView: {
    flex: 1,
  },
  infoBox: {
    padding: 20,
    borderRadius: 14,
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    lineHeight: 22,
  },
});
