import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { DEFAULT_MEMBER_COLOR } from "../api/memberColors";
import { useAuth } from "../auth/AuthContext";
import { useAppNavigation } from "../navigation";
import { spacing, usePalette } from "../theme";
import { Banner, Button, Card, MemberBadge, Screen, TextField } from "../ui";
import ColorPicker from "../ui/ColorPicker";

// FR4 / FR-1.1a: self-service profile -- name, phone number, password, and
// a color for the initials circle (FR-1.2). Signs straight in on success.
// The first profile ever created becomes the Admin (server side).
export default function RegisterScreen() {
  const navigation = useAppNavigation();
  const { signIn } = useAuth();
  const palette = usePalette();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [color, setColor] = useState(DEFAULT_MEMBER_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "Enter your name.";
    if (phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone number.";
    if (password.length < 8) errors.password = "Use at least 8 characters.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.register(name.trim(), phone.trim(), password, color);
      await signIn(result.token, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={styles.preview}>
          <MemberBadge name={name.trim() || "?"} color={color} size={88} />
          <Text style={[styles.previewName, { color: palette.strongText }]}>{name.trim() || "Your name"}</Text>
          <Text style={[styles.previewHint, { color: palette.mutedText }]}>This is how you'll appear on the schedule.</Text>
        </View>

        {error ? <Banner tone="error">{error}</Banner> : null}

        <Card style={{ gap: spacing.md }}>
          <TextField label="Name" value={name} onChangeText={setName} error={fieldErrors.name} autoComplete="name" />
          <ColorPicker value={color} onChange={setColor} />
          <TextField
            label="Phone number"
            placeholder="You'll sign in with this"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            value={phone}
            onChangeText={setPhone}
            error={fieldErrors.phone}
          />
          <TextField
            label="Password"
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
          />
          <Button title="Create Profile" onPress={submit} loading={loading} style={{ marginTop: spacing.sm }} />
        </Card>

        <Button title="Already have a profile? Sign in" variant="ghost" onPress={() => navigation.navigate("Login")} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.md },
  previewName: { fontSize: 20, fontWeight: "700", marginTop: spacing.sm },
  previewHint: { fontSize: 13 },
});
