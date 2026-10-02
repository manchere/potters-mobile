import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../api/client";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "NonAvailabilityRequest">;

// FR-4.3/4.4: a message is required before this can be submitted; the
// backend also enforces FR-4.1 (the duty must actually be the
// Member's) and always inserts as pending (FR-4.4/FR-5).
export default function NonAvailabilityRequestScreen({ route, navigation }: Props) {
  const { dutyId, dutyTitle } = route.params;
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!message.trim()) {
      setError("Please explain why you can't make it.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.nonAvailabilityRequests.create(dutyId, message.trim());
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request time off — {dutyTitle}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={styles.textArea}
        placeholder="Explain why you can't make this duty"
        multiline
        numberOfLines={5}
        value={message}
        onChangeText={setMessage}
      />
      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Submitting..." : "Submit Request"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: "top",
  },
  button: { backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  error: { color: "#dc2626" },
});
