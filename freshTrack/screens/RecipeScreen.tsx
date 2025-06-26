import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { generateRecipeFromItems } from "@/lib/gemini.ts";

type RootStackParamList = {
  RecipeScreen: { ingredients: string[] };
};

type RecipeScreenRouteProp = RouteProp<RootStackParamList, "RecipeScreen">;

export default function RecipeScreen() {
  const route = useRoute<RecipeScreenRouteProp>();
  const navigation = useNavigation();
  const { ingredients } = route.params;

  const [recipe, setRecipe] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const result = await generateRecipeFromItems(ingredients);
        setRecipe(result);
      } catch (error) {
        Alert.alert("Error", "Failed to generate recipe. Please try again.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, []);

  const handleBack = () => navigation.navigate("Home");

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10 }}>Generating recipe...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generated Recipe</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.recipeText}>{recipe}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    padding: 20,
  },
  recipeText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  backText: {
    color: "#3B82F6",
    fontSize: 16,
    position: "absolute",
    left: 20,
    top: 50,
  },
});