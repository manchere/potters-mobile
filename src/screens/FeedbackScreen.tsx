import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import type { Feedback, FeedbackKind } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { formatDate } from "../format";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { radius, spacing, usePalette } from "../theme";
import { Badge, Banner, Button, Card, EmptyState, Screen, SectionTitle, TextField, type IconName } from "../ui";
import { confirmAction } from "../ui/confirm";

const KINDS: { kind: FeedbackKind; label: string; icon: IconName; hint: string }[] = [
  { kind: "bug", label: "Problem", icon: "bug-outline", hint: "Something isn't working" },
  { kind: "feature", label: "Idea", icon: "bulb-outline", hint: "Something you'd like added" },
  { kind: "profile", label: "Profile", icon: "person-outline", hint: "A change to your profile" },
];

// Like the desktop Feedback tab: anyone with Feedback "create" can send a
// problem, an idea or a profile change; those with "update" or "delete"
// also see everyone's requests and can mark them done or delete them.
export default function FeedbackScreen() {
  const palette = usePalette();
  const { access } = useAuth();
  const rights = access.sections.feedback;
  const canHandle = rights.update || rights.delete;

  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: requests, setData, refreshing, error, refresh } = useFocusLoad<Feedback[]>(
    () => (canHandle ? api.feedback.list() : Promise.resolve([])),
    [],
  );

  const send = async () => {
    if (!subject.trim()) {
      setSubjectError("Say in a few words what it's about.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await api.feedback.send(kind, subject.trim(), details.trim());
      setSubject("");
      setDetails("");
      setSent(true);
      if (canHandle) refresh();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't send your feedback.");
    } finally {
      setSending(false);
    }
  };

  const toggleDone = async (request: Feedback) => {
    setData((current) => current.map((r) => (r.id === request.id ? { ...r, done: !r.done } : r)));
    try {
      await api.feedback.setDone(request.id, !request.done);
    } catch {
      refresh();
    }
  };

  const remove = async (request: Feedback) => {
    if (!(await confirmAction("Delete this request?", `"${request.subject}" will be deleted.`, "Delete"))) return;
    setData((current) => current.filter((r) => r.id !== request.id));
    try {
      await api.feedback.remove(request.id);
    } catch {
      refresh();
    }
  };

  if (!rights.create && !canHandle) {
    return (
      <Screen>
        <EmptyState icon="lock-closed-outline" title="Feedback is turned off" message="Ask an Admin if you'd like to send feedback." />
      </Screen>
    );
  }

  const tint = palette.dark ? palette.accentText : palette.primary;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen refreshing={refreshing} onRefresh={canHandle ? refresh : undefined}>
        {rights.create ? (
          <>
            {sent ? <Banner tone="success">Thanks! Your feedback was sent to the Admins.</Banner> : null}
            {sendError ? <Banner tone="error">{sendError}</Banner> : null}
            <Card style={{ gap: spacing.md }}>
              <View style={styles.kinds}>
                {KINDS.map((option) => {
                  const active = option.kind === kind;
                  return (
                    <Pressable
                      key={option.kind}
                      onPress={() => setKind(option.kind)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.kind,
                        { borderColor: active ? tint : palette.inputBorder, backgroundColor: active ? `${tint}18` : palette.surface },
                      ]}
                    >
                      <Ionicons name={option.icon} size={22} color={active ? tint : palette.mutedText} />
                      <Text style={[styles.kindLabel, { color: active ? tint : palette.softText }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ color: palette.mutedText, fontSize: 13 }}>{KINDS.find((k) => k.kind === kind)?.hint}</Text>
              <TextField
                label="Subject"
                placeholder="In a few words"
                value={subject}
                onChangeText={(text) => {
                  setSubject(text);
                  setSubjectError(null);
                  setSent(false);
                }}
                error={subjectError}
              />
              <TextField
                label="Details (optional)"
                placeholder="What happened, or what you'd like"
                value={details}
                onChangeText={setDetails}
                multiline
              />
              <Button title="Send Feedback" icon="paper-plane-outline" onPress={send} loading={sending} />
            </Card>
          </>
        ) : null}

        {canHandle ? (
          <>
            <SectionTitle>Requests</SectionTitle>
            {error ? <Banner tone="error">{error}</Banner> : null}
            {requests.length === 0 ? (
              <Text style={{ color: palette.mutedText }}>No requests yet.</Text>
            ) : (
              requests.map((request) => (
                <Card key={request.id} style={request.done ? { opacity: 0.6 } : undefined}>
                  <View style={styles.requestTop}>
                    <Badge label={KINDS.find((k) => k.kind === request.kind)?.label ?? request.kind} color={tint} />
                    {request.done ? <Badge label="Done" color={palette.success} /> : null}
                  </View>
                  <Text style={[styles.subject, { color: palette.strongText }]}>{request.subject}</Text>
                  {request.details ? <Text style={{ color: palette.softText, fontSize: 14 }}>{request.details}</Text> : null}
                  <Text style={{ color: palette.faintText, fontSize: 12 }}>
                    {request.member_name ?? "Someone"}
                    {request.created_at ? ` · ${formatDate(request.created_at.slice(0, 10))}` : ""}
                  </Text>
                  <View style={styles.requestActions}>
                    {rights.update ? (
                      <Button
                        title={request.done ? "Reopen" : "Mark Done"}
                        variant="secondary"
                        icon={request.done ? "refresh-outline" : "checkmark-done-outline"}
                        onPress={() => toggleDone(request)}
                        style={{ flex: 1 }}
                      />
                    ) : null}
                    {rights.delete ? (
                      <Button title="Delete" variant="danger" icon="trash-outline" onPress={() => remove(request)} style={{ flex: 1 }} />
                    ) : null}
                  </View>
                </Card>
              ))
            )}
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kinds: { flexDirection: "row", gap: spacing.sm },
  kind: { flex: 1, alignItems: "center", gap: 4, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: spacing.md },
  kindLabel: { fontSize: 13, fontWeight: "700" },
  requestTop: { flexDirection: "row", gap: spacing.sm },
  subject: { fontSize: 16, fontWeight: "700" },
  requestActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
