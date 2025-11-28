// src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import {
  Text,
  useTheme,
  IconButton,
  Switch,
  Portal,
  Dialog,
  TextInput,
  Button,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../utils/supabaseClient";
import {
  getUserProfile,
  updateUserProfile,
  UserProfile,
} from "../utils/friendsApi";
import { useThemeMode } from "../contexts/ThemeContext";

export default function SettingsScreen() {
  const theme = useTheme();
  const navigation: any = useNavigation();
  const { isDarkMode, setThemeMode } = useThemeMode();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile modal
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState("");
  const [editedBio, setEditedBio] = useState("");
  const [editedBirthday, setEditedBirthday] = useState("");
  const [saving, setSaving] = useState(false);

  // Change email modal
  const [changeEmailVisible, setChangeEmailVisible] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Change password modal
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await getUserProfile();
      setProfile(userProfile);
      setEditedDisplayName(userProfile?.display_name || "");
      setEditedBio(userProfile?.bio || "");
      setEditedBirthday(userProfile?.birthday || "");
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await updateUserProfile({
        display_name: editedDisplayName,
        bio: editedBio,
        birthday: editedBirthday,
      });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              display_name: editedDisplayName,
              bio: editedBio,
              birthday: editedBirthday,
            }
          : null
      );

      setEditProfileVisible(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) {
      Alert.alert("Error", "Please enter a new email address");
      return;
    }

    try {
      setEmailLoading(true);
      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) throw error;

      Alert.alert(
        "Success",
        "Confirmation email sent. Please check your inbox to verify your new email address."
      );
      setChangeEmailVisible(false);
      setNewEmail("");
    } catch (error: any) {
      console.error("Error changing email:", error);
      Alert.alert("Error", error.message || "Failed to change email");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert("Success", "Password updated successfully");
      setChangePasswordVisible(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      Alert.alert("Error", error.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // TODO: Implement account deletion
              // This should delete user data and sign out
              Alert.alert(
                "Not Implemented",
                "Account deletion feature coming soon"
              );
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert("Error", "Failed to delete account");
            }
          },
        },
      ]
    );
  };

  const handleContactUs = () => {
    Linking.openURL("mailto:support@foodfinder.com");
  };

  const handleTermsOfService = () => {
    Linking.openURL("https://foodfinder.com/terms");
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL("https://foodfinder.com/privacy");
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    onPress: () => void,
    showChevron = true,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.settingItem,
        {
          backgroundColor: theme.dark
            ? theme.colors.elevation.level1
            : theme.colors.surface,
        },
      ]}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.settingIcon,
            { backgroundColor: theme.colors.primary + "15" },
          ]}
        >
          <MaterialCommunityIcons
            name={icon as any}
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <Text style={[styles.settingTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
      </View>

      {rightElement ||
        (showChevron && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.onSurfaceVariant}
          />
        ))}
    </TouchableOpacity>
  );

  const renderSection = (title: string) => (
    <Text
      style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
    >
      {title}
    </Text>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor={theme.colors.onSurface}
          onPress={() => navigation.goBack()}
        />
        <View
          style={[styles.colorBar, { backgroundColor: theme.colors.primary }]}
        />

        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: theme.colors.onSurface,
            flex: 1,
            marginLeft: 8,
          }}
        >
          Settings
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        {renderSection("PROFILE")}
        {renderSettingItem("account-edit", "Edit Profile", () =>
          setEditProfileVisible(true)
        )}
        {renderSettingItem("image-outline", "Edit Photo", () =>
          Alert.alert("Coming Soon", "Photo upload feature coming soon")
        )}

        {/* Preferences Section */}
        {renderSection("PREFERENCES")}
        {renderSettingItem(
          isDarkMode ? "weather-night" : "weather-sunny",
          "Dark Mode",
          () => setThemeMode(isDarkMode ? "light" : "dark"),
          false,
          <Switch
            value={isDarkMode}
            onValueChange={() => setThemeMode(isDarkMode ? "light" : "dark")}
            color={theme.colors.primary}
          />
        )}

        {/* Account Section */}
        {renderSection("ACCOUNT")}
        {renderSettingItem("email-outline", "Change Email", () =>
          setChangeEmailVisible(true)
        )}
        {renderSettingItem("lock-outline", "Change Password", () =>
          setChangePasswordVisible(true)
        )}
        {renderSettingItem(
          "delete-outline",
          "Delete Account",
          handleDeleteAccount
        )}

        {/* Payment Section */}
        {renderSection("PAYMENT")}
        {renderSettingItem("credit-card-outline", "Payment Methods", () =>
          Alert.alert("Coming Soon", "Payment methods feature coming soon")
        )}

        {/* Support Section */}
        {renderSection("SUPPORT")}
        {renderSettingItem("email-outline", "Contact Us", handleContactUs)}
        {renderSettingItem(
          "file-document-outline",
          "Terms of Service",
          handleTermsOfService
        )}
        {renderSettingItem(
          "shield-lock-outline",
          "Privacy Policy",
          handlePrivacyPolicy
        )}

        {/* Sign Out */}
        <View style={{ marginTop: 24, marginBottom: 32 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSignOut}
            style={[
              styles.signOutButton,
              { backgroundColor: theme.colors.errorContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="logout"
              size={24}
              color={theme.colors.error}
            />
            <Text style={[styles.signOutText, { color: theme.colors.error }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text
          style={[styles.versionText, { color: theme.colors.onSurfaceVariant }]}
        >
          Version 1.0.0
        </Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Portal>
        <Dialog
          visible={editProfileVisible}
          onDismiss={() => setEditProfileVisible(false)}
        >
          <Dialog.Title>Edit Profile</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Display Name"
              value={editedDisplayName}
              onChangeText={setEditedDisplayName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Bio"
              value={editedBio}
              onChangeText={setEditedBio}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="Tell us about yourself..."
            />
            <TextInput
              label="Birthday"
              value={editedBirthday}
              onChangeText={setEditedBirthday}
              mode="outlined"
              style={styles.input}
              placeholder="MM/DD/YYYY"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditProfileVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveProfile} loading={saving}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Change Email Modal */}
      <Portal>
        <Dialog
          visible={changeEmailVisible}
          onDismiss={() => setChangeEmailVisible(false)}
        >
          <Dialog.Title>Change Email</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="New Email"
              value={newEmail}
              onChangeText={setNewEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setChangeEmailVisible(false)}>Cancel</Button>
            <Button onPress={handleChangeEmail} loading={emailLoading}>
              Update
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Change Password Modal */}
      <Portal>
        <Dialog
          visible={changePasswordVisible}
          onDismiss={() => setChangePasswordVisible(false)}
        >
          <Dialog.Title>Change Password</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setChangePasswordVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleChangePassword} loading={passwordLoading}>
              Update
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 1,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  colorBar: { width: 5, height: 20, borderRadius: 4, marginRight: 6 },
});
