import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import {
  Appbar,
  Searchbar,
  Card,
  Button,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import {
  fetchTextSearch,
  fetchRestaurantDetails,
  fetchAutocomplete,
} from "../utils/placesApi";
import RestaurantDetailModal from "../components/RestaurantDetailModal";
import { Keyboard } from "react-native";

export default function SearchScreen({ navigation }: any) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<any>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleInputChange = (text: string) => {
    setQuery(text);
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(
      setTimeout(async () => {
        if (text.trim().length < 2) return setSuggestions([]);
        try {
          const data = await fetchAutocomplete(text);
          setSuggestions(data);
        } catch (err) {
          console.error("❌ Autocomplete error:", err);
        }
      }, 300)
    );
  };

  const handleSearch = async (q?: string) => {
    const text = q || query;
    if (!text.trim()) return;
    setLoading(true);
    setSuggestions([]);
    try {
      const data = await fetchTextSearch(text);
      setResults(data);
    } catch (err) {
      console.error("❌ Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (placeId: string) => {
    Keyboard.dismiss();
    try {
      const details = await fetchRestaurantDetails(placeId);
      setSelectedRestaurant(details);
      setModalVisible(true);
    } catch (err) {
      console.error("❌ Detail fetch error:", err);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header mode="small" elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Searchbar
          placeholder="Type or search with your voice"
          value={query}
          onChangeText={handleInputChange}
          onSubmitEditing={() => handleSearch()}
          style={styles.searchbar}
          autoFocus
        />
        <Appbar.Action icon="microphone" onPress={() => {}} />
      </Appbar.Header>

      {suggestions.length > 0 && results.length === 0 && !loading && (
        <ScrollView
          style={{ maxHeight: 250, paddingHorizontal: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {suggestions.map((s) => (
            <Button
              key={s.id}
              onPress={() => openDetails(s.id)}
              style={{ alignItems: "flex-start" }}
            >
              {s.name}
            </Button>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollArea}
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={{ borderRadius: 12, overflow: "hidden" }}>
                <Card.Title
                  title={item.name}
                  subtitle={`${item.address || ""} • ⭐${item.rating || "N/A"}`}
                />
                {item.photo && <Card.Cover source={{ uri: item.photo }} />}
                <Card.Actions>
                  <Button onPress={() => openDetails(item.id)}>
                    View Details
                  </Button>
                </Card.Actions>
              </View>
            </Card>
          )}
        />
      )}

      <RestaurantDetailModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        restaurant={selectedRestaurant}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchbar: {
    flex: 1,
    marginRight: 4,
    borderRadius: 8,
    height: 42,
  },
  scrollArea: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
});
