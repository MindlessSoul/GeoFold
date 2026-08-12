import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chevron } from '@/components/icons';
import { ErrorNote, Hatch, Header, Loading, StatusPill, T } from '@/components/ui';
import { C, Fonts, Radius } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { formatAccuracy, formatCoords } from '@/lib/capture';
import { labeledValues, parseDetails } from '@/lib/details';
import { slugifyProject } from '@/lib/reference';
import { parseSchema, type ProjectResponse, type SurveyDetail } from '@/lib/types';
import { useRefreshOnFocus } from '@/lib/use-refresh-on-focus';

/** Photo Detail from the design: the image with its burned-in stamp, then the metadata below. */
export default function SurveyDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [photosResolved, setPhotosResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const detail = await api<SurveyDetail>(`/api/surveys/${id}`);
      setSurvey(detail);

      await api<ProjectResponse>(`/api/projects/${detail.projectId}`)
        .then(setProject)
        .catch(() => {});

      // Storage is private, so each photo needs its own short-lived signed URL.
      const entries = await Promise.all(
        detail.photos.map(async (photo) => {
          try {
            const { url } = await api<{ url: string | null }>(
              `/api/surveys/${detail.id}/photos/${photo.id}/url`,
            );
            return url ? ([photo.id, url] as const) : null;
          } catch {
            return null;
          }
        }),
      );
      setPhotoUrls(Object.fromEntries(entries.filter((e): e is readonly [string, string] => !!e)));
      setPhotosResolved(true);
    } catch (e) {
      setError(errorMessage(e, 'Could not load this survey.'));
    }
  }, [id]);

  useRefreshOnFocus(load);

  const values = useMemo(() => {
    if (!survey) return [];
    return labeledValues(parseDetails(survey.detailsJson), parseSchema(project?.formSchema));
  }, [survey, project]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
        <Header title="Photo" onBack={() => router.back()} />
        <View style={{ padding: 20 }}>
          <ErrorNote message={error} />
        </View>
      </View>
    );
  }

  if (!survey) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
        <Header title="Photo" onBack={() => router.back()} />
        <Loading />
      </View>
    );
  }

  const first = survey.photos[0];
  const url = first ? photoUrls[first.id] : undefined;
  const reference = `${slugifyProject(project?.name ?? 'PROJECT')}`;
  const captured = new Date(survey.capturedAtUtc);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
      <Header title="Photo" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={styles.hero}>
          {url ? (
            <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <Hatch style={StyleSheet.absoluteFill}>
              <View style={styles.heroCenter}>
                <Text style={styles.heroLabel}>
                  {!first
                    ? 'No photo on this survey'
                    : photosResolved
                      ? 'Photo unavailable'
                      : 'Loading photo…'}
                </Text>
              </View>
            </Hatch>
          )}

          {/* Mirrors the stamp burned into the image, so the metadata reads the same on screen. */}
          <View style={styles.stamp}>
            <Text style={styles.stampPrimary}>
              {formatCoords(survey.latitude, survey.longitude)}
            </Text>
            <Text style={styles.stampSecondary}>
              {captured.toLocaleDateString()}, {captured.toLocaleTimeString()}
            </Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          <View style={styles.titleRow}>
            <Text style={[T.section, { flex: 1 }]}>{reference}</Text>
            <StatusPill status={survey.status === 'reviewed' ? 'reviewed' : 'submitted'} />
          </View>

          <Pressable
            onPress={() => router.push(`/project/${survey.projectId}`)}
            style={({ pressed }) => [styles.projectRow, { opacity: pressed ? 0.65 : 1 }]}>
            <Text style={[T.body, { flex: 1 }]} numberOfLines={1}>
              {project?.name ?? 'Project'}
            </Text>
            <Chevron />
          </Pressable>

          <Text style={[T.section, { marginBottom: 10 }]}>Position</Text>
          <Text style={T.mono}>{formatCoords(survey.latitude, survey.longitude)}</Text>
          {survey.accuracyMeters != null ? (
            <Text style={[T.caption, { marginTop: 4 }]}>
              Accuracy {formatAccuracy(survey.accuracyMeters)}
            </Text>
          ) : null}
          <Text style={[T.caption, { marginTop: 4 }]}>
            Synced {new Date(survey.syncedAtUtc).toLocaleString()}
          </Text>

          <Text style={[T.section, { marginTop: 24, marginBottom: 10 }]}>Description</Text>
          {values.length === 0 ? (
            <Text style={T.sub}>No field values were recorded.</Text>
          ) : (
            values.map((v) => (
              <View key={v.key} style={{ marginBottom: 12 }}>
                <Text style={styles.fieldLabel}>{v.label}</Text>
                <Text style={T.body}>{v.value || '—'}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 4 / 3, backgroundColor: C.hatchA },
  heroCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontFamily: Fonts.mono, fontSize: 12, color: C.hatchInk },
  stamp: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  stampPrimary: { fontFamily: Fonts.mono, fontSize: 12, color: '#fff' },
  stampSecondary: { fontFamily: Fonts.mono, fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.line90,
    borderRadius: Radius.lg,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.ink62,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    fontFamily: Fonts.sans,
  },
});
