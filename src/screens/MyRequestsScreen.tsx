import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { NonAvailabilityRequest } from "../api/types";
import { formatDate } from "../format";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { spacing, usePalette } from "../theme";
import { Banner, Card, DutyPill, EmptyState, RequestBadge } from "../ui";

// FR8 / FR-4.5: every time-off request the member has sent, newest first,
// with the duty it's about and its status (pending / approved / denied).
export default function MyRequestsScreen() {
  const palette = usePalette();
  const { data: requests, loading, refreshing, error, refresh } = useFocusLoad<NonAvailabilityRequest[]>(
    () => api.nonAvailabilityRequests.listMine(),
    [],
  );

  return (
    <FlatList
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={[styles.content, requests.length === 0 && { flexGrow: 1 }]}
      data={requests}
      keyExtractor={(request) => String(request.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />}
      ListHeaderComponent={error ? <Banner tone="error">{error}</Banner> : null}
      renderItem={({ item }) => (
        <Card>
          <View style={styles.top}>
            {item.duty_type_name ? <DutyPill icon={item.duty_type_icon ?? ""} name={item.duty_type_name} /> : <View />}
            <RequestBadge status={item.status} />
          </View>
          {item.service_date ? (
            <Text style={[styles.date, { color: palette.strongText }]}>{formatDate(item.service_date)}</Text>
          ) : null}
          <Text style={[styles.message, { color: palette.softText }]}>“{item.message}”</Text>
          <Text style={[styles.status, { color: palette.mutedText }]}>
            {item.status === "pending"
              ? "Waiting for an Admin to reply."
              : item.status === "approved"
                ? "Approved — you're excused from this duty."
                : "Not approved — you're still expected to serve."}
          </Text>
        </Card>
      )}
      ListEmptyComponent={
        loading ? null : (
          <EmptyState
            icon="paper-plane-outline"
            title="No requests yet"
            message="If you can't make a duty, open it from My Duties to ask for time off."
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontSize: 15, fontWeight: "600" },
  message: { fontSize: 15, lineHeight: 21 },
  status: { fontSize: 13 },
});
