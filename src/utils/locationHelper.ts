import * as Location from "expo-location";

let lastLocation: { latitude: number; longitude: number } | null = null;
let lastTs = 0;

export async function getLocationCached() {
  const now = Date.now();

  // 5-second cache window
  if (lastLocation && now - lastTs < 5000) {
    return lastLocation;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission not granted");
  }

  const { coords } = await Location.getCurrentPositionAsync({});
  lastLocation = {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
  lastTs = now;

  return lastLocation;
}
