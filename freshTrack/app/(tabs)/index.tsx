import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";

// --- Helper & Global Declarations ---

// Define a type for the QR Code scanner library, as it's loaded from a script tag.
declare const Html5Qrcode: any;

// --- Type Definitions ---
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

// --- Helper Functions ---
const formatDate = (isoString: string): string =>
  isoString
    ? new Date(isoString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

const getExpiryInfo = (expiryDate?: string): ExpiryInfo => {
  if (!expiryDate) return { color: "bg-gray-400", text: "N/A" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return { color: "bg-red-500", text: "Expired" };
  if (diffDays <= 3)
    return { color: "bg-orange-500", text: `Expires in ${diffDays}d` };
  return { color: "bg-green-500", text: "Fresh" };
};

// --- React Components ---

/**
 * QR Code Scanner Component
 */
interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}
const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScanSuccess,
  onClose,
}) => {
  const readerRef = useRef<any>(null);

  useEffect(() => {
    const readerElement = document.getElementById("qr-reader-element");
    if (!readerElement) return;

    const html5QrCode = new Html5Qrcode("qr-reader-element");
    readerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        (errorMessage: string) => {
          /* ignore errors */
        }
      )
      .catch((err: any) => {
        alert(
          "Could not start camera. Please ensure you've granted permission."
        );
        onClose();
      });

    return () => {
      if (readerRef.current && readerRef.current.isScanning) {
        readerRef.current
          .stop()
          .catch((err: any) => console.error("Failed to stop scanner", err));
      }
    };
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-md text-center">
        <h2 className="text-xl font-bold mb-4">Scan QR Code</h2>
        <div
          id="qr-reader-element"
          className="w-full border-2 border-dashed border-gray-400 rounded-md"
        ></div>
        <button
          onClick={onClose}
          className="mt-4 bg-red-500 text-white font-bold py-2 px-6 rounded-full hover:bg-red-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

/**
 * Item Card Component
 */
interface ItemCardProps {
  item: GroceryItem;
  onDelete: (id: string) => void;
}
const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete }) => {
  const expiryInfo = getExpiryInfo(item.expiry_date);
  return (
    <div className="bg-white rounded-lg p-4 flex items-center space-x-4 border border-gray-200">
      <div
        className={`w-2.5 h-full self-stretch rounded-full ${expiryInfo.color}`}
      ></div>
      <div className="flex-grow">
        <p className="font-bold text-lg text-gray-800">{item.item_name}</p>
        <p className="text-sm text-gray-500">Category: {item.category}</p>
        <p className="text-sm text-gray-500">
          Purchased: {formatDate(item.purchase_date)}
        </p>
        <p className="text-sm text-gray-500">
          Expires: {formatDate(item.expiry_date)}
        </p>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <div
          className={`text-xs font-semibold text-white ${expiryInfo.color} px-2 py-1 rounded-full`}
        >
          {expiryInfo.text}
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <i className="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
  );
};

/**
 * Main App Component
 */
const App: React.FC = () => {
  // --- State ---
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<GroceryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isScannerVisible, setScannerVisible] = useState<boolean>(false);

  const CATEGORIES: string[] = [
    "All",
    "Produce",
    "Dairy",
    "Meat",
    "Pantry",
    "Frozen",
    "Other",
  ];

  // --- Effects ---

  // Effect for filtering items (runs when items or category change)
  useEffect(() => {
    const sortedItems = [...groceryItems].sort(
      (a, b) =>
        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    );
    if (selectedCategory === "All") {
      setFilteredItems(sortedItems);
    } else {
      setFilteredItems(
        sortedItems.filter((item) => item.category === selectedCategory)
      );
    }
  }, [groceryItems, selectedCategory]);

  // --- Handlers ---
  const handleAddItem = useCallback((itemData: OmitId<GroceryItem>) => {
    const newItem: GroceryItem = { ...itemData, id: crypto.randomUUID() };
    setGroceryItems((prevItems) => [...prevItems, newItem]);
  }, []);

  const handleDeleteItem = useCallback((itemId: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setGroceryItems((prevItems) =>
        prevItems.filter((item) => item.id !== itemId)
      );
    }
  }, []);

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      setScannerVisible(false);
      try {
        const data = JSON.parse(decodedText);
        // Validate the parsed data
        if (
          data.item_name &&
          data.expiry_date &&
          data.purchase_date &&
          data.category
        ) {
          handleAddItem(data);
        } else {
          alert("Invalid QR Code. Missing required data fields.");
        }
      } catch (e) {
        alert("Failed to parse QR code.");
      }
    },
    [handleAddItem]
  );

  // --- Render Logic ---
  return (
    <div className="max-w-lg mx-auto bg-white shadow-lg min-h-screen">
      <header className="bg-white p-5 border-b border-gray-200 text-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-800">FreshTrack</h1>
      </header>

      <div className="p-3 bg-white border-b border-gray-200">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
                selectedCategory === category
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <main className="p-4 space-y-3 pb-28">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} onDelete={handleDeleteItem} />
          ))
        ) : (
          <p className="text-center text-gray-500 mt-10">
            Your grocery list is empty. Scan an item to begin!
          </p>
        )}
      </main>

      <div className="p-4 sticky bottom-0 bg-white border-t border-gray-200">
        <button
          onClick={() => setScannerVisible(true)}
          className="w-full bg-green-500 text-white font-bold py-4 px-4 rounded-full shadow-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-3"
        >
          <i className="fas fa-qrcode"></i>
          <span>Scan New Item</span>
        </button>
      </div>

      {isScannerVisible && (
        <QRCodeScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setScannerVisible(false)}
        />
      )}
    </div>
  );
};

export default App;

// To use this file as an index.tsx in a Create React App project:
// 1. Create a new project: `npx create-react-app my-app --template typescript`
// 2. Replace `src/index.tsx` with this code.
// 3. In `public/index.html`, add these tags to the <head>:
//    <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
//    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css">
// 4. In `public/index.html`, ensure you have a div with the id "root": `<div id="root"></div>`.
// 5. Create a file `src/App.tsx` and move the `App` component export into it.
// 6. Update `src/index.tsx` to import App from './App' and render it.
// 7. Start the app: `npm start`
//
// Example `src/index.tsx` entry point:
// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import App from './App'; // Assuming the main component is in App.tsx
//
// const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
// root.render(<React.StrictMode><App /></React.StrictMode>);
