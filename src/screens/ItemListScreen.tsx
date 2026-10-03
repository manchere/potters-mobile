import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../api/client";
import type { Item, ItemStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { useAppNavigation } from "../navigation";
import { radius, spacing, statusColors, usePalette } from "../theme";
import { Banner, Button, EmptyState, StatusBadge } from "../ui";

const FILTERS: (ItemStatus | "all")[] = ["all", "available", "missing", "broken", "lost"];

// The church's inventory: search by name/location/barcode, filter by status,
// and the three ways to add or find an item -- scan a barcode (FR2),
// identify from a photo (FR3), or add from a photo (FR1).
export default function ItemListScreen() {
  const navigation = useAppNavigation();
  const palette = usePalette();
  const { access } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ItemStatus | "all">("all");
  const { data: items, loading, refreshing, error, refresh } = useFocusLoad<Item[]>(() => api.items.list(), []);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = items
    .filter((item) => filter === "all" || item.status === filter)
    .filter((item) => {
      const text = `${item.name} ${item.description} ${item.location} ${item.barcode ?? ""}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <FlatList
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={[styles.content, shown.length === 0 && { flexGrow: 1 }]}
      data={shown}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
          <View style={styles.actions}>
            <Button title="Scan" icon="barcode-outline" variant="secondary" onPress={() => navigation.navigate("Scan")} style={styles.actionButton} />
            <Button title="Identify" icon="search-outline" variant="secondary" onPress={() => navigation.navigate("Identify")} style={styles.actionButton} />
            {access.sections.inventory.create ? (
              <Button title="Add" icon="add" onPress={() => navigation.navigate("AddItem")} style={styles.actionButton} />
            ) : null}
          </View>
          <View style={[styles.search, { backgroundColor: palette.input, borderColor: palette.inputBorder }]}>
            <Ionicons name="search" size={18} color={palette.faintText} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Search name, location or barcode"
              placeholderTextColor={palette.faintText}
              value={query}
              onChangeText={setQuery}
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {FILTERS.map((option) => {
              const active = filter === option;
              const tint = option === "all" ? (palette.dark ? palette.accentText : palette.primary) : statusColors[option];
              return (
                <Pressable
                  key={option}
                  onPress={() => setFilter(option)}
                  style={[
                    styles.chip,
                    { borderColor: active ? tint : palette.inputBorder, backgroundColor: active ? `${tint}22` : palette.surface },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? tint : palette.softText }]}>
                    {option === "all" ? `All (${items.length})` : option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {error ? <Banner tone="error">{error}</Banner> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? palette.subtle : palette.surface, borderColor: palette.border },
          ]}
        >
          {item.image_url ? (
            <Image source={{ uri: api.items.imageUrl(item.id) }} style={[styles.thumb, { backgroundColor: palette.subtle }]} />
          ) : (
            <View style={[styles.thumb, styles.noPhoto, { backgroundColor: palette.subtle }]}>
              <Ionicons name="cube-outline" size={24} color={palette.faintText} />
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.name, { color: palette.strongText }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 13 }} numberOfLines={1}>
              Qty {item.quantity}
              {item.location ? ` · ${item.location}` : ""}
            </Text>
            <StatusBadge status={item.status} />
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.faintText} />
        </Pressable>
      )}
      ListEmptyComponent={
        loading ? null : (
          <EmptyState
            icon="cube-outline"
            title={items.length === 0 ? "No items yet" : "Nothing matches"}
            message={items.length === 0 ? "Add the first item by taking a photo of it." : "Try a different search or status."}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionButton: { flex: 1, paddingHorizontal: spacing.sm },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  thumb: { width: 60, height: 60, borderRadius: radius.md },
  noPhoto: { alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700" },
});
