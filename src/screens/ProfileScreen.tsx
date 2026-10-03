import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../config";
import { useAppNavigation } from "../navigation";
import { spacing, usePalette } from "../theme";
import { Badge, Button, Card, Divider, ListRow, MemberBadge, Screen, SectionTitle } from "../ui";

// The signed-in member, shortcuts, and Sign Out -- the only way to end the
// saved sign-in (FR4: it otherwise lasts across launches).
export default function ProfileScreen() {
  const navigation = useAppNavigation();
  const { user, access, signOut } = useAuth();
  const palette = usePalette();
  const [signingOut, setSigningOut] = useState(false);

  const doSignOut = async () => {
    setSigningOut(true);
    try {
      await api.auth.logout();
    } catch {
      // Best effort: the server forgets the session; sign out locally anyway.
    }
    await signOut();
  };

  const confirmSignOut = () => {
    if (Platform.OS === "web") {
      doSignOut();
      return;
    }
    Alert.alert("Sign out?", "You'll need your phone number and password to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: doSignOut },
    ]);
  };

  return (
    <Screen>
      {user ? (
        <Card style={styles.profile}>
          <MemberBadge name={user.name} color={user.color} size={80} />
          <Text style={[styles.name, { color: palette.strongText }]}>{user.name}</Text>
          <Text style={{ color: palette.mutedText, fontSize: 15 }}>{user.phone}</Text>
          {user.is_admin ? <Badge label="Admin" color={palette.dark ? palette.accentText : palette.primary} /> : null}
        </Card>
      ) : null}

      <SectionTitle>My schedule</SectionTitle>
      <Card style={{ padding: 0, gap: 0 }}>
        <ListRow
          icon="calendar-number-outline"
          title="My duties"
          onPress={() => navigation.navigate("Tabs", { screen: "Schedule", params: { view: "mine" } })}
        />
        <Divider />
        <ListRow
          icon="calendar-clear-outline"
          title="Time off"
          subtitle="Sundays I'll be away and my requests"
          onPress={() => navigation.navigate("Tabs", { screen: "Calendar" })}
        />
      </Card>

      <SectionTitle>Church</SectionTitle>
      <Card style={{ padding: 0, gap: 0 }}>
        <ListRow icon="people-outline" title="Schedule" onPress={() => navigation.navigate("Tabs", { screen: "Schedule" })} />
        {access.sections.reports.view ? (
          <>
            <Divider />
            <ListRow
              icon="document-text-outline"
              title="Reports"
              onPress={() => navigation.navigate("Tabs", { screen: "Schedule", params: { view: "history" } })}
            />
          </>
        ) : null}
        {access.sections.songs.view ? (
          <>
            <Divider />
            <ListRow icon="musical-notes-outline" title="Songs" onPress={() => navigation.navigate("Songs")} />
          </>
        ) : null}
        {access.sections.feedback.create || access.sections.feedback.update || access.sections.feedback.delete ? (
          <>
            <Divider />
            <ListRow icon="chatbubble-ellipses-outline" title="Feedback" onPress={() => navigation.navigate("Feedback")} />
          </>
        ) : null}
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card style={{ padding: 0, gap: 0 }}>
        <ListRow
          icon="color-palette-outline"
          title="Appearance"
          subtitle={`Follows your phone: ${palette.dark ? "Navy & Gold (dark)" : "Light"}`}
        />
        <Divider />
        <ListRow icon="server-outline" title="Server" subtitle={API_BASE_URL} />
      </Card>
      <Text style={[styles.note, { color: palette.faintText }]}>
        To change your name or color, ask an Admin to edit your profile on the desktop app.
      </Text>

      <View style={{ flex: 1 }} />
      <Button title="Sign Out" icon="log-out-outline" variant="danger" onPress={confirmSignOut} loading={signingOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.xs },
  name: { fontSize: 22, fontWeight: "800", marginTop: spacing.sm },
  note: { fontSize: 12, textAlign: "center" },
});
