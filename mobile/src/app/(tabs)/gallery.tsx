import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, Empty, ErrorNote, Hatch, T, TabTitle } from '@/components/ui';
import { C, Fonts, Radius, STATUS } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { buildReferences } from '@/lib/reference';
import { useSync } from '@/lib/sync-context';
import type { ProjectResponse, SurveyDetail } from '@/lib/types';
import { useRefreshOnFocus } from '@/lib/use-refresh-on-focus';

type Filter = 'all' | 'synced' | 'pending';

interface Cell {
  key: string;
  label: string;
  tint: string;
  /** Local file for an unsynced capture; synced ones show the design's hatch placeholder. */
  localUri: string | null;
  surveyId: string | null;
  projectId: string;
  date: string;
}

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, refresh: refreshOutbox } = useSync();

  const [surveys, setSurveys] = useState<SurveyDetail[] | null>(null);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    await refreshOutbox();
    await Promise.all([
      api<ProjectResponse[]>('/api/projects')
        .then(setProjects)
        .catch(() => {}),
      api<SurveyDetail[]>('/api/surveys?pageSize=200')
        .then(setSurveys)
        .catch((e) => setError(errorMessage(e, 'Could not load the gallery.'))),
    ]);
  }, [refreshOutbox]);

  useRefreshOnFocus(load);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const projectName = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? 'Project',
    [projects],
  );

  const references = useMemo(
    () => buildReferences(surveys ?? [], projectName),
    [surveys, projectName],
  );

  const cells = useMemo<Cell[]>(() => {
    const local: Cell[] = items.map((i) => ({
      key: i.id,
      label: i.projectName,
      tint: i.status === 'error' ? STATUS.failed.color : STATUS.pending.color,
      localUri: i.photoUri,
      surveyId: null,
      projectId: i.projectId,
      date: new Date(i.capturedAtUtc).toDateString(),
    }));
    const remote: Cell[] = (surveys ?? []).map((s) => ({
      key: s.id,
      label: references.get(s.id) ?? s.id.slice(0, 8),
      tint: STATUS.synced.color,
      localUri: null,
      surveyId: s.id,
      projectId: s.projectId,
      date: new Date(s.capturedAtUtc).toDateString(),
    }));

    let all = [...local, ...remote];
    if (projectFilter !== 'all') all = all.filter((c) => c.projectId === projectFilter);
    if (filter === 'pending') return all.filter((c) => c.surveyId === null);
    if (filter === 'synced') return all.filter((c) => c.surveyId !== null);
    return all;
  }, [items, surveys, references, filter, projectFilter]);

  // Grouped by capture day, newest first — the design's "Today / Aug 2" sections.
  const groups = useMemo(() => {
    const today = new Date().toDateString();
    const byDate = new Map<string, Cell[]>();
    for (const cell of cells) {
      const bucket = byDate.get(cell.date) ?? [];
      bucket.push(cell);
      byDate.set(cell.date, bucket);
    }
    return [...byDate.entries()].map(([date, list]) => ({
      label: date === today ? 'Today' : new Date(date).toLocaleDateString(),
      cells: list,
    }));
  }, [cells]);

  const pendingCount = items.length;

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TabTitle
          title="Gallery"
          subtitle={
            surveys === null
              ? 'Loading…'
              : `${cells.length} captures · ${pendingCount} pending sync`
          }
        />
        <View style={styles.chips}>
          {(
            [
              ['all', 'All'],
              ['synced', 'Synced'],
              ['pending', 'Pending'],
            ] as const
          ).map(([key, label]) => (
            <Chip key={key} label={label} active={filter === key} onPress={() => setFilter(key)} />
          ))}
        </View>
        {projects.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.projectChips}>
            <Chip label="All projects" active={projectFilter === 'all'} onPress={() => setProjectFilter('all')} />
            {projects.map((p) => (
              <Chip key={p.id} label={p.name} active={projectFilter === p.id} onPress={() => setProjectFilter(p.id)} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <ErrorNote message={error} />

        {surveys !== null && cells.length === 0 ? (
          <Empty>
            {projectFilter === 'all' && filter === 'all'
              ? 'Nothing captured yet. Photos appear here as soon as they are taken.'
              : 'No captures match this filter.'}
          </Empty>
        ) : null}

        {groups.map((group) => (
          <View key={group.label}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.grid}>
              {group.cells.map((cell) => (
                <Pressable
                  key={cell.key}
                  disabled={!cell.surveyId}
                  onPress={() => cell.surveyId && router.push(`/survey/${cell.surveyId}`)}
                  style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.75 : 1 }]}>
                  {cell.localUri ? (
                    <Image source={{ uri: cell.localUri }} style={styles.cellImage} contentFit="cover" />
                  ) : (
                    <Hatch style={styles.cellImage}>
                      <View style={styles.cellLabelWrap}>
                        <Text style={styles.cellLabel} numberOfLines={3}>
                          {cell.label}
                        </Text>
                      </View>
                    </Hatch>
                  )}
                  <View style={[styles.dot, { backgroundColor: cell.tint }]} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {pendingCount > 0 ? (
          <Text style={[T.caption, { marginTop: 16 }]}>
            Pending captures show the photo held on this device. Synced ones open full size.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  projectChips: { gap: 8, paddingBottom: 12, paddingRight: 20 },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink46,
    marginTop: 12,
    marginBottom: 10,
    fontFamily: Fonts.sans,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '31.7%', aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden' },
  cellImage: { width: '100%', height: '100%', borderRadius: Radius.md },
  cellLabelWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 6 },
  cellLabel: { fontFamily: Fonts.mono, fontSize: 9, color: C.hatchInk, textAlign: 'center', lineHeight: 12 },
  dot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
