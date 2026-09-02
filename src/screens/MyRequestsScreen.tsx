import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { NonAvailabilityRequest } from "../api/types";

// FR-4.5: status of every request the Member has submitted.
export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<NonAvailabilityRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await api.nonAvailabilityRequests.listMine());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={requests.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No requests submitted yet.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.status}>{item.status}</Text>
            <Text style={styles.message}>{item.message}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  error: { color: "#dc2626", padding: 16 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eee", gap: 4 },
  status: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", color: "#2563eb" },
  message: { fontSize: 15, color: "#333" },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  empty: { textAlign: "center", color: "#999" },
});
