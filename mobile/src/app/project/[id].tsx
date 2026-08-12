import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Check, Chevron } from '@/components/icons';
import { Button, ErrorNote, Header, Loading, ProgressBar, StatusPill, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { formatCoords } from '@/lib/capture';
import { buildReferences } from '@/lib/reference';
import { parseSchema, type ProjectResponse, type SurveyDetail } from '@/lib/types';
import { useRefreshOnFocus } from '@/lib/use-refresh-on-focus';

/**
 * Project detail, laid out like the design's Job Detail: status chip, title, meta, progress, a
 * checklist and a sticky capture CTA.
 *
 * GeoFold has no per-job shot list, so the checklist shows the project's form schema — the fields
 * every survey in this project has to carry — with a tick for the ones the latest survey filled in.
 */
export default function ProjectDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [surveys, setSurveys] = useState<SurveyDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [p, s] = await Promise.all([
        api<ProjectResponse>(`/api/projects/${id}`),
        api<SurveyDetail[]>(`/api/surveys?projectId=${id}&pageSize=200`),
      ]);
      setProject(p);
      setSurveys(s);
    } catch (e) {
      setError(errorMessage(e, 'Could not load this project.'));
    }
  }, [id]);

  useRefreshOnFocus(load);

  const fields = useMemo(() => parseSchema(project?.formSchema), [project]);
  const references = useMemo(
    () => buildReferences(surveys ?? [], () => project?.name ?? 'Project'),
    [surveys, project],
  );

  // Which schema fields the most recent survey actually carried — the closest honest analogue of
  // the design's "photos taken so far" checklist.
  const covered = useMemo(() => {
    const latest = surveys?.[0];
    if (!latest?.detailsJson) return new Set<string>();
    try {
      const parsed = JSON.parse(latest.detailsJson) as Record<string, unknown>;
      return new Set(Object.keys(parsed).filter((k) => parsed[k] !== null && parsed[k] !== ''));
    } catch {
      return new Set<string>();
    }
  }, [surveys]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
        <Header title="Project" onBack={() => router.back()} />
        <View style={{ padding: 20 }}>
          <ErrorNote message={error} />
        </View>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
        <Header title="Project" onBack={() => router.back()} />
        <Loading />
      </View>
    );
  }

  const count = surveys?.length ?? project.surveyCount;
  const pct = fields.length ? Math.round((covered.size / fields.length) * 100) : count > 0 ? 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
      <Header title="Project details" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <StatusPill
          status={count > 0 ? 'submitted' : 'none'}
          label={count > 0 ? 'In progress' : 'Not started'}
        />
        <Text style={[T.h2, { marginTop: 10, marginBottom: 6 }]}>{project.name}</Text>
        <Text style={[T.sub, { marginBottom: 20 }]}>
          {project.description ?? 'No description'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={T.mono}>
            Created {new Date(project.createdAtUtc).toLocaleDateString()}
          </Text>
          <Text style={T.mono}>
            {count} survey{count === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={T.section}>Capture form</Text>
          <Text style={T.sub}>
            {covered.size}/{fields.length}
          </Text>
        </View>
        <ProgressBar pct={pct} />

        <View style={{ marginTop: 16, marginBottom: 16 }}>
          {fields.length === 0 ? (
            <Text style={T.sub}>
              No custom fields — captures record a photo, a position and a note.
            </Text>
          ) : (
            fields.map((f) => {
              const done = covered.has(f.key);
              return (
                <View key={f.key} style={styles.checkRow}>
                  <View style={[styles.tick, done ? { backgroundColor: C.ok } : styles.tickEmpty]}>
                    {done ? <Check /> : null}
                  </View>
                  <Text style={[T.body, { flex: 1 }]}>
                    {f.label ?? f.key}
                    {f.required ? ' *' : ''}
                  </Text>
                  <Text style={T.caption}>{f.type}</Text>
                </View>
              );
            })
          )}
        </View>

        <Text style={[T.section, { marginBottom: 10 }]}>Surveys</Text>
        {surveys === null ? (
          <Text style={T.sub}>Loading…</Text>
        ) : surveys.length === 0 ? (
          <Text style={T.sub}>None captured yet.</Text>
        ) : (
          surveys.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/survey/${s.id}`)}
              style={({ pressed }) => [styles.surveyRow, { opacity: pressed ? 0.65 : 1 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={T.mono}>{references.get(s.id) ?? s.id.slice(0, 8)}</Text>
                <Text style={[T.caption, { marginTop: 2 }]}>
                  {formatCoords(s.latitude, s.longitude)}
                </Text>
                <Text style={T.caption}>{new Date(s.capturedAtUtc).toLocaleString()}</Text>
              </View>
              <Chevron />
            </Pressable>
          ))
        )}
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}>
        <Button title="Capture photo" onPress={() => router.push(`/capture?projectId=${project.id}`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  tick: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tickEmpty: { borderWidth: 1.6, borderColor: C.line80 },
  surveyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line92,
  },
  cta: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.line92,
    backgroundColor: C.surface,
  },
});
