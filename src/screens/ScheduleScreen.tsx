import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { Duty, ScheduleDay } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { addDays, formatDate, relativeSunday, toIsoDate, upcomingSunday } from "../format";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { useAppNavigation } from "../navigation";
import { spacing, usePalette } from "../theme";
import { Badge, Banner, Button, Card, DutyPill, EmptyState, MemberBadge, Screen } from "../ui";

// Everyone serving on one Sunday, like the desktop Schedule tab: step a
// week at a time with the arrows. Admins can add a duty, or tap one to
// change who serves, the backup and the notes -- on upcoming Sundays only;
// past ones are read-only for everyone.
export default function ScheduleScreen() {
  const navigation = useAppNavigation();
  const palette = usePalette();
  const { user, access } = useAuth();
  const thisSunday = toIsoDate(upcomingSunday());
  const [date, setDate] = useState(thisSunday);
  const { data, loading, refreshing, error, refresh } = useFocusLoad<ScheduleDay | null>(
    () => api.schedule.forDate(date),
    null,
  );

  // A new Sunday was picked: load it (coming into view loads it already).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    refresh();
  }, [date, refresh]);

  const step = (weeks: number) => setDate((current) => toIsoDate(addDays(new Date(`${current}T00:00:00`), weeks * 7)));
  const day = data?.date === date ? data : null;
  const canEdit = access.can_manage_schedule && (day?.editable ?? date >= toIsoDate(new Date()));
  const tint = palette.dark ? palette.accentText : palette.primary;

  const openDuty = (duty?: Duty) => navigation.navigate("DutyEdit", { date, duty });

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card style={styles.dateCard}>
        <Pressable onPress={() => step(-1)} hitSlop={12} accessibilityLabel="Previous Sunday">
          <Ionicons name="chevron-back" size={24} color={tint} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
          <Text style={[styles.date, { color: palette.strongText }]}>{formatDate(date)}</Text>
          <Text style={{ color: palette.mutedText, fontSize: 13 }}>
            {date < thisSunday ? "Past Sunday" : relativeSunday(date)}
          </Text>
        </View>
        <Pressable onPress={() => step(1)} hitSlop={12} accessibilityLabel="Next Sunday">
          <Ionicons name="chevron-forward" size={24} color={tint} />
        </Pressable>
      </Card>
      {date !== thisSunday ? (
        <Button title="Back to this Sunday" variant="ghost" icon="return-up-back-outline" onPress={() => setDate(thisSunday)} />
      ) : null}

      {error ? <Banner tone="error">{error}</Banner> : null}
      {day && !day.editable && access.can_manage_schedule ? (
        <Banner tone="info" icon="lock-closed">This Sunday has passed, so its schedule can't be changed.</Banner>
      ) : null}

      {canEdit ? <Button title="Add Duty" icon="add" onPress={() => openDuty()} /> : null}

      {day && day.duties.length > 0
        ? day.duties.map((duty) => (
            <ScheduleRow
              key={duty.id}
              duty={duty}
              myId={user?.id ?? -1}
              onPress={canEdit ? () => openDuty(duty) : undefined}
            />
          ))
        : null}
      {day && day.duties.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No one scheduled yet"
          message={canEdit ? "Add the first duty for this Sunday." : "Check back once an Admin has made the schedule."}
        />
      ) : null}
      {!day && loading ? <Text style={{ color: palette.mutedText, textAlign: "center" }}>Loading…</Text> : null}
    </Screen>
  );
}

function ScheduleRow({ duty, myId, onPress }: { duty: Duty; myId: number; onPress?: () => void }) {
  const palette = usePalette();
  const mine = duty.member_id === myId || duty.support_member_id === myId;
  return (
    <Card onPress={onPress} accent={mine ? (palette.dark ? palette.accentText : palette.primary) : undefined}>
      <View style={styles.top}>
        <DutyPill icon={duty.duty_type_icon} name={duty.duty_type_name} />
        {mine ? <Badge label="You" color={palette.dark ? palette.accentText : palette.primary} /> : null}
      </View>
      <View style={styles.person}>
        {duty.member_name ? (
          <MemberBadge name={duty.member_name} color={duty.member_color} size={36} />
        ) : (
          <View style={[styles.nobody, { borderColor: palette.inputBorder }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.name, { color: duty.member_name ? palette.strongText : palette.accentText }]}
            numberOfLines={1}
          >
            {duty.member_name ?? "Nobody assigned"}
          </Text>
          <Text style={{ color: palette.mutedText, fontSize: 13 }} numberOfLines={1}>
            Backup: {duty.support_member_name ?? "—"}
          </Text>
        </View>
        {onPress ? <Ionicons name="create-outline" size={20} color={palette.faintText} /> : null}
      </View>
      {duty.notes ? <Text style={[styles.notes, { color: palette.mutedText }]}>{duty.notes}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  dateCard: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md },
  date: { fontSize: 18, fontWeight: "700" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  person: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  nobody: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed" },
  name: { fontSize: 16, fontWeight: "700" },
  notes: { fontSize: 13, fontStyle: "italic" },
});
