// src/components/LocationSelector.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  Modal,
  Portal,
  Text,
  useTheme,
  IconButton,
  Divider,
  Button,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY as string;

export interface LocationData {
  placeId: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
}

interface LocationSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  onLocationSelected: (location: LocationData | null) => void;
  currentLocation: LocationData | null;
  onOpenMapPicker?: () => void;
}

interface AutocompleteResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const MAX_RECENT_LOCATIONS = 5;

export default function LocationSelector({
  visible,
  onDismiss,
  onLocationSelected,
  currentLocation,
  onOpenMapPicker,
}: LocationSelectorProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentLocations, setRecentLocations] = useState<LocationData[]>([]);

  useEffect(() => {
    if (visible) {
      loadRecentLocations();
      setSearchQuery("");
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.length >= 3) {
      const timer = setTimeout(() => {
        searchPlaces(searchQuery);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [searchQuery]);

  const loadRecentLocations = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("recentLocations");
      if (stored) {
        setRecentLocations(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load recent locations:", e);
    }
  }, []);

  const saveRecentLocation = useCallback(async (location: LocationData) => {
    try {
      setRecentLocations((prev) => {
        const updated = [
          location,
          ...prev.filter((l) => l.placeId !== location.placeId),
        ].slice(0, MAX_RECENT_LOCATIONS);

        AsyncStorage.setItem("recentLocations", JSON.stringify(updated)).catch(
          (e) => console.error("Failed to save recent location:", e)
        );

        return updated;
      });
    } catch (e) {
      console.error("Failed to save recent location:", e);
    }
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
        `input=${encodeURIComponent(query)}` +
        `&types=(cities)` +
        `&key=${GOOGLE_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        setResults(data.predictions || []);
      } else {
        console.warn("Autocomplete API status:", data.status);
        setResults([]);
      }
    } catch (e) {
      console.error("Autocomplete error:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlaceDetails = useCallback(async (placeId: string) => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}` +
        `&fields=geometry,name,formatted_address` +
        `&key=${GOOGLE_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.result) {
        const { geometry, name, formatted_address } = data.result;
        return {
          placeId,
          name,
          description: formatted_address,
          latitude: geometry.location.lat,
          longitude: geometry.location.lng,
        } as LocationData;
      }
    } catch (e) {
      console.error("Place details error:", e);
    }
    return null;
  }, []);

  const handleSelectResult = useCallback(
    async (result: AutocompleteResult) => {
      setLoading(true);
      const details = await getPlaceDetails(result.place_id);
      setLoading(false);

      if (details) {
        await saveRecentLocation(details);
        onLocationSelected(details);
        setSearchQuery("");
        setResults([]);
        onDismiss();
      }
    },
    [getPlaceDetails, saveRecentLocation, onLocationSelected, onDismiss]
  );

  const handleSelectRecent = useCallback(
    (location: LocationData) => {
      onLocationSelected(location);
      onDismiss();
    },
    [onLocationSelected, onDismiss]
  );

  const handleUseCurrentLocation = useCallback(() => {
    onLocationSelected(null);
    onDismiss();
  }, [onLocationSelected, onDismiss]);

  const clearRecentLocations = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("recentLocations");
      setRecentLocations([]);
    } catch (e) {
      console.error("Failed to clear recent locations:", e);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setResults([]);
  }, []);

  const isCurrentLocationSelected = currentLocation === null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.modalHandle} />
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Choose Location
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Select where you want to discover restaurants
          </Text>

          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            style={styles.closeIconButton}
            iconColor={theme.colors.onSurfaceVariant}
          />
        </View>
        <View style={styles.searchSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.tertiary }]}>
            SEARCH CITY
          </Text>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.colors.primary + "15",
                borderColor:
                  //     searchQuery.length > 0
                  theme.colors.primary,
                //   : theme.colors.outline,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color={
                searchQuery.length > 0
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
              style={styles.searchIcon}
            />
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.primary + "15",
                },
              ]}
              placeholder="Type 3+ characters..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {searchQuery.length > 0 && (
              <IconButton
                icon="close"
                size={20}
                onPress={handleClearSearch}
                iconColor={theme.colors.primary} // Forest green X
              />
            )}
          </View>
        </View>

        {/* Loading State - Primary color */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text
              style={[
                styles.loadingText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Searching...
            </Text>
          </View>
        )}

        {/* Search Results - Forest Green accents */}
        {results.length > 0 && (
          <View style={styles.resultsSection}>
            <FlatList
              data={results}
              keyExtractor={(item) => item.place_id}
              style={{ maxHeight: 280 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelectResult(item)}
                  activeOpacity={0.6}
                >
                  <View
                    style={[
                      styles.resultIconCircle,
                      { backgroundColor: theme.colors.primary + "15" }, // Light forest green
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={20}
                      color={theme.colors.primary} // Forest green icon
                    />
                  </View>
                  <View style={styles.resultText}>
                    <Text
                      style={[
                        styles.resultTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {item.structured_formatting.main_text}
                    </Text>
                    <Text
                      style={[
                        styles.resultSubtitle,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {item.structured_formatting.secondary_text}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.tertiary} // Navy chevron
                  />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: theme.colors.outlineVariant },
                  ]}
                />
              )}
            />
          </View>
        )}

        {/* Recent Locations - Forest Green for selected */}
        {!searchQuery && recentLocations.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.tertiary }, // Navy section title
                ]}
              >
                RECENT
              </Text>
              <TouchableOpacity onPress={clearRecentLocations}>
                <Text
                  style={[
                    styles.clearButton,
                    { color: theme.colors.secondary },
                  ]} // Burnt orange
                >
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentLocations}
              keyExtractor={(item) => item.placeId}
              style={{ maxHeight: 200 }}
              renderItem={({ item }) => {
                const isSelected = currentLocation?.placeId === item.placeId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.resultItem,
                      isSelected && {
                        backgroundColor: theme.colors.primary + "10", // Light forest green
                      },
                    ]}
                    onPress={() => handleSelectRecent(item)}
                    activeOpacity={0.6}
                  >
                    <View
                      style={[
                        styles.resultIconCircle,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary + "20" // Light forest green
                            : theme.colors.surfaceVariant,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={20}
                        color={
                          isSelected
                            ? theme.colors.primary // Forest green
                            : theme.colors.onSurfaceVariant
                        }
                      />
                    </View>
                    <View style={styles.resultText}>
                      <Text
                        style={[
                          styles.resultTitle,
                          {
                            color: isSelected
                              ? theme.colors.primary // Forest green
                              : theme.colors.onSurface,
                            fontWeight: isSelected ? "700" : "600",
                          },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.resultSubtitle,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {item.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color={theme.colors.primary} // Forest green checkmark
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => (
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: theme.colors.outlineVariant },
                  ]}
                />
              )}
            />
          </View>
        )}

        {/* Empty State - Navy accent */}
        {!loading && results.length < 3 && recentLocations.length === 0 && (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: theme.colors.tertiary + "10" },
              ]}
            >
              <MaterialCommunityIcons
                name="map-search-outline"
                size={48}
                color={theme.colors.tertiary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.tertiary }]}>
              Search worldwide
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Find restaurants in any city or neighborhood
            </Text>
          </View>
        )}

        <View style={styles.dividerSection}>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
          <Text style={[styles.dividerText, { color: theme.colors.tertiary }]}>
            OR
          </Text>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
        </View>

        <View style={styles.quickActionsSection}>
          <TouchableOpacity
            style={[
              styles.quickActionCard,
              {
                backgroundColor: theme.colors.primary + "15",
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={handleUseCurrentLocation}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionContent}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: theme.colors.primary + "20",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.quickActionTitle,
                  {
                    color: isCurrentLocationSelected
                      ? theme.colors.primary
                      : theme.colors.onSurface,
                    fontWeight: isCurrentLocationSelected ? "700" : "600",
                  },
                ]}
              >
                Select Your Current Location
              </Text>
            </View>
          </TouchableOpacity>

          {onOpenMapPicker && (
            <TouchableOpacity
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: theme.colors.primary + "15",
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => {
                onOpenMapPicker();
                onDismiss();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionContent}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: theme.colors.primary + "20",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="map-marker-plus"
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.quickActionTitle,
                    {
                      color: theme.colors.primary,
                      fontWeight: "600",
                    },
                  ]}
                >
                  Select From A {"        "}Map
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    marginTop: "auto",
    marginHorizontal: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 20,
    maxHeight: "95%",
    minHeight: "75%",
  },
  header: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
    position: "relative",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  closeIconButton: {
    position: "absolute",
    top: 26,
    right: 8,
    margin: 0,
  },
  quickActionsSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    minHeight: 120,
    justifyContent: "center",
  },
  quickActionContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 18,
  },
  dividerSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: "600",
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  resultsSection: {
    paddingHorizontal: 20,
  },
  recentSection: {
    paddingHorizontal: 20,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clearButton: {
    fontSize: 13,
    fontWeight: "600",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  resultIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 13,
  },
  separator: {
    height: 1,
    marginVertical: 4,
    marginLeft: 64,
  },
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
