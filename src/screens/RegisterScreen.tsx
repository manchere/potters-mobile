import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { DEFAULT_MEMBER_COLOR, MEMBER_COLORS } from "../api/memberColors";
import { useAuth } from "../auth/AuthContext";
import { useAppNavigation } from "../navigation";
import { spacing, usePalette } from "../theme";
import { Banner, Button, Card, MemberBadge, Screen, TextField } from "../ui";

// FR4 / FR-1.1a: self-service profile -- name, email, password, and a color
// for the initials circle (FR-1.2). Signs straight in on success.
export default function RegisterScreen() {
  const navigation = useAppNavigation();
  const { signIn } = useAuth();
  const palette = usePalette();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [color, setColor] = useState(DEFAULT_MEMBER_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "Enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) errors.email = "Enter a valid email address.";
    if (password.length < 8) errors.password = "Use at least 8 characters.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.register(name.trim(), email.trim(), password, color);
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
          <TextField label="Full name" placeholder="e.g. Grace Adeyemi" value={name} onChangeText={setName} error={fieldErrors.name} autoComplete="name" />
          <View style={{ gap: spacing.sm }}>
            <Text style={[styles.label, { color: palette.softText }]}>Your color</Text>
            <View style={styles.swatches}>
              {MEMBER_COLORS.map((option) => {
                const selected = option.hex === color;
                return (
                  <Pressable
                    key={option.hex}
                    accessibilityLabel={option.name}
                    accessibilityState={{ selected }}
                    onPress={() => setColor(option.hex)}
                    style={[
                      styles.swatch,
                      { backgroundColor: option.hex, borderColor: selected ? palette.strongText : "transparent" },
                    ]}
                  />
                );
              })}
            </View>
          </View>
          <TextField
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
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
  label: { fontSize: 13, fontWeight: "600" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3 },
});
