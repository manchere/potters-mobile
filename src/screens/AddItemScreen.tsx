import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../api/client";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "AddItem">;

// Two steps: snap a photo of the item, then review/edit a form pre-filled by
// the server's Groq vision suggestion before saving. The photo is attached
// to the item after it's created (POST /api/items/:id/image), matching how
// the web frontend's photo-fill flow works.
export default function AddItemScreen({ navigation, route }: Props) {
  const prefill = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [photoBase64, setPhotoBase64] = useState<string | null>(prefill?.prefillImageBase64 ?? null);
  const [name, setName] = useState(prefill?.prefillName ?? "");
  const [description, setDescription] = useState(prefill?.prefillDescription ?? "");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("");
  const [barcode, setBarcode] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!photoBase64) {
    if (!permission) {
      return <View style={styles.container} />;
    }
    if (!permission.granted) {
      return (
        <View style={styles.centered}>
          <Text style={styles.helperText}>Camera access is needed to photograph items.</Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <Pressable
          style={styles.shutter}
          onPress={async () => {
            const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.7 });
            if (!photo?.base64) return;
            setPhotoBase64(photo.base64);
            setSuggesting(true);
            try {
              const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
              const suggestion = await api.vision.describeItem(dataUrl);
              if (suggestion.name) setName(String(suggestion.name));
              if (suggestion.description) setDescription(String(suggestion.description));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not get a suggestion");
            } finally {
              setSuggesting(false);
            }
          }}
        >
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.form}>
      <Image source={{ uri: `data:image/jpeg;base64,${photoBase64}` }} style={styles.preview} />
      {suggesting ? <Text style={styles.helperText}>Analyzing photo…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Item name" />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        multiline
      />

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Shelf, room, …" />

      <Text style={styles.label}>Barcode (optional)</Text>
      <TextInput
        style={styles.input}
        value={barcode}
        onChangeText={setBarcode}
        placeholder="Scan or type a barcode"
        autoCapitalize="none"
      />

      <Pressable
        style={styles.primaryButton}
        disabled={saving || !name.trim()}
        onPress={async () => {
          setSaving(true);
          setError(null);
          try {
            const created = await api.items.create({
              name: name.trim(),
              description,
              quantity: Number(quantity) || 0,
              location,
              barcode: barcode.trim() || null,
              tag_ids: [],
            });
            await api.items.setImage(created.id, `data:image/jpeg;base64,${photoBase64}`);
            navigation.replace("ItemDetail", { itemId: created.id });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save item");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Text style={styles.primaryButtonText}>{saving ? "Saving…" : "Save Item"}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => setPhotoBase64(null)}>
        <Text style={styles.secondaryButtonText}>Retake Photo</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  camera: { flex: 1 },
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
  form: { padding: 16, gap: 6 },
  preview: { width: "100%", height: 220, borderRadius: 8, marginBottom: 12, backgroundColor: "#eee" },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  helperText: { color: "#666", textAlign: "center" },
  error: { color: "#dc2626" },
  primaryButton: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  secondaryButton: { marginTop: 10, paddingVertical: 12, alignItems: "center" },
  secondaryButtonText: { color: "#2563eb", fontWeight: "600" },
});
