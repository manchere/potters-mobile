import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import type { Duty } from "../api/types";
import { formatDate, relativeSunday } from "../format";
import { spacing, usePalette } from "../theme";
import { Badge, Card, DutyPill, MemberBadge, RequestBadge } from "./index";

// One of the member's duties: the duty tag, when, who serves and who backs
// up side by side with their color badges (FR-7.4), and -- if the date
// collides with a day they marked away (FR-4.2) -- a prompt to ask for
// time off, or the status of the request they already sent.
export default function DutyCard({ duty, onPress }: { duty: Duty; onPress?: () => void }) {
  const palette = usePalette();
  const request = duty.non_availability_request;
  const conflict = duty.conflicts_with_calendar && !request;
  return (
    <Card onPress={onPress} accent={conflict ? palette.accentText : undefined}>
      <View style={styles.top}>
        <DutyPill icon={duty.duty_type_icon} name={duty.duty_type_name} />
        <Badge
          label={duty.role === "backup" ? "Backup" : "Serving"}
          color={duty.role === "backup" ? "#6b46c1" : palette.dark ? palette.accentText : palette.primary}
        />
      </View>
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={16} color={palette.mutedText} />
        <Text style={[styles.date, { color: palette.strongText }]}>{formatDate(duty.service_date)}</Text>
        <Text style={[styles.relative, { color: palette.mutedText }]}>· {relativeSunday(duty.service_date)}</Text>
      </View>
      <People duty={duty} />
      {duty.notes ? <Text style={[styles.notes, { color: palette.mutedText }]}>{duty.notes}</Text> : null}
      {conflict ? (
        <View style={[styles.conflict, { backgroundColor: palette.accentBg }]}>
          <Ionicons name="warning" size={16} color={palette.accentText} />
          <Text style={[styles.conflictText, { color: palette.accentText }]}>
            You marked this day as away. Tap to ask for time off.
          </Text>
        </View>
      ) : null}
      {request ? (
        <View style={styles.requestRow}>
          <Text style={{ color: palette.mutedText, fontSize: 13 }}>Time-off request</Text>
          <RequestBadge status={request.status} />
        </View>
      ) : null}
    </Card>
  );
}

function People({ duty }: { duty: Duty }) {
  const palette = usePalette();
  const people: { label: string; name: string | null | undefined; color: string | null | undefined }[] = [
    { label: "Serving", name: duty.member_name, color: duty.member_color },
    { label: "Backup", name: duty.support_member_name, color: duty.support_member_color },
  ];
  return (
    <View style={styles.people}>
      {people.map((person) => (
        <View key={person.label} style={styles.person}>
          {person.name ? (
            <MemberBadge name={person.name} color={person.color} size={22} />
          ) : (
            <View style={[styles.nobody, { borderColor: palette.inputBorder }]} />
          )}
          <Text style={[styles.personText, { color: palette.softText }]} numberOfLines={1}>
            <Text style={{ color: palette.faintText }}>{person.label}: </Text>
            {person.name ?? "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  date: { fontSize: 15, fontWeight: "600" },
  relative: { fontSize: 13 },
  people: { gap: 6 },
  person: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  nobody: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderStyle: "dashed" },
  personText: { flex: 1, fontSize: 14 },
  notes: { fontSize: 13, fontStyle: "italic" },
  conflict: { flexDirection: "row", gap: spacing.sm, alignItems: "center", borderRadius: 8, padding: spacing.sm },
  conflictText: { flex: 1, fontSize: 13, fontWeight: "600" },
  requestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
