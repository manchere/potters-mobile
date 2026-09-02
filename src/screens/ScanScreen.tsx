import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Scan">;

// Scans a barcode/QR code and looks it up against items.barcode via
// GET /api/items/barcode/:code. Unmatched codes offer a way to add a new
// item instead of dead-ending.
export default function ScanScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "looking-up" | "not-found">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.helperText}>Camera access is needed to scan barcodes.</Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const handleScanned = async (result: BarcodeScanningResult) => {
    if (status === "looking-up" || scannedCode === result.data) return;
    setScannedCode(result.data);
    setStatus("looking-up");
    setError(null);
    try {
      const item = await api.items.getByBarcode(result.data);
      navigation.replace("ItemDetail", { itemId: item.id });
    } catch (err) {
      setStatus("not-found");
      setError(err instanceof Error ? err.message : "Lookup failed");
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
        }}
        onBarcodeScanned={status === "looking-up" ? undefined : handleScanned}
      />
      <View style={styles.overlay}>
        {status === "looking-up" ? <Text style={styles.overlayText}>Looking up {scannedCode}…</Text> : null}
        {status === "not-found" ? (
          <View style={styles.notFoundCard}>
            <Text style={styles.overlayText}>No item matches "{scannedCode}".</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.replace("AddItem")}
            >
              <Text style={styles.primaryButtonText}>Add as New Item</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setScannedCode(null);
                setStatus("idle");
                setError(null);
              }}
            >
              <Text style={styles.secondaryButtonText}>Scan Again</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  camera: { flex: 1 },
  overlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16 },
  overlayText: { color: "#fff", textAlign: "center", fontSize: 15, marginBottom: 8 },
  errorText: { color: "#fca5a5", textAlign: "center", marginBottom: 8 },
  notFoundCard: { backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 12, padding: 16 },
  helperText: { color: "#666", textAlign: "center" },
  primaryButton: { backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: { paddingVertical: 12, alignItems: "center" },
  secondaryButtonText: { color: "#93c5fd", fontWeight: "600" },
});
