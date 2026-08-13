import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureSheet } from '@/components/capture-sheet';
import { CameraGlyph, Cloud } from '@/components/icons';
import { SurveyMap, type SurveyMarker } from '@/components/survey-map';
import { Chip, Empty, ErrorNote } from '@/components/ui';
import { C } from '@/constants/theme';
import { ApiError, api, errorMessage } from '@/lib/api';
import { useSync } from '@/lib/sync-context';
import type { ProjectResponse, SurveyFeatureCollection } from '@/lib/types';
import { useRefreshOnFocus } from '@/lib/use-refresh-on-focus';

type Filter = 'all' | 'pending' | 'synced';

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, pending } = useSync();

  const [collection, setCollection] = useState<SurveyFeatureCollection | null>(null);
  // Projects are still fetched for the capture sheet, just no longer shown as a strip on the map.
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mapBlocked, setMapBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    await Promise.all([
      api<ProjectResponse[]>('/api/projects')
        .then(setProjects)
        .catch(() => {}),
      api<SurveyFeatureCollection>('/api/surveys/geojson')
        .then((fc) => {
          setCollection(fc);
          setMapBlocked(false);
        })
        .catch((e) => {
          // The map feed is plan-gated server-side; that is not an error worth a red banner.
          if (e instanceof ApiError && e.status === 403) setMapBlocked(true);
          else setError(errorMessage(e, 'Could not load the map.'));
        }),
    ]);
  }, []);

  useRefreshOnFocus(load);

  // Points still on the device are drawn alongside synced ones — a surveyor should see everything
  // they have captured today, not only what has reached the server.
  const markers = useMemo<SurveyMarker[]>(() => {
    const synced = (collection?.features ?? []).map((f) => ({
      id: f.properties.id,
      coordinates: { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] },
      title: new Date(f.properties.capturedAtUtc).toLocaleDateString(),
      showCallout: true,
      pending: false,
    }));
    const local = items.map((i) => ({
      id: i.id,
      coordinates: { latitude: i.latitude, longitude: i.longitude },
      title: `${i.projectName} · not yet synced`,
      showCallout: true,
      pending: true,
    }));

    const all = [...local, ...synced];
    if (filter === 'pending') return all.filter((m) => m.pending);
    if (filter === 'synced') return all.filter((m) => !m.pending);
    return all;
  }, [collection, items, filter]);

  const camera = useMemo(
    () => (markers.length ? { coordinates: markers[0].coordinates, zoom: 13 } : undefined),
    [markers],
  );

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        {mapBlocked ? (
          <View style={styles.blocked}>
            <Empty>
              Plotting surveys on a map is part of the Premium plan. Points are still being
              collected — they are all listed under Gallery.
            </Empty>
          </View>
        ) : (
          <SurveyMap
            markers={markers}
            camera={camera}
            onMarkerPress={(id) => {
              if (!id) return;
              // Local ids belong to the outbox, which has no server record to open yet.
              if (!items.some((i) => i.id === id)) router.push(`/survey/${id}`);
            }}
          />
        )}
      </View>

      <View style={[styles.topBar, { top: insets.top + 16 }]}>
        <Pressable onPress={() => router.push('/sync')} style={styles.cloudButton}>
          <Cloud />
          {pending > 0 ? <View style={styles.badge} /> : null}
        </Pressable>
      </View>

      <View style={[styles.chips, { top: insets.top + 68 }]}>
        {(
          [
            ['all', 'All points'],
            ['pending', 'Pending sync'],
            ['synced', 'Synced'],
          ] as const
        ).map(([key, label]) => (
          <Chip key={key} label={label} active={filter === key} onPress={() => setFilter(key)} />
        ))}
      </View>

      {error ? (
        <View style={[styles.errorWrap, { top: insets.top + 116 }]}>
          <ErrorNote message={error} />
        </View>
      ) : null}

      <Pressable
        onPress={() => setSheetOpen(true)}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 28, opacity: pressed ? 0.9 : 1 }]}>
        <CameraGlyph />
      </Pressable>

      <CaptureSheet visible={sheetOpen} projects={projects} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.mapBase },
  blocked: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: C.surface },

  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'flex-end', zIndex: 2 },
  cloudButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.warn,
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  chips: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 8, zIndex: 2 },
  errorWrap: { position: 'absolute', left: 16, right: 16, zIndex: 2 },

  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
});
