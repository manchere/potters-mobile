import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

import { api } from "../api/client";
import type { DutyType, Member } from "../api/types";
import { formatDate } from "../format";
import type { RootStackParamList } from "../navigation";
import { spacing } from "../theme";
import { Banner, Button, Card, Loading, MemberBadge, Screen, TextField } from "../ui";
import { confirmAction } from "../ui/confirm";
import OptionPicker from "../ui/OptionPicker";

type Props = NativeStackScreenProps<RootStackParamList, "DutyEdit">;

// Admins only (Schedule > Add Duty, or tap a duty): pick the duty, who
// serves and an optional backup, plus notes. An existing duty keeps its
// duty type -- remove it and add another to change that.
export default function DutyEditScreen({ route, navigation }: Props) {
  const { date, duty } = route.params;
  const [dutyTypes, setDutyTypes] = useState<DutyType[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [dutyTypeId, setDutyTypeId] = useState<number | null>(duty?.duty_type_id ?? null);
  const [memberId, setMemberId] = useState<number | null>(duty?.member_id ?? null);
  const [backupId, setBackupId] = useState<number | null>(duty?.support_member_id ?? null);
  const [notes, setNotes] = useState(duty?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [dutyError, setDutyError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: duty ? "Edit Duty" : "Add Duty" });
    Promise.all([api.dutyTypes.list(), api.members.list()])
      .then(([types, people]) => {
        setDutyTypes(types);
        setMembers(people.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((err) => {
        setDutyTypes([]);
        setError(err instanceof Error ? err.message : "Couldn't load duties and members.");
      });
  }, [duty, navigation]);

  const save = async () => {
    if (dutyTypeId === null) {
      setDutyError("Pick a duty.");
      return;
    }
    if (memberId !== null && memberId === backupId) {
      setError("The backup has to be someone else.");
      return;
    }
    setSaving(true);
    setError(null);
    const input = { duty_type_id: dutyTypeId, service_date: date, member_id: memberId, support_member_id: backupId, notes: notes.trim() };
    try {
      if (duty) {
        await api.duties.update(duty.id, input);
      } else {
        await api.duties.create(input);
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the duty.");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!duty) return;
    const ok = await confirmAction(
      "Remove this duty?",
      `${duty.duty_type_icon} ${duty.duty_type_name} on ${formatDate(date)} comes off the schedule.`,
      "Remove",
    );
    if (!ok) return;
    setRemoving(true);
    try {
      await api.duties.remove(duty.id);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove the duty.");
      setRemoving(false);
    }
  };

  if (dutyTypes === null) {
    return <Loading />;
  }

  const memberOptions = members.map((member) => ({
    id: member.id,
    label: member.name,
    leading: <MemberBadge name={member.name} color={member.color} size={28} />,
  }));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <Banner tone="info" icon="calendar-outline">{formatDate(date)}</Banner>
        {error ? <Banner tone="error">{error}</Banner> : null}
        <Card style={{ gap: spacing.md }}>
          <OptionPicker
            label="Duty"
            placeholder="Pick a duty"
            options={dutyTypes.map((type) => ({ id: type.id, label: `${type.icon}  ${type.name}` }))}
            value={dutyTypeId}
            onChange={(id) => {
              setDutyTypeId(id);
              setDutyError(null);
            }}
            disabled={!!duty}
            error={dutyError}
          />
          <OptionPicker
            label="Serving"
            placeholder="Pick a member"
            noneLabel="Nobody yet"
            options={memberOptions}
            value={memberId}
            onChange={setMemberId}
          />
          <OptionPicker
            label="Backup (optional)"
            placeholder="Pick a member"
            noneLabel="No backup"
            options={memberOptions.filter((option) => option.id !== memberId)}
            value={backupId}
            onChange={setBackupId}
          />
          <TextField label="Notes (optional)" placeholder="e.g. Bring the spare mic" value={notes} onChangeText={setNotes} multiline />
        </Card>
        <Button title={duty ? "Save Changes" : "Add to Schedule"} onPress={save} loading={saving} />
        {duty ? <Button title="Remove Duty" variant="danger" icon="trash-outline" onPress={remove} loading={removing} /> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
