// @/components/QRScanner.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Camera, CameraView } from "expo-camera";

interface QRScannerProps {
  onScanSuccess: ({ data }: { data: string }) => void;
}

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    // Check if we've already processed a scan to prevent multiple triggers
    if (!scanned) {
      setScanned(true); // Mark as scanned
      onScanSuccess({ data }); // Pass the data back to the parent component
    }
  };

  if (hasPermission === null) {
    return (
      <Text style={styles.infoText}>Requesting for camera permission...</Text>
    );
  }
  if (hasPermission === false) {
    return (
      <Text style={styles.infoText}>
        No access to camera. Please enable it in your settings.
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.overlay}>
        <Text style={styles.scanPrompt}>Scan a QR Code</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  infoText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanPrompt: {
    fontSize: 22,
    color: "white",
    fontWeight: "bold",
    borderWidth: 2,
    borderColor: "white",
    padding: 20,
    borderRadius: 10,
  },
});
