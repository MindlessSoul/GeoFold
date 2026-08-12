import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Close } from '@/components/icons';
import { Button, Chip, ErrorNote, Field, Header, T } from '@/components/ui';
import { C, Fonts, Radius } from '@/constants/theme';
import { ApiError, api, errorMessage } from '@/lib/api';

// The types the server's FormSchemaValidator accepts; anything else is rejected on create.
const FIELD_TYPES = ['text', 'number', 'integer', 'boolean', 'date', 'select'] as const;
type FieldType = (typeof FIELD_TYPES)[number];

interface DraftField {
  id: number;
  label: string;
  type: FieldType;
  required: boolean;
}

/** "Kondisi lokasi" -> "kondisi_lokasi". Keys are what end up in the survey's JSON. */
function toKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default function NewProjectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<DraftField[]>([]);
  const [nextId, setNextId] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addField = () => {
    setFields((p) => [...p, { id: nextId, label: '', type: 'text', required: false }]);
    setNextId((n) => n + 1);
  };
  const update = (id: number, patch: Partial<DraftField>) =>
    setFields((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id: number) => setFields((p) => p.filter((f) => f.id !== id));

  const save = async () => {
    setError(null);

    const named = fields.filter((f) => f.label.trim());
    const keys = named.map((f) => toKey(f.label));
    if (new Set(keys).size !== keys.length) {
      setError('Two fields resolve to the same key. Give them more distinct labels.');
      return;
    }

    setBusy(true);
    try {
      await api('/api/projects', {
        method: 'POST',
        body: {
          name: name.trim(),
          description: description.trim() || null,
          formSchema: JSON.stringify(
            named.map((f) => ({
              key: toKey(f.label),
              label: f.label.trim(),
              type: f.type,
              required: f.required,
            })),
          ),
        },
      });
      router.back();
    } catch (e) {
      // A quota refusal is a plan limit, not a bug — say so in the words the server used.
      setError(
        e instanceof ApiError && e.isQuota
          ? e.message
          : errorMessage(e, 'Could not create the project.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
      <Header title="New project" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled">
        <ErrorNote message={error} />

        <Field
          label="Name"
          required
          value={name}
          onChangeText={setName}
          placeholder="Riverside Dr Culvert Inspection"
          maxLength={200}
        />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="What this project covers"
        />

        <Text style={[T.section, { marginTop: 12, marginBottom: 6 }]}>Capture form</Text>
        <Text style={[T.sub, { marginBottom: 16 }]}>
          Fields the surveyor fills in for every point. A note field is always included, so leave
          this empty for a photo-and-position survey.
        </Text>

        {fields.map((field) => (
          <View key={field.id} style={styles.fieldCard}>
            <View style={styles.fieldHead}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Field label"
                  value={field.label}
                  onChangeText={(v) => update(field.id, { label: v })}
                  placeholder="Kondisi lokasi"
                />
              </View>
              <Pressable onPress={() => remove(field.id)} hitSlop={10} style={styles.remove}>
                <Close color={C.ink62} size={12} />
              </Pressable>
            </View>

            <Text style={[T.sub, { marginBottom: 8 }]}>Type</Text>
            <View style={styles.types}>
              {FIELD_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={type}
                  active={field.type === type}
                  onPress={() => update(field.id, { type })}
                />
              ))}
            </View>

            <View style={styles.requiredRow}>
              <Text style={[T.body, { flex: 1 }]}>Required</Text>
              <Switch
                value={field.required}
                onValueChange={(v) => update(field.id, { required: v })}
                trackColor={{ true: C.accent, false: C.line85 }}
              />
            </View>

            {field.label.trim() ? (
              <Text style={styles.keyHint}>key: {toKey(field.label)}</Text>
            ) : null}
          </View>
        ))}

        <Button title="Add field" variant="outline" onPress={addField} style={{ marginBottom: 24 }} />

        <Button
          title={busy ? 'Creating…' : 'Create project'}
          onPress={save}
          busy={busy}
          disabled={!name.trim() || busy}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldCard: {
    borderWidth: 1,
    borderColor: C.line90,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
  },
  fieldHead: { flexDirection: 'row', gap: 8 },
  remove: { padding: 6, marginTop: 22 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  requiredRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  keyHint: { fontSize: 11, color: C.ink62, marginTop: 8, fontFamily: Fonts.mono },
});
