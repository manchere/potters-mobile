import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CameraView } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { Item } from "../api/types";
import type { RootStackParamList } from "../navigation";
import { radius, spacing, usePalette } from "../theme";
import { Banner, Button, Card, Divider, ListRow, Screen, SectionTitle, StatusBadge } from "../ui";
import CameraWithPermission, { CameraHint, Shutter } from "../ui/CameraPermission";

type Props = NativeStackScreenProps<RootStackParamList, "Identify">;

// FR3: photograph an item, ask the vision service what it looks like, then
// rank existing items by word overlap with that guess. It's best-effort
// text matching, so results are "possible matches" (never one asserted
// answer); none is a normal outcome; "Not listed" carries the photo and
// suggestion into Add Item without retaking it.
function matchScore(suggestedName: string, item: Item): number {
  const words = new Set(suggestedName.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2));
  if (words.size === 0) return 0;
  const itemWords = `${item.name} ${item.description}`.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  const overlap = new Set(itemWords.filter((word) => words.has(word))).size;
  return overlap / words.size;
}

export default function IdentifyScreen({ navigation }: Props) {
  const palette = usePalette();
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [status, setStatus] = useState<"analyzing" | "done">("analyzing");
  const [suggestedName, setSuggestedName] = useState("");
  const [suggestedDescription, setSuggestedDescription] = useState("");
  const [candidates, setCandidates] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.6 });
    if (!photo?.base64) return;
    setPhotoBase64(photo.base64);
    setStatus("analyzing");
    setError(null);
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
      setError(err instanceof Error ? err.message : "Couldn't identify this item.");
    } finally {
      setStatus("done");
    }
  };

  if (!photoBase64) {
    return (
      <CameraWithPermission ref={cameraRef} reason="Take a photo of an item and we'll look for it in the inventory.">
        <CameraHint>Take a photo of the item</CameraHint>
        <Shutter onPress={takePhoto} />
      </CameraWithPermission>
    );
  }

  return (
    <Screen>
      <Image source={{ uri: `data:image/jpeg;base64,${photoBase64}` }} style={styles.preview} />
      {status === "analyzing" ? (
        <View style={styles.analyzing}>
          <ActivityIndicator color={palette.primary} />
          <Text style={{ color: palette.mutedText }}>Looking for matches…</Text>
        </View>
      ) : (
        <>
          {error ? <Banner tone="error">{error}</Banner> : null}
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
          <Button title="Retake Photo" variant="ghost" onPress={() => setPhotoBase64(null)} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: "#000" },
  analyzing: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
});
