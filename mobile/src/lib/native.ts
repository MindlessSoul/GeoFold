/**
 * Optional native modules — present in a development build, absent in Expo Go.
 *
 * These resolve their native counterpart at module scope and *throw* when it is missing. Expo
 * Router requires every route file at startup to build its route tree, so a plain top-level import
 * of either one takes the whole app down before it renders a single screen.
 *
 * Requiring them lazily, behind a catch, turns that into one feature being unavailable instead.
 * The result is cached so a missing module costs one failed require rather than one per call.
 */

type ViewShot = typeof import('react-native-view-shot');
type MapLibre = typeof import('@maplibre/maplibre-react-native');

// `undefined` = not attempted yet, `null` = attempted and unavailable.
let viewShot: ViewShot | null | undefined;
let mapLibre: MapLibre | null | undefined;

export function getViewShot(): ViewShot | null {
  if (viewShot === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- deferring the load is the point
      viewShot = require('react-native-view-shot') as ViewShot;
    } catch {
      viewShot = null;
    }
  }
  return viewShot;
}

export function getMapLibre(): MapLibre | null {
  if (mapLibre === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- deferring the load is the point
      mapLibre = require('@maplibre/maplibre-react-native') as MapLibre;
    } catch {
      mapLibre = null;
    }
  }
  return mapLibre;
}

/** Shown wherever a feature is disabled because the native module isn't in the running client. */
export const DEV_BUILD_REQUIRED =
  'This needs a development build — the native module it uses is not part of Expo Go.';
