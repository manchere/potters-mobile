import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { AvailabilityMark, Duty } from "../api/types";
import { formatDate, MONTH_NAMES, parseDate, sundaysInMonth, toIsoDate } from "../format";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { radius, spacing, usePalette } from "../theme";
import { Banner, Card, Screen, SectionTitle } from "../ui";

type CalendarData = { marks: AvailabilityMark[]; duties: Duty[] };

const DUTY_GOLD = "#d4a72c";

// FR6 / FR-3.1/3.2: tap the Sundays you expect to be away. Only Sundays are
// shown -- duties only happen on Sundays, so no other day needs marking.
// Informational only -- no message or approval; it's being scheduled on a
// marked day that triggers the time-off request flow (FR-4.2, flagged on
// Home/My Duties). Sundays you have a duty get a gold dot, so clashes are
// easy to spot.
export default function AvailabilityCalendarScreen() {
  const palette = usePalette();
  const now = new Date();
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const { data, setData, refreshing, error, refresh } = useFocusLoad<CalendarData>(
    async () => {
      const [marks, duties] = await Promise.all([api.availability.list(), api.duties.listMine()]);
      return { marks, duties };
    },
    { marks: [], duties: [] },
  );
  const today = toIsoDate(now);
  const away = data.marks.map((mark) => mark.date);
  const dutyDates = new Set(data.duties.map((duty) => duty.service_date));

  const isCurrentMonth = month.year === now.getFullYear() && month.month === now.getMonth();
  const stepMonth = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const next = new Date(year, m + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  const toggle = async (date: string) => {
    if (date < today) return;
    const isAway = away.includes(date);
    setData((current) => ({
      ...current,
      marks: isAway
        ? current.marks.filter((mark) => mark.date !== date)
        : [...current.marks, { id: -1, user_id: -1, date }],
    }));
    try {
      if (isAway) {
        await api.availability.unmark(date);
      } else {
        await api.availability.mark(date);
      }
    } catch {
      refresh();
    }
  };

  const upcomingAway = away.filter((date) => date >= today).sort();
  const tint = palette.dark ? palette.accentText : palette.primary;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Banner tone="info">Tap a Sunday you expect to be away from church. Tap it again to undo.</Banner>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Card style={{ gap: spacing.md }}>
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => stepMonth(-1)}
            disabled={isCurrentMonth}
            hitSlop={10}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={22} color={isCurrentMonth ? palette.faintText : tint} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: palette.strongText }]}>
            {MONTH_NAMES[month.month]} {month.year}
          </Text>
          <Pressable onPress={() => stepMonth(1)} hitSlop={10} accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={22} color={tint} />
          </Pressable>
        </View>

        <View style={styles.sundays}>
          {sundaysInMonth(month.year, month.month).map((date) => {
            const past = date < today;
            const isAway = away.includes(date);
            const hasDuty = dutyDates.has(date);
            return (
              <Pressable
                key={date}
                onPress={() => toggle(date)}
                disabled={past}
                accessibilityRole="button"
                accessibilityState={{ selected: isAway, disabled: past }}
                accessibilityLabel={`${formatDate(date)}${isAway ? ", away" : ""}${hasDuty ? ", you have a duty" : ""}`}
                style={({ pressed }) => [
                  styles.sunday,
                  {
                    backgroundColor: isAway ? palette.error : pressed ? palette.subtle : palette.surfaceAlt,
                    borderColor: isAway ? palette.error : palette.border,
                    opacity: past ? 0.4 : 1,
                  },
                ]}
              >
                <Text style={[styles.sundayDay, { color: isAway ? "#ffffff" : palette.mutedText }]}>SUN</Text>
                <Text style={[styles.sundayDate, { color: isAway ? "#ffffff" : palette.strongText }]}>
                  {parseDate(date).getDate()}
                </Text>
                <Text style={[styles.sundayState, { color: isAway ? "#ffffff" : palette.faintText }]}>
                  {isAway ? "Away" : past ? "Past" : "Here"}
                </Text>
                {hasDuty ? <View style={[styles.dutyDot, { backgroundColor: DUTY_GOLD }]} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legend}>
          <Legend color={palette.error} label="Away" filled />
          <Legend color={DUTY_GOLD} label="Your duty" />
        </View>
      </Card>

      <SectionTitle>Sundays you'll be away</SectionTitle>
      {upcomingAway.length === 0 ? (
        <Text style={{ color: palette.mutedText }}>None marked.</Text>
      ) : (
        <Card style={{ padding: 0, gap: 0 }}>
          {upcomingAway.map((date, index) => (
            <View
              key={date}
              style={[styles.awayRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.divider }]}
            >
              <Text style={[styles.awayDate, { color: palette.strongText }]}>{formatDate(date)}</Text>
              {dutyDates.has(date) ? (
                <Text style={[styles.clash, { color: palette.accentText }]}>Duty that day</Text>
              ) : null}
              <Pressable onPress={() => toggle(date)} accessibilityLabel={`Remove ${formatDate(date)}`} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={palette.faintText} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function Legend({ color, label, filled }: { color: string; label: string; filled?: boolean }) {
  const palette = usePalette();
  return (
    <View style={styles.legendItem}>
      <View
        style={
          filled
            ? { width: 14, height: 14, borderRadius: 7, backgroundColor: color }
            : { width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginHorizontal: 3 }
        }
      />
      <Text style={{ color: palette.mutedText, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xs },
  monthTitle: { fontSize: 17, fontWeight: "700" },
  sundays: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sunday: {
    width: "31%",
    flexGrow: 1,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    gap: 2,
  },
  sundayDay: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  sundayDate: { fontSize: 26, fontWeight: "800" },
  sundayState: { fontSize: 12, fontWeight: "600" },
  dutyDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  legend: { flexDirection: "row", gap: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  awayRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md },
  awayDate: { flex: 1, fontSize: 15, fontWeight: "600" },
  clash: { fontSize: 12, fontWeight: "700" },
});
