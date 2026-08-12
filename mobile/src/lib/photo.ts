import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { PixelRatio } from 'react-native';

export const MAX_EDGE = 1600;

export interface RawPhoto {
  uri: string;
  width: number;
  height: number;
}

/**
 * Opens the camera and returns a photo already downscaled to a 1600 px longest edge — the same cap
 * the web client applies. Doing it here keeps the outbox small and the upload short over a weak
 * connection. Returns null if the surveyor backed out.
 */
export async function takePhoto(): Promise<RawPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is required to attach a photo.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    exif: false,
  });
  if (result.canceled || !result.assets.length) return null;

  return downscale(result.assets[0]);
}

/** Lets a surveyor attach a photo already taken with the system camera app. */
export async function pickPhoto(): Promise<RawPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to attach a photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    exif: false,
  });
  if (result.canceled || !result.assets.length) return null;

  return downscale(result.assets[0]);
}

/**
 * Caps the longest edge at 1600 px and re-encodes as JPEG. Shared by the in-app viewfinder, the
 * system camera and the library picker so every route into the outbox produces the same shape.
 */
export async function downscale(asset: RawPhoto): Promise<RawPhoto> {
  const longest = Math.max(asset.width, asset.height);
  if (longest <= MAX_EDGE) {
    return { uri: asset.uri, width: asset.width, height: asset.height };
  }

  const scale = MAX_EDGE / longest;
  const context = ImageManipulator.manipulate(asset.uri).resize({
    width: Math.round(asset.width * scale),
    height: Math.round(asset.height * scale),
  });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });

  return { uri: saved.uri, width: saved.width, height: saved.height };
}

/**
 * Width in dp for the off-screen stage that gets snapshotted.
 *
 * `captureRef` renders at the view's real pixel size, so sizing the stage as
 * `target / devicePixelRatio` lands the output near MAX_EDGE without upscaling a smaller capture.
 */
export function stageWidth(): number {
  const ratio = PixelRatio.get() || 1;
  return Math.min(MAX_EDGE, Math.max(320, Math.round(MAX_EDGE / ratio)));
}
