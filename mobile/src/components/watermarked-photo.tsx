import { Image, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius } from '@/constants/theme';

/**
 * A photo with the coordinate block burned across it — the spec's "koordinat embedded di foto",
 * drawn as the design's inset translucent card rather than a full-width bar.
 *
 * Rendered twice: once visibly as the review preview, and once off-screen at full resolution as
 * the surface `captureRef` snapshots. Both go through this component so what the surveyor approves
 * is exactly what gets uploaded. Every dimension derives from `width`, so the two renders are the
 * same image at different scales.
 */
export function WatermarkedPhoto({
  uri,
  width,
  aspect,
  lines,
  onLoad,
}: {
  uri: string;
  /** Rendered width in dp. */
  width: number;
  /** height / width of the source photo. */
  aspect: number;
  /** First line is the primary (coordinates); the rest are secondary. */
  lines: string[];
  onLoad?: () => void;
}) {
  const height = Math.round(width * aspect);
  const inset = Math.round(width * 0.038);
  const primary = Math.max(9, Math.round(width * 0.031));
  const secondary = Math.max(8, Math.round(width * 0.028));

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Image source={{ uri }} style={{ width, height }} resizeMode="cover" onLoad={onLoad} />
      <View
        style={[
          styles.stamp,
          {
            left: inset,
            right: inset,
            bottom: inset,
            padding: Math.round(inset * 0.9),
            borderRadius: Math.max(6, Math.round(width * 0.026)),
          },
        ]}>
        {lines.map((line, i) => (
          <Text
            key={i}
            numberOfLines={1}
            style={[
              styles.text,
              i === 0
                ? { fontSize: primary, color: '#fff' }
                : { fontSize: secondary, color: 'rgba(255,255,255,0.7)' },
              { lineHeight: Math.round((i === 0 ? primary : secondary) * 1.4) },
            ]}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.md },
  text: { fontFamily: Fonts.mono },
});
