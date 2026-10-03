import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { radius, spacing, usePalette } from "../theme";

export type Option = { id: number; label: string; leading?: ReactNode };

// A form field that opens a searchable list to pick one option -- members
// or duty types, too many for a row of chips. With noneLabel, the list
// starts with that entry and picking it sets null.
export default function OptionPicker({
  label,
  placeholder,
  options,
  value,
  onChange,
  noneLabel,
  disabled = false,
  error,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  value: number | null;
  onChange: (id: number | null) => void;
  noneLabel?: string;
  disabled?: boolean;
  error?: string | null;
}) {
  const palette = usePalette();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);

  const terms = query.trim().toLowerCase();
  const shown = options.filter((option) => option.label.toLowerCase().includes(terms));
  const rows: (Option | null)[] = noneLabel && !terms ? [null, ...shown] : shown;

  const pick = (id: number | null) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[styles.label, { color: palette.softText }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        style={[
          styles.field,
          {
            backgroundColor: disabled ? palette.subtle : palette.input,
            borderColor: error ? palette.error : palette.inputBorder,
          },
        ]}
      >
        {selected?.leading}
        <Text style={[styles.value, { color: selected ? palette.text : palette.faintText }]} numberOfLines={1}>
          {selected?.label ?? (value === null && noneLabel ? noneLabel : placeholder)}
        </Text>
        {disabled ? null : <Ionicons name="chevron-down" size={18} color={palette.faintText} />}
      </Pressable>
      {error ? <Text style={{ color: palette.error, fontSize: 12 }}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.strongText }]}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={{ color: palette.dark ? palette.accentText : palette.primary, fontSize: 16, fontWeight: "600" }}>
                Cancel
              </Text>
            </Pressable>
          </View>
          <View style={[styles.search, { backgroundColor: palette.input, borderColor: palette.inputBorder }]}>
            <Ionicons name="search" size={18} color={palette.faintText} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Search"
              placeholderTextColor={palette.faintText}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoFocus
            />
          </View>
          <FlatList
            data={rows}
            keyExtractor={(option) => String(option?.id ?? "none")}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.divider }} />}
            renderItem={({ item: option }) => {
              const isSelected = option ? option.id === value : value === null;
              return (
                <Pressable
                  onPress={() => pick(option?.id ?? null)}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: palette.subtle }]}
                >
                  {option?.leading}
                  <Text
                    style={[styles.rowText, { color: option ? palette.strongText : palette.mutedText }]}
                    numberOfLines={1}
                  >
                    {option?.label ?? noneLabel}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={20} color={palette.dark ? palette.accentText : palette.primary} />
                  ) : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={[styles.empty, { color: palette.mutedText }]}>Nothing matches.</Text>}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  value: { flex: 1, fontSize: 15 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  title: { fontSize: 18, fontWeight: "700" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 14, paddingHorizontal: spacing.lg },
  rowText: { flex: 1, fontSize: 16 },
  empty: { textAlign: "center", padding: spacing.xl },
});
