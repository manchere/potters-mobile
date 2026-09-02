import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { Item } from "../api/types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Identify">;

// Photo-based "what is this" flow: takes a picture, asks the server's Groq
// vision endpoint to describe it, then matches that description against the
// existing inventory by name (client-side - the API has no full-text search
// endpoint). This is best-effort word overlap, not a real image match, so
// it's shown as ranked candidates rather than a single certain answer.
function matchScore(suggestedName: string, item: Item): number {
  const suggestedWords = new Set(
    suggestedName
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  );
  if (suggestedWords.size === 0) return 0;
  const itemWords = item.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const overlap = itemWords.filter((w) => suggestedWords.has(w)).length;
  return overlap / suggestedWords.size;
}

export default function IdentifyScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "done">("idle");
  const [suggestedName, setSuggestedName] = useState("");
  const [suggestedDescription, setSuggestedDescription] = useState("");
  const [candidates, setCandidates] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.7 });
    if (!photo?.base64) return;
    setPhotoBase64(photo.base64);
    setStatus("analyzing");
    setError(null);
    try {
      const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
      const [suggestion, items] = await Promise.all([
        api.vision.describeItem(dataUrl),
        api.items.list(),
      ]);
      const name = suggestion.name ? String(suggestion.name) : "";
      setSuggestedName(name);
      setSuggestedDescription(suggestion.description ? String(suggestion.description) : "");

      const ranked = items
        .map((item) => ({ item, score: matchScore(name, item) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((entry) => entry.item);
      setCandidates(ranked);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not identify this item");
      setStatus("done");
    }
  };

  if (!photoBase64) {
    if (!permission) {
      return <View style={styles.container} />;
    }
    if (!permission.granted) {
      return (
        <View style={styles.centered}>
          <Text style={styles.helperText}>Camera access is needed to identify items.</Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <Text style={styles.hint}>Point at the item and take a photo</Text>
        <Pressable style={styles.shutter} onPress={takePhoto}>
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.resultsContainer}>
      <Image source={{ uri: `data:image/jpeg;base64,${photoBase64}` }} style={styles.preview} />

      {status === "analyzing" ? <Text style={styles.helperText}>Analyzing photo…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {status === "done" ? (
        <>
          <Text style={styles.sectionTitle}>
            {candidates.length > 0 ? "Possible matches" : "No matching item found"}
          </Text>
          {suggestedName ? (
            <Text style={styles.helperText}>Looked like: "{suggestedName}"</Text>
          ) : null}

          <FlatList
            data={candidates}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                style={styles.candidateRow}
                onPress={() => navigation.replace("ItemDetail", { itemId: item.id })}
              >
                <Text style={styles.candidateName}>{item.name}</Text>
                <Text style={styles.candidateSubtitle}>
                  Qty {item.quantity} · {item.status}
                </Text>
              </Pressable>
            )}
          />

          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              navigation.replace("AddItem", {
                prefillImageBase64: photoBase64,
                prefillName: suggestedName,
                prefillDescription: suggestedDescription,
              })
            }
          >
            <Text style={styles.primaryButtonText}>Not Listed — Add as New Item</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setPhotoBase64(null)}>
            <Text style={styles.secondaryButtonText}>Retake Photo</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  camera: { flex: 1 },
  hint: {
    position: "absolute",
    top: 24,
    alignSelf: "center",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  shutter: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },
  resultsContainer: { flex: 1, backgroundColor: "#fff", padding: 16 },
  preview: { width: "100%", height: 180, borderRadius: 8, marginBottom: 12, backgroundColor: "#eee" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  helperText: { color: "#666", marginBottom: 8 },
  error: { color: "#dc2626", marginBottom: 8 },
  candidateRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  candidateName: { fontSize: 15, fontWeight: "600" },
  candidateSubtitle: { fontSize: 13, color: "#666" },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  secondaryButton: { marginTop: 10, paddingVertical: 12, alignItems: "center" },
  secondaryButtonText: { color: "#2563eb", fontWeight: "600" },
});
