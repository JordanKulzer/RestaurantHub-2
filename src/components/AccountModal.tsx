// components/AccountModal.tsx
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal as RNModal,
  TouchableWithoutFeedback,
  Dimensions,
  Switch,
} from "react-native";
import {
  Text,
  Button,
  useTheme,
  Divider,
  Avatar,
  List,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface AccountModalProps {
  visible: boolean;
  onDismiss: () => void;
  isDarkMode: boolean; // ✅ Add this prop
  onToggleDarkMode: () => void; // ✅ Add this prop
}

export default function AccountModal({
  visible,
  onDismiss,
  isDarkMode,
  onToggleDarkMode,
}: AccountModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // TODO: Replace with actual user data
  const userName = "John Doe";
  const userEmail = "john.doe@example.com";
  const isPremium = false;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Modal Content */}
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: insets.bottom,
            height: SCREEN_HEIGHT * 0.95 - insets.bottom,
          },
        ]}
      >
        {/* Header with X button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="close"
              size={28}
              color={theme.colors.onSurface}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true} // ✅ Keep scrollbar visible on iOS
          indicatorStyle={isDarkMode ? "white" : "black"} // ✅ Set indicator color
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(40, insets.bottom + 20) },
          ]}
          style={{ flex: 1 }}
        >
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <Avatar.Icon
              size={80}
              icon="account"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
              {userName}
            </Text>
            <Text
              style={[
                styles.userEmail,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {userEmail}
            </Text>
          </View>

          <Divider style={{ marginVertical: 16 }} />

          {/* Account Settings */}
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Account Settings
          </Text>

          {/* ✅ Dark Mode Toggle */}
          <List.Item
            title="Dark Mode"
            left={(props) => (
              <List.Icon
                {...props}
                icon={isDarkMode ? "weather-night" : "weather-sunny"}
              />
            )}
            right={() => (
              <Switch
                value={isDarkMode}
                onValueChange={onToggleDarkMode}
                trackColor={{ false: "#767577", true: theme.colors.primary }}
                thumbColor={isDarkMode ? theme.colors.surface : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
              />
            )}
            onPress={onToggleDarkMode}
            style={styles.listItem}
          />

          <List.Item
            title="Reset Password"
            left={(props) => <List.Icon {...props} icon="lock-reset" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log("Reset password")}
            style={styles.listItem}
          />

          <List.Item
            title="Notification Settings"
            description="Coming soon"
            left={(props) => <List.Icon {...props} icon="bell-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => console.log("Notifications")}
            style={styles.listItem}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
          />

          <Divider style={{ marginVertical: 16 }} />

          {/* Subscription */}
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Subscription
          </Text>

          {isPremium ? (
            <View
              style={[
                styles.premiumCard,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <Text
                style={[
                  styles.premiumTitle,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                ✨ Premium Member
              </Text>
              <Text
                style={[
                  styles.premiumText,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                You have unlimited swipes and shuffles
              </Text>
              <Button
                mode="outlined"
                textColor={theme.colors.primary}
                style={[
                  styles.manageButton,
                  { borderColor: theme.colors.primary },
                ]}
                onPress={() => console.log("Manage subscription")}
              >
                Manage Subscription
              </Button>
            </View>
          ) : (
            <View
              style={[
                styles.freeCard,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Text
                style={[styles.freeTitle, { color: theme.colors.onSurface }]}
              >
                Free Plan
              </Text>
              <Text
                style={[
                  styles.freeText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Upgrade to unlock unlimited swipes and more features
              </Text>
              <Button
                mode="contained"
                buttonColor={theme.colors.primary}
                style={styles.upgradeButton}
                onPress={() => console.log("Upgrade to premium")}
              >
                Upgrade to Premium
              </Button>
            </View>
          )}

          <Divider style={{ marginVertical: 16 }} />

          {/* Actions */}
          <Button
            mode="outlined"
            icon="logout"
            textColor={theme.colors.error}
            style={[styles.actionButton, { borderColor: theme.colors.error }]}
            onPress={() => {
              console.log("Log out");
              onDismiss();
            }}
          >
            Log Out
          </Button>

          <Button
            mode="text"
            textColor={theme.colors.error}
            style={styles.deleteButton}
            onPress={() => {
              console.log("Delete account");
              // TODO: Show confirmation dialog
            }}
          >
            Delete Account
          </Button>
        </ScrollView>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    position: "relative",
    alignItems: "flex-end",
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flexGrow: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 12,
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  listItem: {
    paddingVertical: 4,
  },
  premiumCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  premiumText: {
    fontSize: 14,
    marginBottom: 12,
  },
  manageButton: {
    borderRadius: 25,
  },
  freeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  freeTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  freeText: {
    fontSize: 14,
    marginBottom: 12,
  },
  upgradeButton: {
    borderRadius: 25,
  },
  actionButton: {
    borderRadius: 25,
    marginBottom: 12,
  },
  deleteButton: {
    marginTop: 8,
  },
});
