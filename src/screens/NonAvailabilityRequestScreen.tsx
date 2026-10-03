import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native";

import { api } from "../api/client";
import { formatDate } from "../format";
import type { RootStackParamList } from "../navigation";
import { spacing, usePalette } from "../theme";
import { Banner, Button, Card, Screen, TextField } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "NonAvailabilityRequest">;

// FR7 / FR-4.3/4.4: ask for time off from one duty. A reason is required;
// the server checks the duty is really the member's (FR-4.1) and files it
// as pending for an Admin to approve or deny.
export default function NonAvailabilityRequestScreen({ route, navigation }: Props) {
  const { dutyId, dutyTitle, serviceDate } = route.params;
  const palette = usePalette();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!message.trim()) {
      setError("Please say why you can't make it.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.nonAvailabilityRequests.create(dutyId, message.trim());
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <Card>
          <Text style={[styles.duty, { color: palette.strongText }]}>{dutyTitle}</Text>
          <Text style={{ color: palette.mutedText, fontSize: 15 }}>{formatDate(serviceDate)}</Text>
        </Card>
        <Banner tone="info">An Admin will see your reason and approve or decline. You can follow it under My Requests.</Banner>
        <TextField
          label="Why can't you make it?"
          placeholder="e.g. I'll be travelling that weekend."
          multiline
          value={message}
          onChangeText={(text) => {
            setMessage(text);
            if (error) setError(null);
          }}
          error={error}
          autoFocus
        />
        <Button title="Send Request" icon="paper-plane" onPress={submit} loading={submitting} style={{ marginTop: spacing.sm }} />
        <Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  duty: { fontSize: 18, fontWeight: "700" },
});
