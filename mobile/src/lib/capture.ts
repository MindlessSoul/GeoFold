import * as Location from 'expo-location';

import type { FormField } from './types';

export interface Fix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

/**
 * Asks for foreground location permission and takes a high-accuracy fix.
 *
 * `getCurrentPositionAsync` with `BestForNavigation` can sit for a while under canopy, so the
 * caller shows a spinner and the surveyor can retry — an inaccurate point is worse than a slow one.
 */
export async function getFix(): Promise<Fix> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to record where a survey was taken.');
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error('Location services are turned off. Enable GPS and try again.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    timestamp: position.timestamp,
  };
}

/** Coerces the form's string inputs into the JSON types the server's schema validator expects. */
export function buildDetails(
  fields: FormField[],
  values: Record<string, string | boolean>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.key];
    if (value === undefined || value === '') continue;

    switch (field.type.toLowerCase()) {
      case 'number':
        out[field.key] = Number(value);
        break;
      case 'integer':
        out[field.key] = parseInt(String(value), 10);
        break;
      case 'boolean':
      case 'bool':
        out[field.key] = Boolean(value);
        break;
      default:
        out[field.key] = String(value);
    }
  }
  return out;
}

export function formatCoords(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function formatAccuracy(accuracy: number | null): string {
  return accuracy == null ? '' : `±${Math.round(accuracy)}m`;
}

/** The lines burned into the photo — coordinates first, then when it was taken. */
export function stampLines(fix: Fix): string[] {
  return [
    `${formatCoords(fix.latitude, fix.longitude)} ${formatAccuracy(fix.accuracy)}`.trim(),
    new Date(fix.timestamp).toLocaleString(),
  ];
}
