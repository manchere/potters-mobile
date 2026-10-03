import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../api/client";
import { DEFAULT_MEMBER_COLOR } from "../api/memberColors";
import { useAuth } from "../auth/AuthContext";
import { useAppNavigation } from "../navigation";
import { radius, spacing, usePalette } from "../theme";
import { Banner, Button, Card, MemberBadge, TextField } from "../ui";
import ColorPicker from "../ui/ColorPicker";

// FR4 / FR-1.1a: self-service profile -- name, phone number, password, and
// a color for the initials circle (FR-1.2). Signs straight in on success.
// The first profile ever created becomes the Admin (server side).
// Same look as the sign-in screen: the app's navy background, logo, and
// the form on a card, sized so it all fits an iPhone 16 (393 x 852) without
// scrolling; the ScrollView is only a fallback for smaller phones or an
// open keyboard.
export default function RegisterScreen() {
  const navigation = useAppNavigation();
  const { signIn } = useAuth();
  const palette = usePalette();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.dark ? palette.background : "#0b1a33" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Image source={require("../../assets/logo.png")} style={styles.logo} />
            <Text style={styles.appName}>Create your profile</Text>
            <Text style={styles.tagline}>This is how you'll appear on the schedule.</Text>
          </View>

          <Card style={styles.card}>
            {error ? <Banner tone="error">{error}</Banner> : null}

            {/* The badge previews the name's initials on the chosen color. */}
            <View style={styles.nameRow}>
              <MemberBadge name={name.trim() || "?"} color={color} size={48} />
              <View style={{ flex: 1 }}>
                <TextField label="Name" value={name} onChangeText={setName} error={fieldErrors.name} autoComplete="name" />
              </View>
            </View>
            <ColorPicker value={color} onChange={setColor} name={name} />
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
            <View>
              <TextField
                label="Password"
                placeholder="At least 8 characters"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                error={fieldErrors.password}
                onSubmitEditing={submit}
                returnKeyType="go"
              />
              <Pressable
                style={[styles.eye, fieldErrors.password ? styles.eyeWithError : null]}
                onPress={() => setShowPassword((shown) => !shown)}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={palette.mutedText} />
              </Pressable>
            </View>
            <Button title="Create Profile" onPress={submit} loading={loading} style={{ marginTop: spacing.xs }} />
          </Card>

          <Pressable onPress={() => navigation.navigate("Login")} style={styles.signInLink}>
            <Text style={styles.signInText}>
              Already have a profile? <Text style={styles.signInStrong}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  brand: { alignItems: "center", gap: spacing.xs },
  logo: { width: 44, height: 44, borderRadius: 12 },
  appName: { color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  tagline: { color: "#cdd5e3", fontSize: 13, textAlign: "center" },
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  nameRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  eye: { position: "absolute", right: 12, bottom: 12, padding: 2 },
  eyeWithError: { bottom: 34 },
  signInLink: { alignItems: "center", paddingVertical: spacing.xs },
  signInText: { color: "#cdd5e3", fontSize: 15 },
  signInStrong: { color: "#f0c75e", fontWeight: "700" },
});
