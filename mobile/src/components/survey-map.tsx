import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pin } from './icons';
import { Empty } from './ui';
import { C, Fonts, Radius, STATUS } from '@/constants/theme';
import { DEV_BUILD_REQUIRED, getMapLibre } from '@/lib/native';
// Type-only import: erased at compile time, so it does NOT load the native module at runtime and
// is safe in Expo Go (unlike the deferred require in native.ts, which the map itself still needs).
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

/**
 * The map, rendered with MapLibre over OpenFreeMap tiles.
 *
 * Deliberately not Google Maps: the Android Maps SDK needs an API key from a billing-enabled Google
 * Cloud account. MapLibre is MIT and OpenFreeMap serves vector tiles with no key and no account, so
 * the app has no paid dependency. OpenFreeMap is donation-funded with no SLA — fine here, but a
 * production deployment should self-host tiles or use a paid provider.
 *
 * Everything MapLibre-shaped lives in this one file so the rest of the app never imports it
 * directly — see `lib/native.ts` for why that matters.
 */

/** Light, low-chroma basemap — the closest match to the design's pale map. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

/**
 * Satellite basemap as an inline raster style, mirroring the web map. Esri World Imagery needs no
 * key or billing account (the same reason positron is the street default), plus a transparent
 * boundaries/places overlay so the imagery still carries names.
 *
 * NOTE the {z}/{y}/{x} tile order — Esri differs from the OSM {z}/{x}/{y} convention, and swapping
 * them yields blank tiles with no error. A style *object* is passed, not a JSON string: MapLibre
 * treats a string `mapStyle` as a URL, which would silently fail to load.
 */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Tiles © Esri — Esri, Maxar, Earthstar Geographics',
    },
    'esri-labels': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'esri', type: 'raster', source: 'esri' },
    { id: 'esri-labels', type: 'raster', source: 'esri-labels' },
  ],
};

type Basemap = 'street' | 'satellite';

/** Roughly central Kalimantan, so an empty map still opens somewhere meaningful. */
const FALLBACK_CENTER: [number, number] = [111.284, -0.0376];

export interface SurveyMarker {
  id: string;
  coordinates: { latitude?: number; longitude?: number };
  title: string;
  showCallout: boolean;
  /** Still in the local outbox rather than on the server. */
  pending: boolean;
}

export function SurveyMap({
  markers,
  camera,
  onMarkerPress,
}: {
  markers: SurveyMarker[];
  camera?: { coordinates?: { latitude?: number; longitude?: number }; zoom?: number };
  onMarkerPress: (id?: string) => void;
}) {
  // Hooks must run unconditionally, before the platform/module early-returns below.
  const insets = useSafeAreaInsets();
  const [basemap, setBasemap] = useState<Basemap>('street');

  // Platform first: MapLibre is native-only, which is a different reason from a native client that
  // simply doesn't carry the module.
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return (
      <View style={styles.fallback}>
        <Empty>The map is available on the iOS and Android builds. Points are listed under Gallery.</Empty>
      </View>
    );
  }

  const lib = getMapLibre();
  if (!lib) {
    return (
      <View style={styles.fallback}>
        <Empty>{`The map is unavailable. ${DEV_BUILD_REQUIRED}`}</Empty>
      </View>
    );
  }

  const { Map, Camera, Marker } = lib;

  const center: [number, number] =
    camera?.coordinates?.longitude != null && camera?.coordinates?.latitude != null
      ? [camera.coordinates.longitude, camera.coordinates.latitude]
      : FALLBACK_CENTER;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Map
        mapStyle={basemap === 'satellite' ? SATELLITE_STYLE : STYLE_URL}
        style={StyleSheet.absoluteFill}
        attribution
        logo={false}>
        <Camera center={center} zoom={camera?.zoom ?? 12} duration={600} />

        {markers.map((marker) => {
          const { latitude, longitude } = marker.coordinates;
          if (latitude == null || longitude == null) return null;

          return (
            <Marker
              key={marker.id}
              id={marker.id}
              lngLat={[longitude, latitude]}
              anchor="bottom"
              onPress={() => onMarkerPress(marker.id)}>
              {/* Marker children let this be the design's own teardrop pin, coloured by sync state. */}
              <View style={styles.pinWrap}>
                <Pin color={marker.pending ? STATUS.pending.color : C.accent} size={30} />
              </View>
            </Marker>
          );
        })}
      </Map>

      {/* Street / Satellite toggle. Bottom-left keeps it clear of the search row, chips and FAB. */}
      <View style={[styles.basemapToggle, { bottom: insets.bottom + 24 }]}>
        {(['street', 'satellite'] as const).map((key) => {
          const active = basemap === key;
          return (
            <Pressable
              key={key}
              onPress={() => setBasemap(key)}
              style={[styles.basemapButton, active && styles.basemapButtonActive]}>
              <Text style={[styles.basemapText, active && styles.basemapTextActive]}>
                {key === 'street' ? 'Street' : 'Satellite'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: C.surface },
  // The pin art is a rotated square, so it needs room to not clip at the marker bounds.
  pinWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

  basemapToggle: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: Radius.pill,
    padding: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  basemapButton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill },
  basemapButtonActive: { backgroundColor: C.accent },
  basemapText: { fontSize: 12, fontWeight: '500', color: C.ink46, fontFamily: Fonts.sans },
  basemapTextActive: { color: '#fff' },
});
