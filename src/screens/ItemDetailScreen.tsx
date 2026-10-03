import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "../api/client";
import type { Item } from "../api/types";
import { useFocusLoad } from "../hooks/useFocusLoad";
import type { RootStackParamList } from "../navigation";
import { radius, spacing, usePalette } from "../theme";
import { Banner, Card, Loading, Screen, StatusBadge, type IconName } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "ItemDetail">;

// An item's photo and details (read-only on mobile -- editing is on the
// desktop app).
export default function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const palette = usePalette();
  const { data: item, loading, refreshing, error, refresh } = useFocusLoad<Item | null>(() => api.items.get(itemId), null);

  useLayoutEffect(() => {
    if (item) navigation.setOptions({ title: item.name });
  }, [item, navigation]);

  if (loading && !item) {
    return <Loading />;
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {item ? (
        <>
          {item.image_url ? (
            <Image source={{ uri: api.items.imageUrl(item.id) }} style={[styles.photo, { backgroundColor: palette.subtle }]} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.noPhoto, { backgroundColor: palette.subtle }]}>
              <Ionicons name="image-outline" size={40} color={palette.faintText} />
              <Text style={{ color: palette.faintText }}>No photo</Text>
            </View>
          )}
          <View style={{ gap: spacing.sm }}>
            <Text style={[styles.name, { color: palette.strongText }]}>{item.name}</Text>
            <StatusBadge status={item.status} />
            {item.description ? <Text style={[styles.description, { color: palette.softText }]}>{item.description}</Text> : null}
          </View>
          <Card style={{ padding: 0, gap: 0 }}>
            <Detail icon="layers-outline" label="Quantity" value={String(item.quantity)} first />
            <Detail icon="location-outline" label="Location" value={item.location || "—"} />
            <Detail icon="barcode-outline" label="Barcode" value={item.barcode || "—"} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Detail({ icon, label, value, first }: { icon: IconName; label: string; value: string; first?: boolean }) {
  const palette = usePalette();
  return (
    <View style={[styles.detail, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.divider }]}>
      <Ionicons name={icon} size={18} color={palette.mutedText} />
      <Text style={[styles.detailLabel, { color: palette.mutedText }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: palette.strongText }]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg },
  noPhoto: { alignItems: "center", justifyContent: "center", gap: spacing.sm },
  name: { fontSize: 24, fontWeight: "800" },
  description: { fontSize: 15, lineHeight: 22 },
  detail: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  detailLabel: { fontSize: 14, width: 80 },
  detailValue: { flex: 1, fontSize: 15, fontWeight: "600", textAlign: "right" },
});
