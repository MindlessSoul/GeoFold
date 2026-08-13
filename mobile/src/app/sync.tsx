import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cloud } from '@/components/icons';
import { Button, Card, Hatch, Header, StatusPill, T } from '@/components/ui';
import { C, Fonts } from '@/constants/theme';
import { API_BASE_URL, DEMO_MODE } from '@/lib/config';
import { useSync } from '@/lib/sync-context';

export default function SyncScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, pending, failed, syncing, online, syncNow } = useSync();

  const target = DEMO_MODE ? 'sample data (no server)' : API_BASE_URL.replace(/^https?:\/\//, '');

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
      <Header title="Sync & backup" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        <Card style={{ marginBottom: 24 }}>
          <View style={styles.connected}>
            <View style={styles.cloudBadge}>
              <Cloud color={C.accent} />
            </View>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={styles.connectedTitle}>
                {online ? 'Connected to GeoFold' : 'Offline'}
              </Text>
              <Text style={T.caption} numberOfLines={1}>
                {target}
              </Text>
            </View>
          </View>

          <Text style={[T.caption, { marginBottom: 14 }]}>
            {pending === 0
              ? 'Everything on this device has been uploaded.'
              : `${pending} capture${pending === 1 ? '' : 's'} waiting${failed > 0 ? ` · ${failed} failed` : ''}`}
          </Text>

          <Button
            title={syncing ? 'Syncing…' : 'Sync now'}
            onPress={() => void syncNow()}
            busy={syncing}
            disabled={pending === 0 || !online}
          />
        </Card>

        <Text style={[T.section, { marginBottom: 12 }]}>Pending uploads · {pending}</Text>

        {items.length === 0 ? (
          <Text style={T.sub}>Nothing queued.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.row}>
              {item.photoUri ? (
                <Hatch style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: C.bg95 }]} />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.projectName}
                </Text>
                <Text style={T.caption} numberOfLines={1}>
                  {new Date(item.capturedAtUtc).toLocaleString()}
                </Text>
                {item.error ? (
                  <Text style={[T.caption, { color: C.danger }]} numberOfLines={2}>
                    {item.error}
                  </Text>
                ) : null}
              </View>
              <StatusPill
                status={item.status === 'error' ? 'failed' : item.status === 'syncing' ? 'syncing' : 'pending'}
              />
              {item.status === 'error' ? (
                <Pressable onPress={() => void syncNow()} hitSlop={8}>
                  <Text style={styles.retry}>Retry</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}

        <Text style={[T.caption, { marginTop: 24, lineHeight: 19 }]}>
          Photos are captured offline and queued automatically. Nothing leaves your device until it
          is synced.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  connected: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cloudBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedTitle: { fontSize: 14, fontWeight: '600', color: C.ink, fontFamily: Fonts.sans },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line92,
  },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  rowTitle: { fontSize: 14, color: C.ink, marginBottom: 2, fontFamily: Fonts.sans },
  retry: { fontSize: 12, fontWeight: '500', color: C.accent, fontFamily: Fonts.sans },
});
