import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as authStorage from "../api/authStorage";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../config";
import { useAppNavigation } from "../navigation";
import { radius, spacing, usePalette } from "../theme";
import { Banner, Button, Card, TextField } from "../ui";

// Shown only when there's no saved sign-in (FR4): after signing in once the
// app opens straight on Home until the member signs out.
export default function LoginScreen() {
  const navigation = useAppNavigation();
  const { signIn, notice } = useAuth();
  const palette = usePalette();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authStorage.getLastPhone().then((last) => {
      if (last) setPhone((current) => current || last);
    });
  }, []);

  const submit = async () => {
    if (!phone.trim() || !password) {
      setError("Enter your phone number and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.login(phone.trim(), password);
      await signIn(result.token, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message === "invalid phone or password" ? "That phone number and password don't match." : message || "Couldn't sign in.");
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
            <Text style={styles.appName}>Potters Portal</Text>
            <Text style={styles.tagline}>Your duties, availability and church inventory</Text>
          </View>

          <Card style={styles.card}>
            <Text style={[styles.title, { color: palette.strongText }]}>Sign in</Text>
            {notice ? <Banner tone="warning">{notice}</Banner> : null}
            {error ? <Banner tone="error">{error}</Banner> : null}
            <TextField
              label="Phone number"
              placeholder="Your phone number"
              autoComplete="tel"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              value={phone}
              onChangeText={setPhone}
            />
            <View>
              <TextField
                label="Password"
                placeholder="Your password"
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={submit}
                returnKeyType="go"
              />
              <Pressable
                style={styles.eye}
                onPress={() => setShowPassword((shown) => !shown)}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={palette.mutedText} />
              </Pressable>
            </View>
            <Button title="Sign In" onPress={submit} loading={loading} style={{ marginTop: spacing.sm }} />
            <Text style={[styles.stay, { color: palette.mutedText }]}>
              You'll stay signed in on this phone until you sign out.
            </Text>
          </Card>

          <Pressable onPress={() => navigation.navigate("Register")} style={styles.registerLink}>
            <Text style={styles.registerText}>
              New here? <Text style={styles.registerStrong}>Create your profile</Text>
            </Text>
          </Pressable>
          <Text style={styles.server}>{API_BASE_URL}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  brand: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  logo: { width: 84, height: 84, borderRadius: 20 },
  appName: { color: "#ffffff", fontSize: 26, fontWeight: "800", letterSpacing: 0.3 },
  tagline: { color: "#cdd5e3", fontSize: 14, textAlign: "center" },
  card: { gap: spacing.md, padding: spacing.xl, borderRadius: radius.lg },
  title: { fontSize: 20, fontWeight: "700" },
  eye: { position: "absolute", right: 12, bottom: 12, padding: 2 },
  stay: { fontSize: 12, textAlign: "center" },
  registerLink: { alignItems: "center", paddingVertical: spacing.sm },
  registerText: { color: "#cdd5e3", fontSize: 15 },
  registerStrong: { color: "#f0c75e", fontWeight: "700" },
  server: { color: "#5d6c87", fontSize: 11, textAlign: "center" },
});
