import { RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { Duty } from "../api/types";
import { formatDate, relativeSunday } from "../format";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { useAppNavigation } from "../navigation";
import { spacing, usePalette } from "../theme";
import { Banner, Button, EmptyState } from "../ui";
import DutyCard from "../ui/DutyCard";

// Schedule › My duties.
//
// FR5 / FR-2.1: every upcoming duty the member is on (serving or backup),
// grouped by Sunday, soonest first. FR-4.2/4.3: a duty on a day they marked
// away is flagged, and tapping a duty without a request opens the
// time-off request form.
export default function MyDutiesView() {
  const navigation = useAppNavigation();
  const palette = usePalette();
  const { data: duties, loading, refreshing, error, refresh } = useFocusLoad<Duty[]>(() => api.duties.listMine(), []);

  const sections: { title: string; subtitle: string; data: Duty[] }[] = [];
  for (const duty of duties) {
    const last = sections[sections.length - 1];
    if (last && last.data[0].service_date === duty.service_date) {
      last.data.push(duty);
    } else {
      sections.push({ title: formatDate(duty.service_date), subtitle: relativeSunday(duty.service_date), data: [duty] });
    }
  }

  return (
    <SectionList
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={[styles.content, sections.length === 0 && { flexGrow: 1 }]}
      sections={sections}
      keyExtractor={(duty) => String(duty.id)}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          {error ? <Banner tone="error">{error}</Banner> : null}
          <Button
            title="My time off and requests"
            icon="paper-plane-outline"
            variant="secondary"
            onPress={() => navigation.navigate("Tabs", { screen: "Calendar" })}
          />
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.strongText }]}>{section.title}</Text>
          <Text style={[styles.sectionSubtitle, { color: palette.mutedText }]}>{section.subtitle}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={{ marginBottom: spacing.sm }}>
          <DutyCard
            duty={item}
            onPress={
              item.non_availability_request
                ? undefined
                : () =>
                    navigation.navigate("NonAvailabilityRequest", {
                      dutyId: item.id,
                      dutyTitle: `${item.duty_type_icon} ${item.duty_type_name}`,
                      serviceDate: item.service_date,
                    })
            }
          />
        </View>
      )}
      ListEmptyComponent={
        loading ? null : (
          <EmptyState
            icon="calendar-outline"
            title="No upcoming duties"
            message="When an Admin puts you on the schedule, your duties will show up here."
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionSubtitle: { fontSize: 13 },
});
