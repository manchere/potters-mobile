import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";

import { api } from "../api/client";
import type { AvailabilityMark, Duty } from "../api/types";
import { formatDate, toIsoDate } from "../format";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { radius, spacing, usePalette } from "../theme";
import { Banner, Card, Screen, SectionTitle } from "../ui";

type CalendarData = { marks: AvailabilityMark[]; duties: Duty[] };

// FR6 / FR-3.1/3.2: tap days you expect to be away. Informational only --
// no message or approval; it's being scheduled on a marked day that
// triggers the time-off request flow (FR-4.2, flagged on Home/My Duties).
// Days you have a duty get a gold dot, so clashes are easy to spot.
export default function AvailabilityCalendarScreen() {
  const palette = usePalette();
  const { data, setData, refreshing, error, refresh } = useFocusLoad<CalendarData>(
    async () => {
      const [marks, duties] = await Promise.all([api.availability.list(), api.duties.listMine()]);
      return { marks, duties };
    },
    { marks: [], duties: [] },
  );
  const today = toIsoDate(new Date());
  const away = data.marks.map((mark) => mark.date);

  const markedDates: Record<string, object> = {};
  for (const duty of data.duties) {
    markedDates[duty.service_date] = { marked: true, dotColor: "#d4a72c" };
  }
  for (const date of away) {
    markedDates[date] = {
      ...(markedDates[date] ?? {}),
      selected: true,
      selectedColor: palette.error,
      selectedTextColor: "#ffffff",
    };
  }

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

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Banner tone="info">Tap a day you expect to be away from church. Tap it again to undo.</Banner>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Card style={{ padding: spacing.sm }}>
        <Calendar
          key={palette.dark ? "dark" : "light"}
          minDate={today}
          firstDay={1}
          markedDates={markedDates}
          onDayPress={(day: DateData) => toggle(day.dateString)}
          enableSwipeMonths
          theme={{
            calendarBackground: palette.surface,
            dayTextColor: palette.text,
            textDisabledColor: palette.faintText,
            monthTextColor: palette.strongText,
            textMonthFontWeight: "700",
            textSectionTitleColor: palette.mutedText,
            todayTextColor: palette.dark ? palette.accentText : palette.primary,
            arrowColor: palette.dark ? palette.accentText : palette.primary,
          }}
        />
        <View style={styles.legend}>
          <Legend color={palette.error} label="Away" filled />
          <Legend color="#d4a72c" label="Your duty" />
        </View>
      </Card>

      <SectionTitle>Days you'll be away</SectionTitle>
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
              {data.duties.some((duty) => duty.service_date === date) ? (
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
            : { width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginHorizontal: 4 }
        }
      />
      <Text style={{ color: palette.mutedText, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", gap: spacing.lg, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  awayRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md },
  awayDate: { flex: 1, fontSize: 15, fontWeight: "600" },
  clash: { fontSize: 12, fontWeight: "700" },
});
