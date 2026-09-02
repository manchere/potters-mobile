import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { avatarUrl } from "../api/avatar";
import * as authStorage from "../api/authStorage";
import { api } from "../api/client";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Register"> & { onAuthenticated: () => void };

export default function RegisterScreen({ navigation, onAuthenticated }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The server always sets avatar_seed = name on register (no photo
  // involved - see FR-1.2), so the preview here mirrors that exactly
  // rather than offering a "shuffle" that wouldn't match what gets saved.
  const previewSeed = name.trim() || "member";

  const submit = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Name, email, and a password of at least 8 characters are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.register(name.trim(), email.trim(), password);
      await authStorage.setSession(result.token, result);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Your Profile</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.avatarRow}>
        <Image source={{ uri: avatarUrl(previewSeed) }} style={styles.avatar} />
      </View>

      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min. 8 characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Creating..." : "Create Profile"}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Already have a profile? Log in</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  avatarRow: { alignItems: "center", marginBottom: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#eee" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: { backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  link: { color: "#2563eb", textAlign: "center", marginTop: 12 },
  error: { color: "#dc2626", marginBottom: 4 },
});
