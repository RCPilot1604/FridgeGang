import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from "react-native";
import QRScanner from "@/components/QRScanner";
import { v4 as uuidv4 } from "uuid";

interface GroceryItem {
  id: string;
  item_name: string;
  expiry_date: string;
  purchase_date: string;
  category: string;
}

type OmitId<T> = Omit<T, "id">;

interface ExpiryInfo {
  color: string;
  text: string;
}

const formatDate = (isoString: string): string =>
  isoString
    ? new Date(isoString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

const getExpiryInfo = (expiryDate?: string): ExpiryInfo => {
  if (!expiryDate) return { color: "#9CA3AF", text: "N/A" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return { color: "#EF4444", text: "Expired" };
  if (diffDays <= 3)
    return { color: "#F97316", text: `Expires in ${diffDays}d` };
  return { color: "#22C55E", text: "Fresh" };
};

export default function HomeScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Produce", "Dairy", "Meat", "Pantry", "Frozen", "Other"];

  const handleScanSuccess = ({ data }: { data: string }) => {
    setScannerVisible(false);
    try {
      const parsed = JSON.parse(data);
      if (
        parsed.item_name &&
        parsed.expiry_date &&
        parsed.purchase_date &&
        parsed.category
      ) {
        const newItem: GroceryItem = { ...parsed, id: uuidv4() };
        setGroceryItems((prev) => [...prev, newItem]);
      } else {
        Alert.alert("Invalid QR Code", "Missing required data fields.");
      }
    } catch {
      Alert.alert("Invalid QR Code", "Could not parse QR code.");
    }
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setGroceryItems((prev) => prev.filter((item) => item.id !== id));
        },
      },
    ]);
  };

  const filteredItems =
    selectedCategory === "All"
      ? groceryItems
      : groceryItems.filter((i) => i.category === selectedCategory);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Fresh Track</Text>

      <View style={styles.categoryContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryButton,
              selectedCategory === cat && styles.categoryButtonSelected,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat && styles.categoryTextSelected,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Your grocery list is empty.</Text>
        }
        renderItem={({ item }) => {
          const expiry = getExpiryInfo(item.expiry_date);
          return (
            <View style={styles.card}>
              <View style={[styles.expiryBar, { backgroundColor: expiry.color }]} />
              <View style={styles.cardContent}>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <Text style={styles.itemDetails}>Category: {item.category}</Text>
                <Text style={styles.itemDetails}>
                  Purchased: {formatDate(item.purchase_date)}
                </Text>
                <Text style={styles.itemDetails}>
                  Expires: {formatDate(item.expiry_date)}
                </Text>
                <Text style={[styles.expiryText, { color: expiry.color }]}>
                  {expiry.text}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                  <Text style={styles.delete}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => setScannerVisible(true)}
      >
        <Text style={styles.scanButtonText}>📷 Scan New Item</Text>
      </TouchableOpacity>

      <Modal visible={isScannerVisible} animationType="slide">
        <QRScanner/>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setScannerVisible(false)}
        >
          <Text style={styles.closeButtonText}>Close Scanner</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", textAlign: "center", margin: 16 },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  categoryButton: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  categoryButtonSelected: {
    backgroundColor: "#22C55E",
  },
  categoryText: { color: "#374151", fontSize: 12 },
  categoryTextSelected: { color: "white" },
  list: { padding: 16 },
  empty: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 50,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  expiryBar: { width: 6 },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  itemDetails: {
    fontSize: 12,
    color: "#6B7280",
  },
  expiryText: {
    marginTop: 6,
    fontWeight: "600",
  },
  delete: {
    marginTop: 8,
    color: "#EF4444",
    fontSize: 14,
  },
  scanButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#22C55E",
    padding: 16,
    borderRadius: 32,
    alignItems: "center",
  },
  scanButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#EF4444",
    padding: 12,
    borderRadius: 24,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});