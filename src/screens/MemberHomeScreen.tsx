import { Ionicons } from "@expo/vector-icons";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../api/client";
import type { Duty, NonAvailabilityRequest } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { firstName, greeting } from "../format";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { useAppNavigation } from "../navigation";
import { radius, spacing, usePalette } from "../theme";
import { Banner, Card, MemberBadge, SectionTitle, type IconName } from "../ui";
import DutyCard from "../ui/DutyCard";

type HomeData = { duties: Duty[]; requests: NonAvailabilityRequest[] };

// Member Home: who's signed in, what needs their attention (a duty on a day
// they marked away -- FR-4.2), their next duty, and shortcuts -- only the
// ones their access rights allow (desktop Settings > Access Rights).
export default function MemberHomeScreen() {
  const navigation = useAppNavigation();
  const { user, access, refreshAccess } = useAuth();
  const palette = usePalette();
  const { data, loading, refreshing, error, refresh } = useFocusLoad<HomeData>(
    async () => {
      // Rights can change (an Admin edits them, or they follow the coming
      // Sunday's duties), so re-read them along with the rest.
      const [duties, requests] = await Promise.all([
        api.duties.listMine(),
        api.nonAvailabilityRequests.listMine(),
        refreshAccess(),
      ]);
      return { duties, requests };
    },
    { duties: [], requests: [] },
  );

  const conflicts = data.duties.filter((duty) => duty.conflicts_with_calendar && !duty.non_availability_request);
  const pending = data.requests.filter((request) => request.status === "pending").length;
  const next = data.duties[0];
  const openRequestForm = (duty: Duty) =>
    navigation.navigate("NonAvailabilityRequest", {
      dutyId: duty.id,
      dutyTitle: `${duty.duty_type_icon} ${duty.duty_type_name}`,
      serviceDate: duty.service_date,
    });

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <SafeAreaView edges={["top"]} style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>{greeting()},</Text>
            <Text style={styles.name} numberOfLines={1}>
              {user ? firstName(user.name) : "welcome"}
            </Text>
          </View>
          {user ? (
            <Pressable onPress={() => navigation.navigate("Tabs", { screen: "Profile" })}>
              <MemberBadge name={user.name} color={user.color} size={48} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.stats}>
          <Stat value={data.duties.length} label={data.duties.length === 1 ? "upcoming duty" : "upcoming duties"} />
          <View style={styles.statDivider} />
          <Stat value={pending} label={pending === 1 ? "request pending" : "requests pending"} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />}
      >
        {error ? <Banner tone="error">{error}</Banner> : null}

        {conflicts.map((duty) => (
          <Pressable key={duty.id} onPress={() => openRequestForm(duty)}>
            <Banner tone="warning">
              {duty.duty_type_icon} {duty.duty_type_name} falls on a day you marked away. Tap to ask for time off.
            </Banner>
          </Pressable>
        ))}

        <SectionTitle>Your next duty</SectionTitle>
        {next ? (
          <DutyCard duty={next} onPress={next.non_availability_request ? undefined : () => openRequestForm(next)} />
        ) : (
          <Card>
            <Text style={{ color: palette.mutedText, fontSize: 15 }}>
              {loading ? "Loading your duties…" : "You're not on the schedule yet. Enjoy the service!"}
            </Text>
          </Card>
        )}
        {data.duties.length > 1 ? (
          <Pressable onPress={() => navigation.navigate("MyDuties")}>
            <Text style={[styles.seeAll, { color: palette.dark ? palette.accentText : palette.primary }]}>
              See all {data.duties.length} duties
            </Text>
          </Pressable>
        ) : null}

        <SectionTitle>Quick actions</SectionTitle>
        <View style={styles.actions}>
          <Action icon="people-outline" label="Schedule" onPress={() => navigation.navigate("Tabs", { screen: "Schedule" })} />
          <Action icon="calendar-number-outline" label="My duties" onPress={() => navigation.navigate("MyDuties")} />
          <Action icon="calendar-clear-outline" label="Mark Sundays away" onPress={() => navigation.navigate("Tabs", { screen: "Calendar" })} />
          <Action icon="paper-plane-outline" label="My requests" onPress={() => navigation.navigate("MyRequests")} />
          {access.sections.reports.view ? (
            <Action icon="document-text-outline" label="Reports" onPress={() => navigation.navigate("Reports")} />
          ) : null}
          {access.sections.songs.view ? (
            <Action icon="musical-notes-outline" label="Songs" onPress={() => navigation.navigate("Songs")} />
          ) : null}
          {access.sections.inventory.view ? (
            <>
              <Action icon="cube-outline" label="Inventory" onPress={() => navigation.navigate("Tabs", { screen: "Inventory" })} />
              <Action icon="barcode-outline" label="Scan barcode" onPress={() => navigation.navigate("Scan")} />
              <Action icon="search-outline" label="Identify item" onPress={() => navigation.navigate("Identify")} />
            </>
          ) : null}
          {access.sections.inventory.create ? (
            <Action icon="camera-outline" label="Add item" onPress={() => navigation.navigate("AddItem")} />
          ) : null}
          {access.sections.feedback.create || access.sections.feedback.update || access.sections.feedback.delete ? (
            <Action icon="chatbubble-ellipses-outline" label="Feedback" onPress={() => navigation.navigate("Feedback")} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: pressed ? palette.subtle : palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: palette.subtle }]}>
        <Ionicons name={icon} size={22} color={palette.dark ? palette.accentText : palette.primary} />
      </View>
      <Text style={[styles.actionLabel, { color: palette.strongText }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#0b1a33",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingTop: spacing.lg },
  hello: { color: "#cdd5e3", fontSize: 15 },
  name: { color: "#ffffff", fontSize: 26, fontWeight: "800" },
  stats: {
    flexDirection: "row",
    marginTop: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { color: "#f0c75e", fontSize: 24, fontWeight: "800" },
  statLabel: { color: "#cdd5e3", fontSize: 12 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  seeAll: { fontSize: 14, fontWeight: "600", textAlign: "right" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  action: {
    width: "31.5%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
});
