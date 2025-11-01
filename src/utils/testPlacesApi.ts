const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY as string;

export async function testGooglePlacesApi() {
  const testLat = 32.7767; // Dallas
  const testLon = -96.797;
  const radiusMeters = 1500;

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${testLat},${testLon}&radius=${radiusMeters}&type=restaurant&key=${API_KEY}`;

  console.log("🔍 Fetching test data from Google Places...");
  const response = await fetch(url);
  const data = await response.json();

  if (data.error_message) {
    console.error("❌ API Error:", data.error_message);
  } else if (data.results?.length > 0) {
    console.log("✅ Success! Example result:");
    console.log({
      name: data.results[0].name,
      rating: data.results[0].rating,
      address: data.results[0].vicinity,
    });
  } else {
    console.warn("⚠️ No results found — check your key or API restrictions.");
  }
}
