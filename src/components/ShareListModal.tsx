// src/components/ShareListModal.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Share, ScrollView, Alert } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  useTheme,
  IconButton,
  Divider,
  List,
  ActivityIndicator,
  Switch,
} from "react-native-paper";
import {
  generateShareLink,
  getShareLink,
  revokeShareLink,
  getCollaborators,
  removeCollaborator,
  Collaborator,
} from "../utils/collaborationApi";

interface ShareListModalProps {
  visible: boolean;
  onDismiss: () => void;
  listId: string;
  listTitle: string;
  isOwner: boolean;
}

export default function ShareListModal({
  visible,
  onDismiss,
  listId,
  listTitle,
  isOwner,
}: ShareListModalProps) {
  const theme = useTheme();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(false);

  useEffect(() => {
    if (visible && listId) {
      loadShareLink();
      loadCollaborators();
    }
  }, [visible, listId]);

  const loadShareLink = async () => {
    setLoading(true);
    const link = await getShareLink(listId);
    setShareLink(link);
    setSharingEnabled(!!link);
    setLoading(false);
  };

  const loadCollaborators = async () => {
    setLoadingCollaborators(true);
    const collabs = await getCollaborators(listId);
    setCollaborators(collabs);
    setLoadingCollaborators(false);
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    const linkId = await generateShareLink(listId);
    if (linkId) {
      setShareLink(linkId);
      setSharingEnabled(true);
    } else {
      Alert.alert("Error", "Failed to generate share link");
    }
    setLoading(false);
  };

  const handleRevokeLink = async () => {
    Alert.alert(
      "Revoke Share Link",
      "This will disable the current share link. Existing collaborators will remain but new people won't be able to join.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const success = await revokeShareLink(listId);
            if (success) {
              setShareLink(null);
              setSharingEnabled(false);
            } else {
              Alert.alert("Error", "Failed to revoke share link");
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  const handleShareLink = async () => {
    if (!shareLink) return;

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
            } else {
              Alert.alert("Error", "Failed to remove collaborator");
            }
          },
        },
      ]
    );
  };

  const handleToggleSharing = async (enabled: boolean) => {
    if (enabled && !shareLink) {
      await handleGenerateLink();
    } else if (!enabled && shareLink) {
      await handleRevokeLink();
    }
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
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            Share "{listTitle}"
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurface}
          />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isOwner && (
            <>
              {/* Share Link Section */}
              <View style={styles.section}>
                <View style={styles.shareToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Share Link
                    </Text>
                    <Text
                      style={[
                        styles.sectionDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {sharingEnabled
                        ? "Anyone with the link can join"
                        : "Enable to create a shareable link"}
                    </Text>
                  </View>
                  <Switch
                    value={sharingEnabled}
                    onValueChange={handleToggleSharing}
                    disabled={loading}
                  />
                </View>

                {sharingEnabled && shareLink && (
                  <View style={styles.linkContainer}>
                    <View
                      style={[
                        styles.linkBox,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.linkText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                        numberOfLines={1}
                      >
                        foodfinder://list/join/{shareLink}
                      </Text>
                    </View>

                    <Button
                      mode="contained"
                      icon="share-variant"
                      onPress={handleShareLink}
                      style={styles.shareButton}
                      buttonColor={theme.colors.primary}
                    >
                      Share Link
                    </Button>
                  </View>
                )}

                {loading && (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                    style={{ marginTop: 12 }}
                  />
                )}
              </View>

              <Divider style={{ marginVertical: 16 }} />
            </>
          )}

          {/* Collaborators Section */}
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
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
              <View style={styles.collaboratorsList}>
                {collaborators.map((collab) => (
                  <List.Item
                    key={collab.id}
                    title={collab.user_id.substring(0, 8)}
                    description={collab.role}
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
                        />
                      ) : null
                    }
                    style={{
                      backgroundColor: theme.colors.surfaceVariant,
                      borderRadius: 12,
                      marginBottom: 8,
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {!isOwner && (
            <Text
              style={[
                styles.nonOwnerNote,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Only the list owner can manage sharing settings
            </Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={onDismiss}
            style={styles.doneButton}
            buttonColor={theme.colors.tertiary}
            textColor={theme.colors.surface}
          >
            Done
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 16,
    borderRadius: 22,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    maxHeight: 500,
  },
  section: {
    marginBottom: 16,
  },
  shareToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkContainer: {
    marginTop: 12,
  },
  linkBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 13,
    fontFamily: "monospace",
  },
  shareButton: {
    borderRadius: 12,
  },
  collaboratorsList: {
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  nonOwnerNote: {
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 16,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
  },
  doneButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
});
