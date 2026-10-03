import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "../api/client";
import type { Item, ItemStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useFocusLoad } from "../hooks/useFocusLoad";
import type { RootStackParamList } from "../navigation";
import { radius, spacing, statusColors, usePalette } from "../theme";
import { Banner, Button, Card, Loading, Screen, SectionTitle, StatusBadge, type IconName } from "../ui";
import { confirmAction } from "../ui/confirm";

const STATUSES: ItemStatus[] = ["available", "missing", "broken", "lost"];

type Props = NativeStackScreenProps<RootStackParamList, "ItemDetail">;

// An item's photo and details. Members with the Inventory "update" right
// can change its status (e.g. mark it missing), and those with "delete" can
// remove it; full editing stays on the desktop app.
export default function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const palette = usePalette();
  const { access } = useAuth();
  const rights = access.sections.inventory;
  const { data: item, setData, loading, refreshing, error, refresh } = useFocusLoad<Item | null>(() => api.items.get(itemId), null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const setStatus = async (status: ItemStatus) => {
    if (!item || item.status === status) return;
    setActionError(null);
    setData({ ...item, status });
    try {
      setData(await api.items.setStatus(item.id, status));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't change the status.");
      refresh();
    }
  };

  const remove = async () => {
    if (!item) return;
    if (!(await confirmAction("Delete this item?", `"${item.name}" will be removed from the inventory.`, "Delete"))) return;
    setRemoving(true);
    try {
      await api.items.remove(item.id);
      navigation.goBack();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't delete the item.");
      setRemoving(false);
    }
  };

  useLayoutEffect(() => {
    if (item) navigation.setOptions({ title: item.name });
  }, [item, navigation]);

  if (loading && !item) {
    return <Loading />;
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {actionError ? <Banner tone="error">{actionError}</Banner> : null}
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
          {rights.update ? (
            <>
              <SectionTitle>Change status</SectionTitle>
              <View style={styles.statuses}>
                {STATUSES.map((status) => {
                  const active = item.status === status;
                  const color = statusColors[status];
                  return (
                    <Pressable
                      key={status}
                      onPress={() => setStatus(status)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.status,
                        { borderColor: active ? color : palette.inputBorder, backgroundColor: active ? `${color}22` : palette.surface },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: active ? color : palette.softText }]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
          {rights.delete ? (
            <Button title="Delete Item" icon="trash-outline" variant="danger" onPress={remove} loading={removing} />
          ) : null}
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
  statuses: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  status: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  statusText: { fontSize: 14, fontWeight: "700" },
});
