import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BarcodeScanningResult } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { RootStackParamList } from "../navigation";
import { radius, spacing } from "../theme";
import { Button } from "../ui";
import CameraWithPermission, { CameraHint } from "../ui/CameraPermission";

type Props = NativeStackScreenProps<RootStackParamList, "Scan">;

// FR2: scan a barcode/QR code and jump to that item. The scanner fires
// continuously, so a code is ignored while its lookup is in flight; an
// unknown code shows what was scanned and offers "Add as New Item" (with the
// barcode filled in) instead of dead-ending.
export default function ScanScreen({ navigation }: Props) {
  const { access } = useAuth();
  const [status, setStatus] = useState<"scanning" | "looking-up" | "not-found" | "error">("scanning");
  const [code, setCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);

  const onScanned = async (result: BarcodeScanningResult) => {
    if (busy.current) return;
    busy.current = true;
    setCode(result.data);
    setStatus("looking-up");
    try {
      const item = await api.items.getByBarcode(result.data);
      navigation.replace("ItemDetail", { itemId: item.id });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus("not-found");
      } else {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Lookup failed.");
      }
    }
  };

  const scanAgain = () => {
    setStatus("scanning");
    setCode(null);
    setMessage(null);
    busy.current = false;
  };

  return (
    <CameraWithPermission
      reason="Point the camera at a barcode or QR code on an item to find it."
      barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] }}
      onBarcodeScanned={status === "scanning" ? onScanned : undefined}
    >
      <CameraHint>Point at a barcode or QR code</CameraHint>
      <View style={styles.frame} pointerEvents="none" />
      {status !== "scanning" ? (
        <View style={styles.sheet}>
          {status === "looking-up" ? (
            <View style={styles.row}>
              <ActivityIndicator color="#f0c75e" />
              <Text style={styles.text}>Looking up {code}…</Text>
            </View>
          ) : null}
          {status === "not-found" ? (
            <>
              <Text style={styles.title}>No item has this code</Text>
              <Text style={styles.code}>{code}</Text>
              {access.sections.inventory.create ? (
                <Button
                  title="Add as New Item"
                  icon="add"
                  onPress={() => navigation.replace("AddItem", { prefillBarcode: code ?? undefined })}
                />
              ) : null}
              <Button title="Scan Again" variant="ghost" onPress={scanAgain} />
            </>
          ) : null}
          {status === "error" ? (
            <>
              <Text style={styles.title}>Couldn't look that up</Text>
              <Text style={styles.text}>{message}</Text>
              <Button title="Try Again" onPress={scanAgain} />
            </>
          ) : null}
        </View>
      ) : null}
    </CameraWithPermission>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    top: "28%",
    alignSelf: "center",
    width: "72%",
    aspectRatio: 1.4,
    borderWidth: 3,
    borderColor: "#f0c75e",
    borderRadius: radius.lg,
  },
  sheet: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl,
    backgroundColor: "rgba(11,26,51,0.94)",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, justifyContent: "center" },
  title: { color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center" },
  code: { color: "#f0c75e", fontSize: 15, textAlign: "center", fontWeight: "600" },
  text: { color: "#cdd5e3", fontSize: 14, textAlign: "center" },
});
