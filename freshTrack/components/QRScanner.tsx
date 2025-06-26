// @/components/QRScanner.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Camera, CameraView } from "expo-camera";

interface QRScannerProps {
  onScanSuccess: ({ data }: { data: string }) => void;
}

// Define the size of the viewfinder
const viewfinderSize = 250;

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
    if (!scanned) {
      setScanned(true);
      onScanSuccess({ data });
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

      {/* This is the new scanner overlay */}
      <View style={styles.overlay}>
        {/* Top mask */}
        <View style={styles.mask} />

        <View style={{ flexDirection: "row" }}>
          {/* Left mask */}
          <View style={styles.mask} />

          {/* The Viewfinder */}
          <View style={styles.viewfinder} />

          {/* Right mask */}
          <View style={styles.mask} />
        </View>

        {/* Bottom mask */}
        <View style={[styles.mask, { alignItems: "center" }]}>
          <Text style={styles.promptText}>
            Align QR code within the frame to scan
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
  // New overlay styles
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  mask: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  viewfinder: {
    width: viewfinderSize,
    height: viewfinderSize,
    borderColor: "white",
    borderWidth: 2,
    borderRadius: 10,
  },
  promptText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 24,
    maxWidth: "70%",
  },
});
