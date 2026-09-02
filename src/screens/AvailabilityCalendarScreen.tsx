import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";

import { api } from "../api/client";
import type { AvailabilityMark } from "../api/types";

// FR-3.1/3.2: marking a date here is informational only (no message, no
// Admin approval) - it's the Admin scheduling a Member on a marked date
// that triggers the formal request flow (FR-4.2), surfaced on
// MyAssignmentsScreen.
export default function AvailabilityCalendarScreen() {
  const [marks, setMarks] = useState<AvailabilityMark[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMarks(await api.availability.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const markedDates = marks.reduce<Record<string, { selected: boolean; selectedColor: string }>>((acc, mark) => {
    acc[mark.date] = { selected: true, selectedColor: "#dc2626" };
    return acc;
  }, {});

  const onDayPress = async (day: DateData) => {
    const alreadyMarked = marks.some((mark) => mark.date === day.dateString);
    setError(null);
    try {
      if (alreadyMarked) {
        setMarks((prev) => prev.filter((mark) => mark.date !== day.dateString));
        await api.availability.unmark(day.dateString);
      } else {
        setMarks((prev) => [...prev, { id: -1, user_id: -1, date: day.dateString }]);
        await api.availability.mark(day.dateString);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update calendar");
      load();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Tap a date to mark it as a day you expect not to be at church.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Calendar markedDates={markedDates} onDayPress={onDayPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  hint: { padding: 16, color: "#666", fontSize: 13 },
  error: { color: "#dc2626", paddingHorizontal: 16, paddingBottom: 8 },
});
