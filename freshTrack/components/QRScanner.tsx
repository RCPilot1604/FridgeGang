import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Camera, CameraView } from "expo-camera";
import { Dimensions } from "react-native";

interface QRScannerProps {
  onScanSuccess: ({ data }: { data: string }) => void;
}

// Define the size of the viewfinder
const viewfinderSize = 250;
const { height: screenHeight, width: screenWidth } = Dimensions.get("window");
const maskVerticalHeight = (screenHeight - viewfinderSize) / 2;


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

      <View style={styles.overlay}>
        {/* Top black area */}
        <View style={{ height: maskVerticalHeight, backgroundColor: 'rgba(0,0,0,0.6)', width: '100%' }} />

        {/* Middle row with side masks and viewfinder */}
        <View style={{ flexDirection: 'row' }}>
          {/* Left black area */}
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />

          {/* Transparent center (viewfinder) */}
          <View style={styles.viewfinder} />

          {/* Right black area */}
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
        </View>

        {/* Bottom black area */}
        <View style={{ height: maskVerticalHeight, backgroundColor: 'rgba(0,0,0,0.6)', width: '100%', alignItems: 'center' }}>
          <Text style={styles.promptText}>Align QR code within the frame to scan</Text>
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
    height: '100%',
  },
  infoText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  viewfinder: {
    width: viewfinderSize,
    height: viewfinderSize,
    borderWidth: 2,
    borderColor: "white",
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