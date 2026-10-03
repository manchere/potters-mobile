import { StyleSheet, Text, View } from "react-native";

import type { NonAvailabilityRequest } from "../api/types";
import { formatDate } from "../format";
import { usePalette } from "../theme";
import { Card, DutyPill, RequestBadge } from "./index";

// FR8 / FR-4.5: one time-off request -- the duty it's about, the member's
// reason, and where it stands (pending / approved / denied).
export default function RequestCard({ request }: { request: NonAvailabilityRequest }) {
  const palette = usePalette();
  return (
    <Card>
      <View style={styles.top}>
        {request.duty_type_name ? <DutyPill icon={request.duty_type_icon ?? ""} name={request.duty_type_name} /> : <View />}
        <RequestBadge status={request.status} />
      </View>
      {request.service_date ? (
        <Text style={[styles.date, { color: palette.strongText }]}>{formatDate(request.service_date)}</Text>
      ) : null}
      <Text style={[styles.message, { color: palette.softText }]}>“{request.message}”</Text>
      <Text style={[styles.status, { color: palette.mutedText }]}>
        {request.status === "pending"
          ? "Waiting for an Admin to reply."
          : request.status === "approved"
            ? "Approved — you're excused from this duty."
            : "Not approved — you're still expected to serve."}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontSize: 15, fontWeight: "600" },
  message: { fontSize: 15, lineHeight: 21 },
  status: { fontSize: 13 },
});
