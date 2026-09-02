import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { roleIcon, roleLabel } from "../api/roleDisplay";
import type { Assignment } from "../api/types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "MyAssignments">;

// FR-2.1 (view upcoming assignments) + FR-4.2 (surface the auto-flagged
// calendar conflict and let the Member jump straight into filing a formal
// request for it, per FR-4.3/4.4).
export default function MyAssignmentsScreen({ navigation }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssignments(await api.assignments.listMine());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments");
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
        data={assignments}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={assignments.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No upcoming assignments.</Text> : null}
        renderItem={({ item }) => {
          const hasRequest = !!item.non_availability_request;
          return (
            <Pressable
              style={styles.row}
              disabled={hasRequest}
              onPress={() =>
                navigation.navigate("NonAvailabilityRequest", {
                  assignmentId: item.id,
                  assignmentTitle: `${roleIcon(item.role)} ${roleLabel(item.role)}`,
                })
              }
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>
                  {roleIcon(item.role)} {roleLabel(item.role)}
                </Text>
                <Text style={styles.rowSubtitle}>{item.service_date}</Text>
                {item.conflicts_with_calendar && !hasRequest ? (
                  <Text style={styles.conflict}>
                    You marked this date unavailable — tap to request time off for this assignment.
                  </Text>
                ) : null}
                {hasRequest ? (
                  <Text style={styles.requestStatus}>Request {item.non_availability_request!.status}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  error: { color: "#dc2626", padding: 16 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowText: { gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowSubtitle: { fontSize: 13, color: "#666" },
  conflict: { fontSize: 12, color: "#b45309", marginTop: 2 },
  requestStatus: { fontSize: 12, color: "#2563eb", marginTop: 2, textTransform: "capitalize" },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  empty: { textAlign: "center", color: "#999" },
});
