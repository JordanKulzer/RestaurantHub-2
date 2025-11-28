// src/components/CollaborativeModal.tsx
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal as RNModal,
  TouchableWithoutFeedback,
  Share,
  Clipboard,
} from "react-native";
import {
  Text,
  Button,
  useTheme,
  IconButton,
  TextInput,
  ActivityIndicator,
  Surface,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  createShuffleSession,
  joinShuffleSession,
} from "../utils/shuffleSessionApi";
import Toast from "react-native-toast-message";

interface CollaborativeModalProps {
  visible: boolean;
  onDismiss: () => void;
  mode: "host" | "join" | null;
  onSessionCreated: (sessionId: string, sessionCode: string) => void;
  onSessionJoined: (sessionId: string) => void;
}

export default function CollaborativeModal({
  visible,
  onDismiss,
  mode,
  onSessionCreated,
  onSessionJoined,
}: CollaborativeModalProps) {
  const theme = useTheme();
  const [sessionCode, setSessionCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCreateSession = async () => {
    setLoading(true);
    setError("");

    const session = await createShuffleSession();

    if (session) {
      setCreatedCode(session.session_code);
      setShowSuccess(true);
      onSessionCreated(session.id, session.session_code);
    } else {
      setError("Failed to create session");
    }

    setLoading(false);
  };

  const handleJoinSession = async () => {
    if (!sessionCode.trim()) {
      setError("Please enter a session code");
      return;
    }

    if (sessionCode.trim().length !== 6) {
      setError("Session code must be 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    const session = await joinShuffleSession(sessionCode.trim());

    if (session) {
      onSessionJoined(session.id);
      resetModal();
      onDismiss();
      Toast.show({
        type: "success",
        text1: "Joined session!",
        text2: "You're now connected with your friend",
      });
    } else {
      setError("Session not found or already started");
    }

    setLoading(false);
  };

  const handleCopyCode = () => {
    Clipboard.setString(createdCode);
    Toast.show({
      type: "success",
      text1: "Code copied!",
      text2: "Share it with your friend",
    });
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join my FoodFinder shuffle! Code: ${createdCode}`,
        title: "Shuffle Together",
      });
    } catch (e) {
      console.error("Share failed:", e);
    }
  };

  const resetModal = () => {
    setSessionCode("");
    setCreatedCode("");
    setError("");
    setShowSuccess(false);
  };

  const handleClose = () => {
    resetModal();
    onDismiss();
  };

  React.useEffect(() => {
    if (visible && mode === "host") {
      handleCreateSession();
    }
  }, [visible, mode]);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.centeredContainer}>
        <Surface
          style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}
          elevation={5}
        >
          <IconButton
            icon="close"
            size={20}
            onPress={handleClose}
            iconColor={theme.colors.onSurfaceVariant}
            style={styles.closeButton}
          />

          {/* HOST MODE */}
          {mode === "host" && !showSuccess && (
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name="account-multiple-plus"
                  size={56}
                  color={theme.colors.tertiary}
                />
              </View>

              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Creating Session...
              </Text>

              <ActivityIndicator
                size="large"
                color={theme.colors.tertiary}
                style={{ marginTop: 24 }}
              />
            </View>
          )}

          {/* HOST SUCCESS */}
          {mode === "host" && showSuccess && (
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={56}
                  color={theme.colors.primary}
                />
              </View>

              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Session Ready!
              </Text>

              <Text
                style={[
                  styles.description,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Share this code with your friend:
              </Text>

              <Surface
                style={[
                  styles.codeCard,
                  { backgroundColor: theme.colors.primary + "15" },
                ]}
                elevation={0}
              >
                <Text style={[styles.code, { color: theme.colors.tertiary }]}>
                  {createdCode}
                </Text>
              </Surface>

              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={handleShareCode}
                  icon="share-variant"
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.colors.tertiary },
                  ]}
                  labelStyle={{ color: theme.colors.surface }}
                >
                  Share Code
                </Button>

                <Button
                  mode="outlined"
                  onPress={handleCopyCode}
                  icon="content-copy"
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.tertiary },
                  ]}
                  textColor={theme.colors.tertiary}
                >
                  Copy
                </Button>
              </View>

              <View style={styles.waitingIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text
                  style={[
                    styles.waitingText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Waiting for your friend to join...
                </Text>
              </View>
            </View>
          )}

          {/* JOIN MODE */}
          {mode === "join" && (
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name="login"
                  size={56}
                  color={theme.colors.primary}
                />
              </View>

              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Join Session
              </Text>

              <Text
                style={[
                  styles.description,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Enter the 6-character code from your friend:
              </Text>

              <TextInput
                label="Enter Session Code..."
                value={sessionCode}
                onChangeText={(text) => {
                  setSessionCode(text.toUpperCase());
                  setError("");
                }}
                mode="outlined"
                style={styles.input}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                placeholder="ABC123"
                error={!!error}
                outlineStyle={{
                  borderRadius: 12,
                  borderWidth: 2,
                }}
                textAlign="center"
                contentStyle={{
                  fontSize: 20,
                  fontWeight: "600",
                  letterSpacing: 4,
                }}
              />

              {error && (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={16}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[styles.errorText, { color: theme.colors.error }]}
                  >
                    {error}
                  </Text>
                </View>
              )}

              <Button
                mode="outlined"
                onPress={handleJoinSession}
                loading={loading}
                disabled={loading || sessionCode.length !== 6}
                style={[
                  styles.joinButton,
                  {
                    backgroundColor: theme.colors.primary + "15",
                    borderColor: theme.colors.primary,
                    borderWidth: 1,
                  },
                ]}
                labelStyle={[
                  // styles.joinButtonLabel,
                  { color: theme.colors.onSecondaryContainer },
                ]}
                icon={({ size, color }) => (
                  <MaterialCommunityIcons
                    name="login"
                    size={36}
                    color={theme.colors.primary}
                  />
                )}
                contentStyle={{ paddingVertical: 8 }}
              >
                {loading ? "Joining..." : "Join Session"}
              </Button>
            </View>
          )}
        </Surface>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    overflow: "visible",
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
  },
  content: {
    padding: 32,
    paddingTop: 40,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  codeCard: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 24,
    width: "100%",
    alignItems: "center",
  },
  code: {
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 8,
  },
  actionButtons: {
    width: "100%",
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  waitingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  waitingText: {
    fontSize: 13,
  },
  input: {
    width: "100%",
    marginBottom: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
  },
  joinButton: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
});
