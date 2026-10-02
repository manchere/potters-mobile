import { StyleSheet, Text, View } from "react-native";

import { DEFAULT_MEMBER_COLOR, initials } from "../api/memberColors";

type Props = { name: string; color?: string; size: number };

// A Member's profile circle: their initials in white on their chosen color.
// `color` can be missing for a session saved before colors existed.
export default function MemberBadge({ name, color, size }: Props) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color || DEFAULT_MEMBER_COLOR },
      ]}
    >
      <Text style={[styles.text, { fontSize: Math.round(size * 0.4) }]}>{initials(name) || "?"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontWeight: "700" },
});
