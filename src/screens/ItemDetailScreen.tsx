import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { Item } from "../api/types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ItemDetail">;

export default function ItemDetailScreen({ route }: Props) {
  const { itemId } = route.params;
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api.items
        .get(itemId)
        .then((result) => {
          if (!cancelled) setItem(result);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load item");
        });
      return () => {
        cancelled = true;
      };
    }, [itemId]),
  );

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!item) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {item.image_url ? (
        <Image source={{ uri: api.items.imageUrl(item.id) }} style={styles.image} />
      ) : null}
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.status}>{item.status}</Text>
      {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Quantity</Text>
        <Text style={styles.rowValue}>{item.quantity}</Text>
      </View>
      {item.location ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Location</Text>
          <Text style={styles.rowValue}>{item.location}</Text>
        </View>
      ) : null}
      {item.barcode ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Barcode</Text>
          <Text style={styles.rowValue}>{item.barcode}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 4 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: 240, borderRadius: 8, marginBottom: 12, backgroundColor: "#eee" },
  name: { fontSize: 22, fontWeight: "700" },
  status: { fontSize: 13, color: "#666", textTransform: "capitalize", marginBottom: 8 },
  description: { fontSize: 15, color: "#333", marginBottom: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowLabel: { color: "#666" },
  rowValue: { fontWeight: "600" },
  error: { color: "#dc2626" },
});
