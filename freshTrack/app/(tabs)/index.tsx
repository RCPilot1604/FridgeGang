import "react-native-get-random-values";
import React, { useState, useEffect, useRef } from "react";
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
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

// Allow notifications to show when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [today, setToday] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const prevItemsRef = useRef([]);

  const categories = [
    "All",
    "Produce",
    "Dairy",
    "Meat",
    "Pantry",
    "Frozen",
    "Other",
  ];
  // Ask for notification permissions on first load
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // Update today's date at midnight
  useEffect(() => {
    const interval = setInterval(() => {
      const newDate = new Date();
      newDate.setHours(0, 0, 0, 0);
      if (newDate.getTime() !== today.getTime()) {
        setToday(newDate);
      }
    }, 60 * 1000); // check every minute

    return () => clearInterval(interval);
  }, [today]);

  // Detect added items or new day
  useEffect(() => {
    const prevItems = prevItemsRef.current;
    const addedItems = groceryItems.filter(
      (item) => !prevItems.some((prev) => prev.id === item.id)
    );

    groceryItems.forEach((item) => {
      const expiryDate = new Date(item.expiry_date);
      const now = new Date(today);
      const diffDays = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const isNewItem = addedItems.some((added) => added.id === item.id);

      if (
        (diffDays === 3 || diffDays <= 0) &&
        (isNewItem || todayChanged(prevItemsRef.current))
      ) {
        sendNotification(
          `${item.item_name} ${
            diffDays < 0
              ? "has expired!"
              : diffDays === 0
              ? "expires today!"
              : "will expire in 3 days"
          }`
        );
      }
    });

    // Update previous items reference
    prevItemsRef.current = groceryItems;
  }, [groceryItems, today]);

  function todayChanged(prevItems) {
    // Trigger notifications for all items once per day
    return prevItems.length === groceryItems.length;
  }

  const sendNotification = async (message: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "FreshTrack Reminder",
        body: message,
      },
      trigger: null,
    });
  };

  const registerForPushNotificationsAsync = async () => {
    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert(
          "Permission required",
          "Enable notifications to get expiry alerts."
        );
        return;
      }
    } else {
      Alert.alert("Use a physical device for push notifications");
    }
  };

  const handleScanSuccess = ({ data }: { data: string }) => {
    setScannerVisible(false);
    console.log("Raw Scanned Data:", data);

    try {
      if (typeof data !== "string" || data.trim() === "") {
        throw new Error("Scanned data is empty or not a string.");
      }

      const parsed = JSON.parse(data);

      const itemsToProcess = Array.isArray(parsed) ? parsed : [parsed];

      const newValidItems: GroceryItem[] = [];
      const invalidItemMessages: string[] = [];

      // Process each item from the QR code
      for (const item of itemsToProcess) {
        if (typeof item !== "object" || item === null) {
          invalidItemMessages.push("An item was not a valid object.");
          continue;
        }

        // Check for all required fields.
        const missingFields = [
          "item_name",
          "expiry_date",
          "purchase_date",
          "category",
        ].filter((field) => !item[field]);

        if (missingFields.length === 0) {
          // If valid, create a new item with a unique id.
          const newItem: GroceryItem = { ...item, id: uuidv4() };
          newValidItems.push(newItem);
        } else {
          // If some fields are missing, identify which ones.
          const itemName = item.item_name || "Unknown Item";
          invalidItemMessages.push(
            `${itemName} is missing: ${missingFields.join(", ")}`
          );
        }
      }

      // Add any valid items to the grocery list.
      if (newValidItems.length > 0) {
        setGroceryItems((prev) =>
          [...prev, ...newValidItems].sort(
            (a, b) =>
              new Date(a.expiry_date).getTime() -
              new Date(b.expiry_date).getTime()
          )
        );
      }

      // If there were any invalid items, alert the user.
      if (invalidItemMessages.length > 0) {
        Alert.alert(
          "Invalid Item Data",
          `Some items could not be added:\n- ${invalidItemMessages.join(
            "\n- "
          )}`
        );
      }

      // If the QR code was valid JSON but no valid items were found.
      if (newValidItems.length === 0 && itemsToProcess.length > 0) {
        Alert.alert(
          "No Valid Items Added",
          "The QR code was scanned, but none of the items had the correct format."
        );
      }
    } catch (error) {
      // This handles JSON parsing errors or other thrown errors.
      Alert.alert(
        "QR Code Parsing Error",
        "The scanned QR code does not contain the correct JSON format. Please ensure it's a valid text-based QR code with the required data structure.\n\nCheck the Metro console log to see the raw data that was scanned."
      );
      // Also log the specific error to the console for detailed debugging.
      console.error("Failed to parse QR code:", error);
    }
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your grocery list is empty.</Text>
            <Text style={styles.emptySubText}>
              Tap "Scan New Item" to begin.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const expiry = getExpiryInfo(item.expiry_date);
          return (
            <View style={styles.card}>
              <View
                style={[styles.expiryBar, { backgroundColor: expiry.color }]}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.itemName}>{item.item_name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                    <Text style={styles.delete}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemDetails}>
                  Category: {item.category}
                </Text>
                <Text style={styles.itemDetails}>
                  Purchased: {formatDate(item.purchase_date)}
                </Text>
                <Text style={styles.itemDetails}>
                  Expires: {formatDate(item.expiry_date)}
                </Text>
                <Text style={[styles.expiryText, { color: expiry.color }]}>
                  {expiry.text}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.scanButtonContainer}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setScannerVisible(true)}
        >
          <Text style={styles.scanButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isScannerVisible} animationType="slide">
        <QRScanner onScanSuccess={handleScanSuccess} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setScannerVisible(false)}
        >
          <Text style={styles.closeButtonText}>x</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// (Styles remain unchanged — truncated for brevity)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 16,
    color: "#1F2937",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginHorizontal: 10,
    marginBottom: 10,
  },
  categoryButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryButtonSelected: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  categoryText: { color: "#374151", fontSize: 14, fontWeight: "500" },
  categoryTextSelected: { color: "white" },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    textAlign: "center",
    color: "#4B5563",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 8,
    fontSize: 14,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  expiryBar: { width: 8 },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
  },
  itemDetails: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  expiryText: {
    marginTop: 8,
    fontWeight: "bold",
    fontSize: 15,
  },
  delete: {
    fontSize: 20,
    paddingLeft: 10,
  },
  scanButtonContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    padding: 20,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  scanButton: {
    width: 60,
    height: 60,
    backgroundColor: "#22C55E",
    padding: 10,
    borderRadius: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scanButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 30,
  },
  closeButton: {
    width: 30,
    height: 30,
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 3,
    borderRadius: 20,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
});
