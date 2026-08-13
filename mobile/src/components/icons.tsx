import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { C } from '@/constants/theme';

/**
 * The design draws its own icon set rather than pulling one in — teardrop pin, three-line list,
 * 2x2 grid, cloud, bust — some as SVG paths and some as pure CSS shapes. These are transcriptions
 * of those, so the app carries the same drawing rather than an approximate Material lookalike.
 */

export function Chevron({ color = C.ink75, size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={(size * 7) / 12} height={size} viewBox="0 0 7 12">
      <Path
        d="M1 1L6 6L1 11"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BackChevron({ color = C.ink, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path
        d="M12.5 4L6.5 10L12.5 16"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Close({ color = '#fff', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Path d="M1 1L13 13M13 1L1 13" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function Check({ color = '#fff', size = 10 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={(size * 8) / 10} viewBox="0 0 10 8">
      <Path
        d="M1 4L3.5 6.5L9 1"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Search({ color = C.ink55, size = 17 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 17 17">
      <Circle cx={7} cy={7} r={5.5} stroke={color} strokeWidth={1.6} fill="none" />
      <Line x1={11.2} y1={11.2} x2={15.5} y2={15.5} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function Cloud({ color = C.ink30, size = 19 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 19 19">
      <Path
        d="M5 13.5a3.4 3.4 0 01-.6-6.75 4.3 4.3 0 018.3-1.4 3.6 3.6 0 01-.4 8.15H5z"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Teardrop map pin. A rotated square with three round corners — the design's own trick. */
export function Pin({
  color = C.accent,
  size = 30,
  filled = true,
  border = 2,
}: {
  color?: string;
  size?: number;
  filled?: boolean;
  border?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderBottomLeftRadius: 0,
        transform: [{ rotate: '-45deg' }],
        backgroundColor: filled ? color : 'transparent',
        borderWidth: filled ? border : 2.2,
        borderColor: filled ? '#fff' : color,
      }}
    />
  );
}

export function ListIcon({ color, size = 20 }: { color: string; size?: number }) {
  const bar = (top: number, right: number) => ({
    position: 'absolute' as const,
    top,
    left: 3,
    right,
    height: 2,
    backgroundColor: color,
  });
  return (
    <View style={{ width: size, height: size, borderRadius: 4, borderWidth: 2.2, borderColor: color }}>
      <View style={bar(3, 3)} />
      <View style={bar(8, 3)} />
      <View style={bar(13, 5)} />
    </View>
  );
}

export function GridIcon({ color, size = 20 }: { color: string; size?: number }) {
  const cell = (opacity: number) => ({
    width: (size - 2.5) / 2,
    height: (size - 2.5) / 2,
    backgroundColor: color,
    borderRadius: 2,
    opacity,
  });
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap: 2.5 }}>
      <View style={cell(1)} />
      <View style={cell(0.55)} />
      <View style={cell(0.55)} />
      <View style={cell(1)} />
    </View>
  );
}

export function PersonIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 2.2, borderColor: color }} />
      <View
        style={{
          width: 16,
          height: 8,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderWidth: 2.2,
          borderBottomWidth: 0,
          borderColor: color,
          marginTop: 1,
        }}
      />
    </View>
  );
}

/** The camera glyph used on the map FAB: body, hump and lens, all drawn with borders. */
export function CameraGlyph({ size = 24 }: { size?: number }) {
  const h = (size * 18) / 24;
  return (
    <View style={{ width: size, height: h, borderWidth: 2.2, borderColor: '#fff', borderRadius: 4 }}>
      <View
        style={{
          position: 'absolute',
          top: -6,
          left: 6,
          width: 8,
          height: 4,
          backgroundColor: '#fff',
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 1,
          left: 6.5,
          width: 9,
          height: 9,
          borderWidth: 2,
          borderColor: '#fff',
          borderRadius: 4.5,
        }}
      />
    </View>
  );
}
