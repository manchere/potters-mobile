import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CameraView } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { RootStackParamList } from "../navigation";
import { radius, spacing, usePalette } from "../theme";
import { Banner, Button, Card, Screen, TextField } from "../ui";
import CameraWithPermission, { CameraHint, Shutter } from "../ui/CameraPermission";

type Props = NativeStackScreenProps<RootStackParamList, "AddItem">;

// FR1: photograph an item, let the vision service suggest a name and
// description, review/edit, then save. Nothing is saved until the member
// taps Save; only the name is required; the photo can be retaken; on
// success they land on the new item with its photo. Also reached from
// Identify (FR3, photo + suggestion carried over) and from an unmatched
// scan (FR2, barcode carried over).
export default function AddItemScreen({ navigation, route }: Props) {
  const prefill = route.params;
  const palette = usePalette();
  const [photoBase64, setPhotoBase64] = useState<string | null>(prefill?.prefillImageBase64 ?? null);
  const [name, setName] = useState(prefill?.prefillName ?? "");
  const [description, setDescription] = useState(prefill?.prefillDescription ?? "");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("");
  const [barcode, setBarcode] = useState(prefill?.prefillBarcode ?? "");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.6 });
    if (!photo?.base64) return;
    setPhotoBase64(photo.base64);
    setSuggesting(true);
    setSuggestError(null);
    try {
      const suggestion = await api.vision.describeItem(`data:image/jpeg;base64,${photo.base64}`);
      if (suggestion.name) setName(String(suggestion.name));
      if (suggestion.description) setDescription(String(suggestion.description));
    } catch {
      setSuggestError("Couldn't suggest details from the photo — fill them in yourself.");
    } finally {
      setSuggesting(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setNameError("Give the item a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api.items.create({
        name: name.trim(),
        description: description.trim(),
        quantity: Math.max(0, Number.parseInt(quantity, 10) || 0),
        location: location.trim(),
        barcode: barcode.trim() || null,
        tag_ids: [],
      });
      if (photoBase64) {
        await api.items.setImage(created.id, `data:image/jpeg;base64,${photoBase64}`);
      }
      navigation.replace("ItemDetail", { itemId: created.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the item.");
    } finally {
      setSaving(false);
    }
  };

  if (!photoBase64) {
    return (
      <CameraWithPermission ref={cameraRef} reason="Take a photo of the item and we'll suggest its name and description.">
        <CameraHint>Fit the whole item in the frame</CameraHint>
        <Shutter onPress={takePhoto} />
      </CameraWithPermission>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View>
          <Image source={{ uri: `data:image/jpeg;base64,${photoBase64}` }} style={styles.preview} />
          {suggesting ? (
            <View style={styles.analyzing}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.analyzingText}>Looking at your photo…</Text>
            </View>
          ) : null}
        </View>
        <Button title="Retake Photo" icon="camera-reverse-outline" variant="secondary" onPress={() => setPhotoBase64(null)} />
        {suggestError ? <Banner tone="warning">{suggestError}</Banner> : null}
        {!suggesting && !suggestError && (name || description) ? (
          <Banner tone="info" icon="sparkles-outline">Suggested from your photo — check it before saving.</Banner>
        ) : null}
        {error ? <Banner tone="error">{error}</Banner> : null}

        <Card style={{ gap: spacing.md }}>
          <TextField
            label="Name"
            placeholder="e.g. Folding table"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(null);
            }}
            error={nameError}
          />
          <TextField label="Description" placeholder="Optional" value={description} onChangeText={setDescription} multiline />
          <View style={styles.twoColumns}>
            <View style={{ width: 110 }}>
              <TextField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Location" placeholder="e.g. Storage room B" value={location} onChangeText={setLocation} />
            </View>
          </View>
          <TextField label="Barcode" placeholder="Optional" value={barcode} onChangeText={setBarcode} autoCapitalize="none" />
        </Card>
        <Button title="Save Item" icon="checkmark" onPress={save} loading={saving} disabled={suggesting} />
        <Text style={{ color: palette.faintText, fontSize: 12, textAlign: "center" }}>
          Only the name is required. Tags and categories can be added on the desktop app.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  preview: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: "#000" },
  analyzing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.lg,
    backgroundColor: "rgba(11,26,51,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  analyzingText: { color: "#fff", fontWeight: "700" },
  twoColumns: { flexDirection: "row", gap: spacing.md },
});
