import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect, useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

import { api } from "../api/client";
import type { RootStackParamList } from "../navigation";
import { spacing } from "../theme";
import { Banner, Button, Card, Screen, TextField } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "SongEdit">;

// Add a song, or edit one (from its detail screen). Only the title is
// required, as on the desktop.
export default function SongEditScreen({ route, navigation }: Props) {
  const song = route.params.song;
  const [title, setTitle] = useState(song?.title ?? "");
  const [artist, setArtist] = useState(song?.artist ?? "");
  const [songKey, setSongKey] = useState(song?.song_key ?? "");
  const [link, setLink] = useState(song?.link ?? "");
  const [lyrics, setLyrics] = useState(song?.lyrics ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: song ? "Edit Song" : "Add Song" });
  }, [navigation, song]);

  const save = async () => {
    if (!title.trim()) {
      setTitleError("Enter the song's title.");
      return;
    }
    setSaving(true);
    setError(null);
    const fields = { title: title.trim(), artist: artist.trim(), song_key: songKey.trim(), link: link.trim(), lyrics };
    try {
      const saved = song ? await api.songs.update(song.id, fields) : await api.songs.create(fields);
      navigation.replace("SongDetail", { song: saved });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the song.");
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        {error ? <Banner tone="error">{error}</Banner> : null}
        <Card style={{ gap: spacing.md }}>
          <TextField
            label="Title"
            placeholder="e.g. Way Maker"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              setTitleError(null);
            }}
            error={titleError}
          />
          <TextField label="Artist (optional)" placeholder="e.g. Sinach" value={artist} onChangeText={setArtist} />
          <TextField label="Key (optional)" placeholder="e.g. G" value={songKey} onChangeText={setSongKey} autoCapitalize="characters" />
          <TextField
            label="Play link (optional)"
            placeholder="YouTube, Spotify..."
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextField label="Lyrics (optional)" value={lyrics} onChangeText={setLyrics} multiline style={{ minHeight: 200 }} />
        </Card>
        <Button title={song ? "Save Changes" : "Add Song"} onPress={save} loading={saving} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
