import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from './ui';
import { C, Radius } from '@/constants/theme';
import type { ProjectResponse } from '@/lib/types';

/**
 * "Capture for which job?" — the design's bottom sheet, over GeoFold's projects. Picking one
 * carries its id into the capture flow, which is what the survey gets filed against.
 */
export function CaptureSheet({
  visible,
  projects,
  onClose,
}: {
  visible: boolean;
  projects: ProjectResponse[];
  onClose: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const choose = (id: string) => {
    onClose();
    router.push(`/capture?projectId=${id}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Capture for which project?</Text>

        {projects.length === 0 ? (
          <Text style={[T.sub, { paddingVertical: 12 }]}>
            No projects yet. Create one on the Projects tab first.
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 320 }}>
            {projects.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => choose(p.id)}
                style={({ pressed }) => [
                  styles.row,
                  i === projects.length - 1 ? { borderBottomWidth: 0 } : null,
                  { opacity: pressed ? 0.6 : 1 },
                ]}>
                <View style={styles.dot} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={T.caption} numberOfLines={1}>
                    {p.description ?? `${p.surveyCount} surveys`}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.line85,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: '600', color: C.ink, marginBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line92,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  name: { fontSize: 14, fontWeight: '500', color: C.ink },
});
