import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../api/client";
import type { Song } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useFocusLoad } from "../hooks/useFocusLoad";
import { useAppNavigation } from "../navigation";
import { radius, spacing, usePalette } from "../theme";
import { Badge, Banner, Button, EmptyState } from "../ui";

// The worship song library (desktop Songs tab): search by title, artist or
// lyrics. Add shows only for members with the Songs "create" right.
export default function SongsScreen() {
  const navigation = useAppNavigation();
  const palette = usePalette();
  const { access } = useAuth();
  const [query, setQuery] = useState("");
  const { data: songs, loading, refreshing, error, refresh } = useFocusLoad<Song[]>(() => api.songs.list(), []);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = songs.filter((song) => {
    const text = `${song.title} ${song.artist} ${song.lyrics}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });

  return (
    <FlatList
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={[styles.content, shown.length === 0 && { flexGrow: 1 }]}
      data={shown}
      keyExtractor={(song) => String(song.id)}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
          {access.sections.songs.create ? (
            <Button title="Add Song" icon="add" onPress={() => navigation.navigate("SongEdit", {})} />
          ) : null}
          <View style={[styles.search, { backgroundColor: palette.input, borderColor: palette.inputBorder }]}>
            <Ionicons name="search" size={18} color={palette.faintText} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Search title, artist or lyrics"
              placeholderTextColor={palette.faintText}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          {error ? <Banner tone="error">{error}</Banner> : null}
        </View>
      }
      renderItem={({ item: song }) => (
        <Pressable
          onPress={() => navigation.navigate("SongDetail", { song })}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? palette.subtle : palette.surface, borderColor: palette.border },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: palette.subtle }]}>
            <Ionicons name="musical-notes" size={20} color={palette.dark ? palette.accentText : palette.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.title, { color: palette.strongText }]} numberOfLines={1}>
              {song.title}
            </Text>
            {song.artist ? (
              <Text style={{ color: palette.mutedText, fontSize: 13 }} numberOfLines={1}>
                {song.artist}
              </Text>
            ) : null}
          </View>
          {song.song_key ? <Badge label={song.song_key} color={palette.dark ? palette.accentText : palette.primary} /> : null}
          <Ionicons name="chevron-forward" size={18} color={palette.faintText} />
        </Pressable>
      )}
      ListEmptyComponent={
        loading ? null : (
          <EmptyState
            icon="musical-notes-outline"
            title={songs.length === 0 ? "No songs yet" : "Nothing matches"}
            message={songs.length === 0 ? "Songs added on the desktop app or here will show up in this list." : "Try a different search."}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "700" },
});
