import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { avatarUrl } from "../api/avatar";
import * as authStorage from "../api/authStorage";
import { api } from "../api/client";
import type { User } from "../api/types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "MemberHome"> & { onLogout: () => void };

export default function MemberHomeScreen({ navigation, onLogout }: Props) {
  const [user, setUser] = useState<User | null>(null);

  useFocusEffect(
    useCallback(() => {
      authStorage.getUser().then(setUser);
    }, []),
  );

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Best-effort server-side revoke; log out locally regardless.
    }
    await authStorage.clearSession();
    onLogout();
  };

  return (
    <View style={styles.container}>
      {user ? (
        <View style={styles.profile}>
          <Image source={{ uri: avatarUrl(user.avatar_seed) }} style={styles.avatar} />
          <Text style={styles.name}>{user.name}</Text>
        </View>
      ) : null}

      <Pressable style={styles.menuItem} onPress={() => navigation.navigate("MyAssignments")}>
        <Text style={styles.menuItemText}>My Assignments</Text>
      </Pressable>
      <Pressable style={styles.menuItem} onPress={() => navigation.navigate("AvailabilityCalendar")}>
        <Text style={styles.menuItemText}>Availability Calendar</Text>
      </Pressable>
      <Pressable style={styles.menuItem} onPress={() => navigation.navigate("MyRequests")}>
        <Text style={styles.menuItemText}>My Requests</Text>
      </Pressable>
      <Pressable style={styles.menuItem} onPress={() => navigation.navigate("ItemList")}>
        <Text style={styles.menuItemText}>Inventory</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 },
  profile: { alignItems: "center", gap: 8, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#eee" },
  name: { fontSize: 18, fontWeight: "700" },
  menuItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: "#ccc" },
  menuItemText: { fontSize: 15, fontWeight: "600" },
  logoutButton: { marginTop: "auto", paddingVertical: 14, alignItems: "center" },
  logoutButtonText: { color: "#dc2626", fontWeight: "600" },
});
