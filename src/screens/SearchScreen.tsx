import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Keyboard,
} from "react-native";
import {
  Appbar,
  Searchbar,
  Card,
  Button,
  useTheme,
  Text,
  Chip,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import {
  fetchTextSearch,
  fetchRestaurantDetails,
  fetchAutocomplete,
} from "../utils/placesApi";
import { CATEGORY_OPTIONS } from "../constants/categoryType";
import RestaurantDetailModal from "../components/RestaurantDetailModal";
import HomeSkeleton from "../components/HomeSkeleton";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen({ navigation }: any) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<any>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && results.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [loading, results]);

  const handleInputChange = (text: string) => {
    setQuery(text);

    if (text.trim().length === 0) {
      setResults([]);
      setSuggestions([]);
      setSelectedCategory(null);
      return;
    }

    setSelectedCategory(null);
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

  const handleCategorySelect = async (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setResults([]);
      setQuery("");
      return;
    }

    setSelectedCategory(category);
    setQuery(category);
    setSuggestions([]);
    setLoading(true);
    try {
      const data = await fetchTextSearch(category);
      setResults(data);
    } catch (err) {
      console.error("❌ Category search error:", err);
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

  const showEmptyState =
    !loading &&
    results.length === 0 &&
    suggestions.length === 0 &&
    query.trim().length === 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <LinearGradient
          colors={
            theme.dark
              ? [theme.colors.background, theme.colors.surface]
              : [theme.colors.surface, theme.colors.background]
          }
          style={StyleSheet.absoluteFill}
        />

        <Appbar.Header
          mode="small"
          elevated
          statusBarHeight={0}
          style={[
            styles.appbar,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.outline,
            },
          ]}
        >
          <Appbar.BackAction
            onPress={() => navigation.goBack()}
            color={theme.colors.primary}
          />
          <View style={styles.searchbarContainer}>
            <Searchbar
              placeholder="Type or search with your voice"
              value={query}
              onChangeText={handleInputChange}
              onSubmitEditing={() => handleSearch()}
              style={[
                styles.searchbar,
                { backgroundColor: theme.colors.background },
              ]}
              inputStyle={{ fontSize: 15, color: theme.colors.onSurface }}
              iconColor={theme.colors.primary}
              placeholderTextColor={theme.colors.onSurface + "88"}
            />
          </View>
          <Appbar.Action
            icon="microphone"
            onPress={() => {}}
            color={theme.colors.primary}
          />
        </Appbar.Header>

        {/* Chips row always visible */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContainer}
        >
          {CATEGORY_OPTIONS.map((opt) => {
            const isSelected = selectedCategory === opt.value;
            return (
              <Chip
                compact
                key={opt.value}
                onPress={() => handleCategorySelect(opt.value)}
                selected={isSelected}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.secondary
                      : theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
                textStyle={{
                  color: isSelected
                    ? theme.colors.onPrimary || "#fff"
                    : theme.colors.onSurface,
                }}
                selectedColor={theme.colors.onPrimary}
              >
                {opt.label}
              </Chip>
            );
          })}
        </ScrollView>

        {/* Main scroll area for suggestions/results/empty */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {showEmptyState && (
            <View style={styles.emptyState}>
              <Text
                style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
              >
                Find your next favorite spot
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: theme.colors.onSurface + "99" },
                ]}
              >
                Search by cuisine, restaurant name, or vibe.
              </Text>
            </View>
          )}

          {!loading &&
            suggestions.map((s) => (
              <Button
                key={s.id}
                onPress={() => openDetails(s.id)}
                style={styles.suggestionButton}
                textColor={theme.colors.primary}
                contentStyle={{ justifyContent: "flex-start" }}
              >
                {s.name}
              </Button>
            ))}

          {loading && (
            <View style={{ padding: 16 }}>
              <HomeSkeleton />
            </View>
          )}

          {!loading && results.length > 0 && (
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollArea}
                renderItem={({ item }) => (
                  <Card
                    mode="elevated"
                    style={[
                      styles.card,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    {item.photo && (
                      <Card.Cover
                        source={{ uri: item.photo }}
                        style={{
                          height: 160,
                          borderTopLeftRadius: 12,
                          borderTopRightRadius: 12,
                        }}
                      />
                    )}
                    <Card.Title
                      title={item.name}
                      titleStyle={{ color: theme.colors.onSurface }}
                      subtitleStyle={{ color: theme.colors.onSurface + "99" }}
                      subtitle={`${item.address || ""} • ⭐${
                        item.rating || "N/A"
                      }`}
                    />
                    <Card.Actions>
                      <Button
                        onPress={() => openDetails(item.id)}
                        textColor={theme.colors.primary}
                      >
                        View Details
                      </Button>
                    </Card.Actions>
                  </Card>
                )}
              />
            </Animated.View>
          )}
        </ScrollView>

        <RestaurantDetailModal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          restaurant={selectedRestaurant}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appbar: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === "ios" ? 2 : 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchbarContainer: {
    flex: 1,
    justifyContent: "center",
  },
  searchbar: {
    flex: 1,
    marginRight: 4,
    borderRadius: 8,
    marginVertical: Platform.OS === "ios" ? 4 : 0,
  },
  scrollArea: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 250,
  },
  chipContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 15,
  },
  chip: {
    marginRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    borderRadius: 16,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  suggestionButton: {
    alignItems: "flex-start",
    borderRadius: 0,
    paddingVertical: 6,
  },
});
