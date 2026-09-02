import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { api } from "../api/client";
import type { Item } from "../api/types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ItemList">;

export default function ItemListScreen({ navigation }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.items.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Scan")}>
          <Text style={styles.actionButtonText}>Scan Barcode</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Identify")}>
          <Text style={styles.actionButtonText}>Identify by Photo</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => navigation.navigate("AddItem")}
        >
          <Text style={styles.actionButtonTextPrimary}>+ Add Item</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={items.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No items yet.</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSubtitle}>
                Qty {item.quantity} · {item.status}
                {item.location ? ` · ${item.location}` : ""}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  actions: { flexDirection: "row", gap: 8, padding: 16 },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  actionButtonPrimary: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  actionButtonText: { fontWeight: "600", color: "#111", fontSize: 13, textAlign: "center" },
  actionButtonTextPrimary: { fontWeight: "600", color: "#fff", fontSize: 13, textAlign: "center" },
  error: { color: "#dc2626", paddingHorizontal: 16, paddingBottom: 8 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowText: { gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowSubtitle: { fontSize: 13, color: "#666" },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  empty: { textAlign: "center", color: "#999" },
});
