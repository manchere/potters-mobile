import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, SectionList, Share, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../api/client";
import type { ReportRow } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { formatDate, monthsAgo, toIsoDate } from "../format";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { radius, spacing, usePalette } from "../theme";
import { Badge, Banner, Button, EmptyState } from "../ui";

const RANGES = [
  { label: "Last month", months: 1 },
  { label: "Last 3 months", months: 3 },
  { label: "Last year", months: 12 },
];

// Shown next to who served only when their availability mattered that
// Sunday -- as on the desktop report. A denied request isn't flagged.
function availabilityNote(row: ReportRow): string | null {
  if (row.request_status === "approved") return "Time off approved";
  if (row.request_status === "pending") return "Asked for time off";
  if (row.member_marked_unavailable) return "Marked away";
  return null;
}

// Schedule › History (members with the Reports "view" right).
//
// "Who did what" on past Sundays, like the desktop Reports tab: pick a
// range, optionally search for a member or duty. Members with the Reports
// "create" right (Save Report on the desktop) can share it as text.
export default function ReportsView() {
  const palette = usePalette();
  const { access } = useAuth();
  const [months, setMonths] = useState(3);
  const [query, setQuery] = useState("");
  const from = monthsAgo(months);
  const to = toIsoDate(new Date());
  const { data: rows, loading, refreshing, error, refresh } = useFocusLoad<ReportRow[]>(() => api.reports.schedule(from, to), []);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    refresh();
  }, [months, refresh]);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = rows.filter((row) => {
    const text = `${row.duty_type_name} ${row.member_name ?? ""} ${row.support_member_name ?? ""}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  // Rows come newest Sunday first; keep that order.
  const sections: { title: string; data: ReportRow[] }[] = [];
  for (const row of shown) {
    const last = sections[sections.length - 1];
    if (last && last.data[0].service_date === row.service_date) {
      last.data.push(row);
    } else {
      sections.push({ title: row.service_date, data: [row] });
    }
  }

  const canShare = access.sections.reports.create && sections.length > 0;

  return (
    <SectionList
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={[styles.content, sections.length === 0 && { flexGrow: 1 }]}
      sections={sections}
      keyExtractor={(row) => String(row.duty_id)}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {RANGES.map((range) => {
              const active = range.months === months;
              const tint = palette.dark ? palette.accentText : palette.primary;
              return (
                <Pressable
                  key={range.months}
                  onPress={() => setMonths(range.months)}
                  style={[
                    styles.chip,
                    { borderColor: active ? tint : palette.inputBorder, backgroundColor: active ? `${tint}22` : palette.surface },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? tint : palette.softText }]}>{range.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={[styles.search, { backgroundColor: palette.input, borderColor: palette.inputBorder }]}>
            <Ionicons name="search" size={18} color={palette.faintText} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Filter by member or duty"
              placeholderTextColor={palette.faintText}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          {error ? <Banner tone="error">{error}</Banner> : null}
          {sections.length > 0 ? (
            <Text style={{ color: palette.mutedText, fontSize: 13 }}>
              {sections.length} {sections.length === 1 ? "Sunday" : "Sundays"} · {formatDate(from)} – {formatDate(to)}
            </Text>
          ) : null}
          {canShare ? (
            <Button title="Share Report" icon="share-outline" variant="secondary" onPress={() => shareReport(sections)} />
          ) : null}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionTitle, { color: palette.strongText }]}>{formatDate(section.title)}</Text>
      )}
      renderItem={({ item: row, index, section }) => (
        <View
          style={[
            styles.row,
            { backgroundColor: palette.surface, borderColor: palette.border },
            index === 0 && styles.firstRow,
            index === section.data.length - 1 && styles.lastRow,
            index > 0 && { borderTopWidth: 0 },
          ]}
        >
          <Text style={[styles.duty, { color: palette.strongText }]} numberOfLines={1}>
            {row.duty_type_icon} {row.duty_type_name}
          </Text>
          <View style={styles.peopleRow}>
            <Text
              style={[styles.serving, { color: row.member_name ? palette.softText : palette.accentText }]}
              numberOfLines={1}
            >
              {row.member_name ?? "Nobody assigned"}
            </Text>
            {availabilityNote(row) ? <Badge label={availabilityNote(row)!} color={palette.accentText} /> : null}
          </View>
          {row.support_member_name ? (
            <Text style={{ color: palette.mutedText, fontSize: 13 }}>Backup: {row.support_member_name}</Text>
          ) : null}
          {row.notes ? <Text style={[styles.notes, { color: palette.mutedText }]}>{row.notes}</Text> : null}
        </View>
      )}
      ListEmptyComponent={
        loading ? null : (
          <EmptyState
            icon="document-text-outline"
            title={rows.length === 0 ? "No schedules in this range" : "Nothing matches"}
            message={rows.length === 0 ? "Try a longer range." : "Try a different name or duty."}
          />
        )
      }
    />
  );
}

function shareReport(sections: { title: string; data: ReportRow[] }[]) {
  const lines: string[] = ["Sunday Serving Report", ""];
  for (const section of sections) {
    lines.push(formatDate(section.title));
    for (const row of section.data) {
      let line = `  ${row.duty_type_icon} ${row.duty_type_name}: ${row.member_name ?? "Nobody assigned"}`;
      if (row.support_member_name) line += ` (backup: ${row.support_member_name})`;
      const note = availabilityNote(row);
      if (note) line += ` [${note}]`;
      if (row.notes) line += ` - ${row.notes}`;
      lines.push(line);
    }
    lines.push("");
  }
  Share.share({ title: "Sunday Serving Report", message: lines.join("\n").trimEnd() });
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: "600" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: 4 },
  firstRow: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  lastRow: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  duty: { fontSize: 15, fontWeight: "700" },
  peopleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  serving: { fontSize: 15, fontWeight: "600" },
  notes: { fontSize: 13, fontStyle: "italic" },
});
