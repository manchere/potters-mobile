import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getQuickActions, setQuickActions } from "../api/authStorage";
import { api } from "../api/client";
import type { Duty, NonAvailabilityRequest } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { firstName, greeting } from "../format";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { useAppNavigation, type ScheduleView } from "../navigation";
import { radius, spacing, usePalette } from "../theme";
import { Banner, Card, MemberBadge, SectionTitle, type IconName } from "../ui";
import DutyCard from "../ui/DutyCard";

type HomeData = { duties: Duty[]; requests: NonAvailabilityRequest[] };

// On Home until the member changes their shortcuts (each still only when
// their rights allow it). Everything else in the list can be added.
const DEFAULT_ACTIONS = ["schedule", "timeOff", "inventory", "feedback"];

// Member Home: who's signed in, what needs their attention (a duty on a day
// they marked away -- FR-4.2), their next duty, and shortcuts -- only the
// ones their access rights allow (desktop Settings > Access Rights). Each
// member picks which shortcuts are on Home (Edit), remembered on the phone
// per member; until they do, Home shows DEFAULT_ACTIONS.
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

  // The shortcuts the member chose (null: the defaults), and whether
  // they're choosing them now.
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (user) {
      getQuickActions(user.id).then(setChosen);
    }
  }, [user?.id]);
  const onHome = chosen ?? DEFAULT_ACTIONS;
  const toggle = (key: string) => {
    const next = onHome.includes(key) ? onHome.filter((other) => other !== key) : [...onHome, key];
    setChosen(next);
    if (user) {
      setQuickActions(user.id, next);
    }
  };

  // Every shortcut this member's rights allow, in the order Home shows them.
  const schedule = (view: ScheduleView) => () => navigation.navigate("Tabs", { screen: "Schedule", params: { view } });
  const actions: { key: string; icon: IconName; label: string; onPress: () => void }[] = [
    { key: "schedule", icon: "people-outline", label: "Sunday schedule", onPress: schedule("sunday") },
    { key: "myDuties", icon: "person-outline", label: "My duties", onPress: schedule("mine") },
  ];
  if (access.sections.reports.view) {
    actions.push({ key: "history", icon: "time-outline", label: "Schedule history", onPress: schedule("history") });
  }
  actions.push(
    { key: "timeOff", icon: "calendar-clear-outline", label: "Time off", onPress: () => navigation.navigate("Tabs", { screen: "Calendar", params: {} }) },
    {
      key: "requests",
      icon: "paper-plane-outline",
      label: "My time-off requests",
      onPress: () => navigation.navigate("Tabs", { screen: "Calendar", params: { focus: "requests" } }),
    },
  );
  if (access.sections.inventory.view) {
    actions.push(
      { key: "inventory", icon: "cube-outline", label: "Inventory", onPress: () => navigation.navigate("Tabs", { screen: "Inventory" }) },
      { key: "findItem", icon: "scan-outline", label: "Find item", onPress: () => navigation.navigate("FindItem") },
    );
  }
  if (access.sections.inventory.create) {
    actions.push({ key: "addItem", icon: "camera-outline", label: "Add item", onPress: () => navigation.navigate("AddItem") });
  }
  if (access.sections.songs.view) {
    actions.push({ key: "songs", icon: "musical-notes-outline", label: "Songs", onPress: () => navigation.navigate("Songs") });
  }
  if (access.sections.feedback.create || access.sections.feedback.update || access.sections.feedback.delete) {
    actions.push({ key: "feedback", icon: "chatbubble-ellipses-outline", label: "Feedback", onPress: () => navigation.navigate("Feedback") });
  }
  const homeActions = actions.filter((action) => onHome.includes(action.key));
  const moreActions = actions.filter((action) => !onHome.includes(action.key));
  const tint = palette.dark ? palette.accentText : palette.primary;

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
          <Pressable onPress={() => navigation.navigate("Tabs", { screen: "Schedule", params: { view: "mine" } })}>
            <Text style={[styles.seeAll, { color: tint }]}>
              See all {data.duties.length} duties
            </Text>
          </Pressable>
        ) : null}

        <SectionTitle
          right={
            <Pressable onPress={() => setEditing(!editing)} hitSlop={10} accessibilityRole="button">
              <Text style={[styles.edit, { color: tint }]}>{editing ? "Done" : "Edit"}</Text>
            </Pressable>
          }
        >
          Quick actions
        </SectionTitle>
        {homeActions.length > 0 ? (
          <View style={styles.actions}>
            {homeActions.map((action) => (
              <Action
                key={action.key}
                icon={action.icon}
                label={action.label}
                mark={editing ? "remove" : undefined}
                onPress={editing ? () => toggle(action.key) : action.onPress}
              />
            ))}
          </View>
        ) : (
          <Text style={{ color: palette.mutedText, fontSize: 14 }}>No shortcuts on Home. Tap Edit to add some.</Text>
        )}
        {editing ? (
          <>
            <Text style={{ color: palette.mutedText, fontSize: 13 }}>
              {moreActions.length > 0
                ? "Tap − to remove a shortcut from Home, or + below to add one."
                : "Every shortcut you can use is on Home. Tap − to remove one."}
            </Text>
            {moreActions.length > 0 ? (
              <>
                <SectionTitle>More shortcuts</SectionTitle>
                <View style={styles.actions}>
                  {moreActions.map((action) => (
                    <Action
                      key={action.key}
                      icon={action.icon}
                      label={action.label}
                      mark="add"
                      onPress={() => toggle(action.key)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
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

// A shortcut tile. While editing, a corner mark says what a tap does:
// remove it from Home, or add it (those tiles are faded).
function Action({
  icon,
  label,
  onPress,
  mark,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  mark?: "add" | "remove";
}) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={mark === "add" ? `Add ${label} to Home` : mark === "remove" ? `Remove ${label} from Home` : label}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: pressed ? palette.subtle : palette.surface, borderColor: palette.border },
        mark === "add" && { opacity: 0.6, borderStyle: "dashed" },
      ]}
    >
      {mark ? (
        <Ionicons
          name={mark === "add" ? "add-circle" : "remove-circle"}
          size={20}
          color={mark === "add" ? (palette.dark ? palette.accentText : palette.primary) : palette.error}
          style={styles.editMark}
        />
      ) : null}
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
  edit: { fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  action: {
    width: "31.5%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  editMark: { position: "absolute", top: 6, right: 6 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
});
