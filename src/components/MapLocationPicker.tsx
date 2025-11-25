// src/components/MapLocationPicker.tsx
import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Portal, Button, Text, useTheme } from "react-native-paper";
import MapView, { Marker, Region } from "react-native-maps";
import { LocationData } from "./LocationSelector";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY as string;

interface MapLocationPickerProps {
  visible: boolean;
  onDismiss: () => void;
  onLocationSelected: (location: LocationData) => void;
  initialLocation?: { latitude: number; longitude: number };
}

export default function MapLocationPicker({
  visible,
  onDismiss,
  onLocationSelected,
  initialLocation,
}: MapLocationPickerProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialLocation || null);

  const [region, setRegion] = useState<Region>({
    latitude: initialLocation?.latitude || 32.7767, // Dallas default
    longitude: initialLocation?.longitude || -96.797,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const handleMapPress = useCallback((event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedCoords({ latitude, longitude });
  }, []);

  const reverseGeocode = async (
    latitude: number,
    longitude: number
  ): Promise<LocationData | null> => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `latlng=${latitude},${longitude}` +
        `&key=${GOOGLE_API_KEY}`;

      console.log("🗺️ Reverse geocoding:", latitude, longitude);
      const response = await fetch(url);
      const data = await response.json();

      console.log("🗺️ Geocode response status:", data.status);

      if (data.status === "OK" && data.results[0]) {
        const result = data.results[0];

        // Find the most specific locality/neighborhood name
        const neighborhood = result.address_components.find((comp: any) =>
          comp.types.includes("neighborhood")
        )?.long_name;

        const city = result.address_components.find((comp: any) =>
          comp.types.includes("locality")
        )?.long_name;

        const name = neighborhood || city || "Selected Location";

        console.log("✅ Geocoded to:", name);
        return {
          placeId: result.place_id,
          name,
          description: result.formatted_address,
          latitude,
          longitude,
        };
      } else {
        console.error("❌ Geocoding failed:", data.status, data.error_message);
      }
    } catch (e) {
      console.error("❌ Reverse geocode error:", e);
    }
    return null;
  };

  const handleConfirm = async () => {
    if (!selectedCoords) return;

    setLoading(true);
    console.log("📍 Confirming location:", selectedCoords);

    try {
      const location = await reverseGeocode(
        selectedCoords.latitude,
        selectedCoords.longitude
      );

      if (location) {
        console.log("✅ Location confirmed, calling onLocationSelected");
        onLocationSelected(location);
        console.log("✅ Location selected, closing modal");
        onDismiss();
      } else {
        console.error("❌ Failed to geocode location");
        alert("Failed to get location details. Please try again.");
      }
    } catch (e) {
      console.error("❌ Error in handleConfirm:", e);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            Drop a Pin
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.onSurfaceVariant,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Tap anywhere on the map to select a location
          </Text>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            onPress={handleMapPress}
          >
            {selectedCoords && (
              <Marker
                coordinate={selectedCoords}
                pinColor={theme.colors.primary}
              />
            )}
          </MapView>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleConfirm}
            disabled={!selectedCoords || loading}
            loading={loading}
            style={{ flex: 1, marginRight: 8, borderRadius: 25 }}
            buttonColor={theme.colors.primary}
          >
            {loading ? "Confirming..." : "Confirm Location"}
          </Button>
          <Button
            mode="outlined"
            onPress={onDismiss}
            disabled={loading}
            style={{ flex: 1, borderRadius: 25 }}
          >
            Cancel
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    marginTop: "auto",
    marginHorizontal: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 20,
    height: "85%",
  },
  header: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  buttonContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
  },
});
