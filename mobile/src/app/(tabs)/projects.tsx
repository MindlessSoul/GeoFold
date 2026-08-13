import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureSheet } from '@/components/capture-sheet';
import { CameraGlyph, Chevron } from '@/components/icons';
import { Chip, Empty, ErrorNote, StatusPill, T, TabTitle } from '@/components/ui';
import { C, Fonts } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { parseSchema, type ProjectResponse } from '@/lib/types';
import { useRefreshOnFocus } from '@/lib/use-refresh-on-focus';

type Filter = 'all' | 'active' | 'empty';

export default function ProjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [projects, setProjects] = useState<ProjectResponse[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setProjects(await api<ProjectResponse[]>('/api/projects'));
    } catch (e) {
      setError(errorMessage(e, 'Could not load projects.'));
    }
  }, []);

  useRefreshOnFocus(load);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const list = projects ?? [];
    if (filter === 'active') return list.filter((p) => p.surveyCount > 0);
    if (filter === 'empty') return list.filter((p) => p.surveyCount === 0);
    return list;
  }, [projects, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TabTitle
          title="Projects"
          subtitle={projects ? `${projects.length} assigned to you` : 'Loading…'}
        />
        <View style={styles.chips}>
          {(
            [
              ['all', 'All'],
              ['active', 'Started'],
              ['empty', 'Not started'],
            ] as const
          ).map(([key, label]) => (
            <Chip key={key} label={label} active={filter === key} onPress={() => setFilter(key)} />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <ErrorNote message={error} />

        {projects === null ? null : filtered.length === 0 ? (
          <Empty>
            {projects.length === 0
              ? 'No projects yet. Create one to start capturing.'
              : 'Nothing matches that filter.'}
          </Empty>
        ) : (
          filtered.map((p) => {
            const fields = parseSchema(p.formSchema);
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/project/${p.id}`)}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.address} numberOfLines={1}>
                    {p.description ?? 'No description'}
                  </Text>
                  <Text style={T.caption}>
                    {new Date(p.createdAtUtc).toLocaleDateString()} · {p.surveyCount} surveys ·{' '}
                    {fields.length} field{fields.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <StatusPill
                    status={p.surveyCount > 0 ? 'submitted' : 'none'}
                    label={p.surveyCount > 0 ? 'In progress' : 'Not started'}
                  />
                  <Chevron />
                </View>
              </Pressable>
            );
          })
        )}

        <Pressable
          onPress={() => router.push('/project/new')}
          style={({ pressed }) => [styles.newProject, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.newProjectText}>+ New project</Text>
        </Pressable>
      </ScrollView>

      <Pressable
        onPress={() => setSheetOpen(true)}
        style={({ pressed }) => [styles.fab, { bottom: 20, opacity: pressed ? 0.9 : 1 }]}>
        <CameraGlyph size={22} />
      </Pressable>

      <CaptureSheet
        visible={sheetOpen}
        projects={projects ?? []}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line92,
  },
  name: { fontSize: 15, fontWeight: '500', color: C.ink, marginBottom: 3, fontFamily: Fonts.sans },
  address: { fontSize: 13, color: C.ink55, marginBottom: 6, fontFamily: Fonts.sans },
  rowRight: { alignItems: 'flex-end', gap: 10 },
  newProject: { paddingVertical: 18, alignItems: 'center' },
  newProjectText: { fontSize: 15, fontWeight: '500', color: C.accent, fontFamily: Fonts.sans },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
});
