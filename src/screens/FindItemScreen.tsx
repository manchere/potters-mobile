import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BarcodeScanningResult, CameraView } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { api, ApiError } from "../api/client";
import type { Item } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import type { RootStackParamList } from "../navigation";
import { radius, spacing, usePalette } from "../theme";
import { Banner, Button, Card, Divider, ListRow, Screen, SectionTitle, StatusBadge } from "../ui";
import CameraWithPermission, { CameraHint, Shutter } from "../ui/CameraPermission";

type Props = NativeStackScreenProps<RootStackParamList, "FindItem">;

// One camera for finding an item, whichever way works:
//  - FR2: a barcode/QR code in view is looked up straight away and opens
//    that item. The scanner fires continuously, so a code is ignored while
//    its lookup is in flight; an unknown code shows what was scanned and
//    offers "Add as New Item" (with the barcode filled in).
//  - FR3: no code? Take a photo -- the vision service says what it looks
//    like, and existing items are ranked by word overlap with that guess.
//    It's best-effort text matching, so results are "possible matches"
//    (never one asserted answer); none is a normal outcome; "Not listed"
//    carries the photo and suggestion into Add Item without retaking it.
function matchScore(suggestedName: string, item: Item): number {
  const words = new Set(suggestedName.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2));
  if (words.size === 0) return 0;
  const itemWords = `${item.name} ${item.description}`.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  const overlap = new Set(itemWords.filter((word) => words.has(word))).size;
  return overlap / words.size;
}

export default function FindItemScreen({ navigation }: Props) {
  const palette = usePalette();
  const { access } = useAuth();
  const cameraRef = useRef<CameraView>(null);

  // Barcode lookup.
  const [scan, setScan] = useState<"scanning" | "looking-up" | "not-found" | "error">("scanning");
  const [code, setCode] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const busy = useRef(false);

  // Photo identification.
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestedName, setSuggestedName] = useState("");
  const [suggestedDescription, setSuggestedDescription] = useState("");
  const [candidates, setCandidates] = useState<Item[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const onScanned = async (result: BarcodeScanningResult) => {
    if (busy.current) return;
    busy.current = true;
    setCode(result.data);
    setScan("looking-up");
    try {
      const item = await api.items.getByBarcode(result.data);
      navigation.replace("ItemDetail", { itemId: item.id });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setScan("not-found");
      } else {
        setScan("error");
        setScanError(err instanceof Error ? err.message : "Lookup failed.");
      }
    }
  };

  const backToCamera = () => {
    setScan("scanning");
    setCode(null);
    setScanError(null);
    setPhotoBase64(null);
    busy.current = false;
  };

  const takePhoto = async () => {
    if (busy.current) return;
    busy.current = true; // no barcode lookups while identifying
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.6 });
    if (!photo?.base64) {
      busy.current = false;
      return;
    }
    setPhotoBase64(photo.base64);
    setAnalyzing(true);
    setPhotoError(null);
    try {
      const [suggestion, items] = await Promise.all([
        api.vision.describeItem(`data:image/jpeg;base64,${photo.base64}`),
        api.items.list(),
      ]);
      const name = suggestion.name ? String(suggestion.name) : "";
      setSuggestedName(name);
      setSuggestedDescription(suggestion.description ? String(suggestion.description) : "");
      setCandidates(
        items
          .map((item) => ({ item, score: matchScore(name, item) }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((entry) => entry.item),
      );
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Couldn't identify this item.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (!photoBase64) {
    return (
      <CameraWithPermission
        ref={cameraRef}
        reason="Point the camera at an item's barcode, or take a photo of it, to find it in the inventory."
        barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] }}
        onBarcodeScanned={scan === "scanning" ? onScanned : undefined}
      >
        <CameraHint>Point at a barcode, or take a photo</CameraHint>
        <View style={styles.frame} pointerEvents="none" />
        {scan === "scanning" ? <Shutter onPress={takePhoto} /> : null}
        {scan !== "scanning" ? (
          <View style={styles.sheet}>
            {scan === "looking-up" ? (
              <View style={styles.row}>
                <ActivityIndicator color="#f0c75e" />
                <Text style={styles.text}>Looking up {code}…</Text>
              </View>
            ) : null}
            {scan === "not-found" ? (
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
                <Button title="Scan Again" variant="ghost" onPress={backToCamera} />
              </>
            ) : null}
            {scan === "error" ? (
              <>
                <Text style={styles.title}>Couldn't look that up</Text>
                <Text style={styles.text}>{scanError}</Text>
                <Button title="Try Again" onPress={backToCamera} />
              </>
            ) : null}
          </View>
        ) : null}
      </CameraWithPermission>
    );
  }

  return (
    <Screen>
      <Image source={{ uri: `data:image/jpeg;base64,${photoBase64}` }} style={styles.preview} />
      {analyzing ? (
        <View style={styles.analyzing}>
          <ActivityIndicator color={palette.primary} />
          <Text style={{ color: palette.mutedText }}>Looking for matches…</Text>
        </View>
      ) : (
        <>
          {photoError ? <Banner tone="error">{photoError}</Banner> : null}
          {suggestedName ? (
            <Text style={{ color: palette.mutedText }}>
              Looks like: <Text style={{ color: palette.strongText, fontWeight: "700" }}>{suggestedName}</Text>
            </Text>
          ) : null}
          <SectionTitle>{candidates.length > 0 ? "Possible matches" : "No matching item found"}</SectionTitle>
          {candidates.length > 0 ? (
            <Card style={{ padding: 0, gap: 0 }}>
              {candidates.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow
                    icon="cube-outline"
                    title={item.name}
                    subtitle={`Qty ${item.quantity}${item.location ? ` · ${item.location}` : ""}`}
                    right={<StatusBadge status={item.status} />}
                    onPress={() => navigation.replace("ItemDetail", { itemId: item.id })}
                  />
                </View>
              ))}
            </Card>
          ) : (
            <Text style={{ color: palette.mutedText }}>Nothing in the inventory looks like this yet.</Text>
          )}
          {access.sections.inventory.create ? (
            <Button
              title="Not Listed — Add as New Item"
              icon="add"
              onPress={() =>
                navigation.replace("AddItem", {
                  prefillImageBase64: photoBase64,
                  prefillName: suggestedName,
                  prefillDescription: suggestedDescription,
                })
              }
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
          <Button title="Back to Camera" variant="ghost" icon="camera-outline" onPress={backToCamera} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    top: "24%",
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
  preview: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: "#000" },
  analyzing: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
});
