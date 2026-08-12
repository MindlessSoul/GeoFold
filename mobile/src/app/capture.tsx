import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { randomUUID } from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Close } from '@/components/icons';
import { Button, ErrorNote, Field, Loading, T } from '@/components/ui';
import { WatermarkedPhoto } from '@/components/watermarked-photo';
import { C, Fonts, Radius } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { buildDetails, formatAccuracy, formatCoords, getFix, stampLines, type Fix } from '@/lib/capture';
import { DEV_BUILD_REQUIRED, getViewShot } from '@/lib/native';
import { addItem, storePhoto } from '@/lib/outbox';
import { downscale, stageWidth, type RawPhoto } from '@/lib/photo';
import { useSync } from '@/lib/sync-context';
import { parseSchema, type ProjectResponse } from '@/lib/types';

const PREVIEW_WIDTH = 320;

/**
 * The design's capture flow — live viewfinder, then review — over GeoFold's real pipeline: a
 * high-accuracy fix, the coordinates burned into the JPEG, and the result queued in the offline
 * outbox. The project's form fields sit on the review step because the server validates required
 * fields on upload, and finding that out after leaving the site is too late.
 */
export default function CaptureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { refresh, syncNow } = useSync();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const stageRef = useRef<View>(null);

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<RawPhoto | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Under canopy or on a device with no GPS lock, the surveyor can type the coordinates instead —
  // the same escape hatch the web capture screen offers. A typed fix records no accuracy.
  const [manual, setManual] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const stagePixels = useMemo(() => stageWidth(), []);
  const canStamp = useMemo(() => getViewShot() !== null, []);
  const fields = useMemo(() => parseSchema(project?.formSchema), [project]);
  const aspect = photo ? photo.height / photo.width : 4 / 3;

  const manualFix = useMemo<Fix | null>(() => {
    if (!manual) return null;
    const lat = Number(manualLat.trim());
    const lng = Number(manualLng.trim());
    const ok =
      manualLat.trim() !== '' && manualLng.trim() !== '' &&
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    return ok ? { latitude: lat, longitude: lng, accuracy: null, timestamp: Date.now() } : null;
  }, [manual, manualLat, manualLng]);

  // GPS by default; a valid manual entry takes over. Everything downstream — the stamp, the save
  // guard, the button — reads this rather than the raw GPS fix.
  const effectiveFix = manual ? manualFix : fix;

  const lines = useMemo(
    () => (effectiveFix ? [...stampLines(effectiveFix), project?.name ?? ''].filter(Boolean) : []),
    [effectiveFix, project],
  );

  useEffect(() => {
    if (!projectId) return;
    api<ProjectResponse>(`/api/projects/${projectId}`)
      .then(setProject)
      .catch(() => setError('Could not load the project for this capture.'));
  }, [projectId]);

  const takeFix = useCallback(async () => {
    try {
      // The await comes first so nothing is set synchronously — this runs straight from an effect,
      // and the last error stays on screen until a retry actually succeeds.
      const next = await getFix();
      setFix(next);
      setGpsError(null);
    } catch (e) {
      setGpsError(errorMessage(e, 'Could not get a location fix.'));
    }
  }, []);

  // The fix is taken while the viewfinder is up, so it belongs to the moment of the photo.
  // Deferred a tick so the camera preview paints first instead of waiting behind a GPS lock.
  useEffect(() => {
    const timer = setTimeout(() => void takeFix(), 0);
    return () => clearTimeout(timer);
  }, [takeFix]);

  // Ask once on arrival rather than making the surveyor tap through a permission wall first.
  // Deferred a tick because the request updates hook state, which must not happen during commit.
  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain) return;
    const timer = setTimeout(() => void requestPermission(), 0);
    return () => clearTimeout(timer);
  }, [permission, requestPermission]);

  const shutter = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.9, exif: false });
      if (!shot) throw new Error('The camera returned no image.');
      setPhoto(await downscale({ uri: shot.uri, width: shot.width, height: shot.height }));
    } catch (e) {
      setError(errorMessage(e, 'Could not take the photo.'));
    } finally {
      setBusy(false);
    }
  };

  const missingRequired = fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = values[f.key];
      return v === undefined || v === '';
    });

  const save = async () => {
    if (!photo || !effectiveFix || !projectId) return;

    const viewShot = getViewShot();
    if (!viewShot) {
      // Uploading an unstamped photo would quietly strip the evidence the coordinates provide.
      setError(`A survey cannot be saved without stamping the photo. ${DEV_BUILD_REQUIRED}`);
      return;
    }
    if (missingRequired.length) {
      setError(`Please fill in: ${missingRequired.map((f) => f.label ?? f.key).join(', ')}.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const surveyId = randomUUID();
      const photoId = randomUUID();

      const stampedUri = await viewShot.captureRef(stageRef, {
        format: 'jpg',
        quality: 0.85,
        result: 'tmpfile',
      });
      const storedUri = await storePhoto(stampedUri, photoId);

      const details = buildDetails(fields, values);
      if (note.trim()) details.catatan = note.trim();

      await addItem({
        id: surveyId,
        projectId,
        projectName: project?.name ?? '',
        latitude: effectiveFix.latitude,
        longitude: effectiveFix.longitude,
        accuracyMeters: effectiveFix.accuracy,
        capturedAtUtc: new Date(effectiveFix.timestamp).toISOString(),
        detailsJson: JSON.stringify(details),
        photoId,
        photoUri: storedUri,
        status: 'pending',
        createdAt: Date.now(),
      });

      await refresh();
      void syncNow();
      router.back();
    } catch (e) {
      setError(errorMessage(e, 'Could not save the survey.'));
    } finally {
      setBusy(false);
    }
  };

  /* ── review ─────────────────────────────────────────────────────────── */

  if (photo) {
    return (
      <View style={[styles.dark, { paddingTop: insets.top }]}>
        <View style={styles.reviewBar}>
          <Text style={styles.reviewTitle}>Review photo</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.previewWrap}>
            <WatermarkedPhoto uri={photo.uri} width={PREVIEW_WIDTH} aspect={aspect} lines={lines} />
          </View>

          <View style={styles.form}>
            <ErrorNote message={error} />
            {!canStamp ? (
              <ErrorNote message={`Saving is unavailable. ${DEV_BUILD_REQUIRED}`} />
            ) : null}

            {/* Location: the GPS fix taken in the viewfinder, or manual entry when GPS is unusable. */}
            <View style={styles.locationBlock}>
              <View style={styles.locationHead}>
                <Text style={styles.locationLabel}>Location</Text>
                <Pressable onPress={() => setManual((m) => !m)} hitSlop={6}>
                  <Text style={styles.locationToggle}>{manual ? 'Use GPS' : 'Enter manually'}</Text>
                </Pressable>
              </View>

              {manual ? (
                <>
                  <View style={styles.coordRow}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Latitude"
                        value={manualLat}
                        onChangeText={setManualLat}
                        keyboardType="numbers-and-punctuation"
                        placeholder="-0.037622"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Longitude"
                        value={manualLng}
                        onChangeText={setManualLng}
                        keyboardType="numbers-and-punctuation"
                        placeholder="111.283981"
                      />
                    </View>
                  </View>
                  <Text style={styles.locationHint}>
                    {manualFix
                      ? 'Entered manually — no accuracy recorded.'
                      : 'Decimal degrees. Latitude -90 to 90, longitude -180 to 180.'}
                  </Text>
                </>
              ) : fix ? (
                <Text style={styles.locationValue}>
                  {`${formatCoords(fix.latitude, fix.longitude)} ${formatAccuracy(fix.accuracy)}`.trim()}
                </Text>
              ) : (
                <Text style={styles.locationHint}>{gpsError ?? 'Getting a location fix…'}</Text>
              )}
            </View>

            <Field
              label="Catatan"
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Deskripsi lokasi / kondisi / keterangan…"
            />

            {fields.map((field) => {
              const type = field.type.toLowerCase();
              const label = field.label ?? field.key;

              if (type === 'boolean' || type === 'bool') {
                return (
                  <View key={field.key} style={styles.switchRow}>
                    <Text style={[T.body, { flex: 1 }]}>{label}</Text>
                    <Switch
                      value={Boolean(values[field.key])}
                      onValueChange={(v) => setValues((p) => ({ ...p, [field.key]: v }))}
                      trackColor={{ true: C.accent, false: C.line85 }}
                    />
                  </View>
                );
              }

              return (
                <Field
                  key={field.key}
                  label={label}
                  required={field.required}
                  value={String(values[field.key] ?? '')}
                  onChangeText={(v) => setValues((p) => ({ ...p, [field.key]: v }))}
                  keyboardType={type === 'number' || type === 'integer' ? 'numeric' : 'default'}
                  placeholder={type === 'date' ? 'YYYY-MM-DD' : undefined}
                />
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.reviewActions, { paddingBottom: insets.bottom + 22 }]}>
          <Pressable
            onPress={() => setPhoto(null)}
            style={({ pressed }) => [styles.retake, { opacity: pressed ? 0.7 : 1 }]}>
            <Text style={styles.retakeText}>Retake</Text>
          </Pressable>
          <Button
            title={busy ? 'Saving…' : 'Use photo'}
            onPress={save}
            busy={busy}
            disabled={!effectiveFix || !canStamp}
            style={{ flex: 1 }}
          />
        </View>

        {/*
          The surface `captureRef` snapshots. Parked far off-screen rather than hidden with
          opacity, because a zero-opacity view snapshots as blank on some Android devices.
          `collapsable={false}` stops Android optimising the container away before capture.
        */}
        {effectiveFix ? (
          <View style={styles.stage} pointerEvents="none">
            <View ref={stageRef} collapsable={false}>
              <WatermarkedPhoto uri={photo.uri} width={stagePixels} aspect={aspect} lines={lines} />
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  /* ── viewfinder ─────────────────────────────────────────────────────── */

  return (
    <View style={styles.dark}>
      {permission?.granted ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={styles.permission}>
          {permission ? (
            <>
              <Text style={styles.permissionText}>
                GeoFold needs the camera to photograph the survey point.
              </Text>
              <Button title="Grant camera access" onPress={() => void requestPermission()} />
            </>
          ) : (
            <Loading />
          )}
        </View>
      )}

      {/* Rule-of-thirds guides, inset like the design. */}
      <View style={styles.guides} pointerEvents="none">
        <View style={[styles.vLine, { left: '33.3%' }]} />
        <View style={[styles.vLine, { left: '66.6%' }]} />
        <View style={[styles.hLine, { top: '33.3%' }]} />
        <View style={[styles.hLine, { top: '66.6%' }]} />
      </View>

      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={8}>
          <Close />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {project?.name ?? 'Capture'}
        </Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <View style={[styles.coordBox, { bottom: insets.bottom + 130 }]}>
        {fix ? (
          <>
            <Text style={styles.coordPrimary}>{formatCoords(fix.latitude, fix.longitude)}</Text>
            <Text style={styles.coordSecondary}>
              {formatAccuracy(fix.accuracy)} GPS · {new Date(fix.timestamp).toLocaleTimeString()}
            </Text>
          </>
        ) : (
          <Text style={styles.coordSecondary}>{gpsError ?? 'Getting a location fix…'}</Text>
        )}
      </View>

      {error ? (
        <View style={[styles.errorFloat, { bottom: insets.bottom + 200 }]}>
          <ErrorNote message={error} />
        </View>
      ) : null}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={[styles.shutterBar, { paddingBottom: insets.bottom + 26 }]}>
        <View style={styles.shutterSide} />
        <Pressable onPress={shutter} disabled={busy || !permission?.granted} style={styles.shutterRing}>
          <View style={[styles.shutterCore, busy ? { opacity: 0.5 } : null]} />
        </Pressable>
        <Pressable onPress={() => void takeFix()} style={styles.shutterSideRound} hitSlop={8} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: '#15181c' },

  guides: { position: 'absolute', top: 24, left: 24, right: 24, bottom: 24 },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  hLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
    paddingHorizontal: 8,
    fontFamily: Fonts.sans,
  },

  coordBox: {
    position: 'absolute',
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  coordPrimary: { fontFamily: Fonts.mono, fontSize: 12, color: '#fff' },
  coordSecondary: { fontFamily: Fonts.mono, fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  errorFloat: { position: 'absolute', left: 16, right: 16 },

  shutterBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 18,
  },
  shutterSide: { width: 34, height: 34, borderWidth: 1.8, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 6 },
  shutterSideRound: {
    width: 34,
    height: 34,
    borderWidth: 1.8,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 17,
  },
  shutterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },

  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permissionText: { color: '#fff', fontSize: 15, textAlign: 'center', fontFamily: Fonts.sans },

  reviewBar: { paddingVertical: 14, alignItems: 'center' },
  reviewTitle: { fontSize: 13, fontWeight: '500', color: '#fff', fontFamily: Fonts.sans },
  previewWrap: { alignItems: 'center', paddingBottom: 20 },
  form: {
    backgroundColor: C.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: 20,
    minHeight: 240,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },

  locationBlock: { marginBottom: 14 },
  locationHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  locationLabel: { fontSize: 13, color: C.ink55, fontFamily: Fonts.sans },
  locationToggle: { fontSize: 13, fontWeight: '500', color: C.accent, fontFamily: Fonts.sans },
  locationValue: { fontSize: 13, color: C.ink30, fontFamily: Fonts.mono },
  locationHint: { fontSize: 12, color: C.ink55, fontFamily: Fonts.sans },
  coordRow: { flexDirection: 'row', gap: 10 },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: C.surface,
  },
  retake: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.line88,
  },
  retakeText: { fontSize: 15, fontWeight: '500', color: C.ink30, fontFamily: Fonts.sans },

  stage: { position: 'absolute', left: -10000, top: 0 },
});
