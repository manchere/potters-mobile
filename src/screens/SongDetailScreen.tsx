import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { RootStackParamList } from "../navigation";
import { spacing, usePalette } from "../theme";
import { Badge, Banner, Button, Card, Screen } from "../ui";
import { confirmAction } from "../ui/confirm";

type Props = NativeStackScreenProps<RootStackParamList, "SongDetail">;

// A song's key, play link and lyrics. Edit and Delete follow the Songs
// "update" / "delete" rights.
export default function SongDetailScreen({ route, navigation }: Props) {
  const { song } = route.params;
  const palette = usePalette();
  const { access } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: song.title });
  }, [navigation, song.title]);

  const remove = async () => {
    const ok = await confirmAction("Delete this song?", `"${song.title}" will be removed from the song library.`, "Delete");
    if (!ok) return;
    setRemoving(true);
    try {
      await api.songs.remove(song.id);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the song.");
      setRemoving(false);
    }
  };

  const tint = palette.dark ? palette.accentText : palette.primary;
  return (
    <Screen>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <View style={{ gap: spacing.xs }}>
        <Text style={[styles.title, { color: palette.strongText }]}>{song.title}</Text>
        {song.artist ? <Text style={{ color: palette.mutedText, fontSize: 16 }}>{song.artist}</Text> : null}
        {song.song_key ? <Badge label={`Key of ${song.song_key}`} color={tint} /> : null}
      </View>
      {song.link ? (
        <Button title="Play" icon="play-circle-outline" variant="secondary" onPress={() => Linking.openURL(song.link)} />
      ) : null}
      <Card>
        <Text style={[styles.lyricsTitle, { color: palette.mutedText }]}>LYRICS</Text>
        <Text style={[styles.lyrics, { color: palette.text }]} selectable>
          {song.lyrics || "No lyrics added yet."}
        </Text>
      </Card>
      {access.sections.songs.update ? (
        <Button title="Edit Song" icon="create-outline" onPress={() => navigation.replace("SongEdit", { song })} />
      ) : null}
      {access.sections.songs.delete ? (
        <Button title="Delete Song" icon="trash-outline" variant="danger" onPress={remove} loading={removing} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800" },
  lyricsTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
  lyrics: { fontSize: 16, lineHeight: 24 },
});
