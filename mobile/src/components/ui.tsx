import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron, Chevron } from './icons';
import { C, Fonts, Radius, STATUS, type StatusKey } from '@/constants/theme';

/* ── layout ─────────────────────────────────────────────────────────────── */

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const pad = padded ? { paddingHorizontal: 20, paddingBottom: insets.bottom + 24 } : null;

  if (!scroll) {
    return <View style={[styles.screen, pad, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[pad, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

/** Detail-screen header: 40px back target, 16/500 title, hairline rule. */
export function Header({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.headerBack} hitSlop={6}>
          <BackChevron />
        </Pressable>
      ) : (
        <View style={{ width: 12 }} />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

/** Tab-screen header: 26/700 title over a 13px subtitle. */
export function TabTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ paddingTop: 20, paddingBottom: 12 }}>
      <Text style={styles.tabTitle}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { marginTop: 4 }]}>{subtitle}</Text> : null}
    </View>
  );
}

/* ── controls ───────────────────────────────────────────────────────────── */

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? C.accent : C.surface,
          borderColor: active ? C.accent : C.line88,
        },
      ]}>
      <Text style={[styles.chipText, { color: active ? '#fff' : C.ink42 }]}>{label}</Text>
    </Pressable>
  );
}

export function StatusPill({ status, label }: { status: StatusKey; label?: string }) {
  const meta = STATUS[status] ?? STATUS.none;
  return (
    <View style={[styles.pill, { backgroundColor: meta.bg }]}>
      <Text style={[styles.pillText, { color: meta.color }]}>{label ?? meta.label}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  size = 'md',
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'subtle' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || busy;
  const palette = {
    primary: { bg: C.accent, fg: '#fff', border: C.accent },
    outline: { bg: 'transparent', fg: C.ink30, border: C.line90 },
    subtle: { bg: C.bg95, fg: C.ink30, border: C.bg95 },
    danger: { bg: 'transparent', fg: C.danger, border: C.line90 },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' ? { paddingVertical: 16, borderRadius: Radius.lg } : null,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {busy ? <ActivityIndicator size="small" color={palette.fg} style={{ marginRight: 8 }} /> : null}
      <Text style={[styles.buttonText, size === 'lg' ? { fontSize: 16 } : null, { color: palette.fg }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={C.ink62}
      {...props}
      style={[styles.input, props.multiline ? styles.inputMultiline : null, props.style]}
    />
  );
}

export function Field({
  label,
  required,
  ...props
}: TextInputProps & { label?: string; required?: boolean }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? (
        <Text style={styles.fieldLabel}>
          {label}
          {required ? <Text style={{ color: C.danger }}> *</Text> : null}
        </Text>
      ) : null}
      <Input {...props} />
    </View>
  );
}

/** Segmented control — the design's Sign in / Create account switch. */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.segment, active ? { backgroundColor: C.accent } : null]}>
            <Text style={[styles.segmentText, { color: active ? '#fff' : C.ink46 }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── containers ─────────────────────────────────────────────────────────── */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Grouped rows inside one rounded outline, dividers between — the Profile pattern. */
export function RowGroup({ children }: { children: ReactNode }) {
  return <View style={styles.rowGroup}>{children}</View>;
}

export function Row({
  label,
  value,
  onPress,
  last,
  right,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  right?: ReactNode;
}) {
  const content = (
    <View style={[styles.row, last ? { borderBottomWidth: 0 } : null]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right ?? (onPress ? <Chevron /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, pct))}%` }]} />
    </View>
  );
}

/** Diagonal hatch used wherever the design stands in for a photo. */
export function Hatch({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <View style={[{ backgroundColor: C.hatchA, overflow: 'hidden' }, style]}>
      {Array.from({ length: 14 }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: -40,
            bottom: -40,
            left: i * 20 - 30,
            width: 10,
            backgroundColor: C.hatchB,
            transform: [{ rotate: '45deg' }],
          }}
        />
      ))}
      {children}
    </View>
  );
}

export function Toast({ text }: { text: string | null }) {
  const insets = useSafeAreaInsets();
  if (!text) return null;
  return (
    <View style={[styles.toast, { bottom: insets.bottom + 80 }]} pointerEvents="none">
      <Text style={styles.toastText}>{text}</Text>
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={[styles.subtitle, { textAlign: 'center' }]}>{children}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={C.accent} />
      {label ? <Text style={[styles.subtitle, { marginTop: 10 }]}>{label}</Text> : null}
    </View>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.errorNote}>
      <Text style={{ color: C.danger, fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans }}>
        {message}
      </Text>
    </View>
  );
}

/* ── text ───────────────────────────────────────────────────────────────── */

export const T = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '700', color: C.ink, fontFamily: Fonts.sans },
  h2: { fontSize: 21, fontWeight: '700', color: C.ink, lineHeight: 26, fontFamily: Fonts.sans },
  section: { fontSize: 15, fontWeight: '600', color: C.ink, fontFamily: Fonts.sans },
  body: { fontSize: 14, color: C.ink30, lineHeight: 20, fontFamily: Fonts.sans },
  sub: { fontSize: 13, color: C.ink55, fontFamily: Fonts.sans },
  caption: { fontSize: 12, color: C.ink55, fontFamily: Fonts.sans },
  mono: { fontSize: 13, color: C.ink46, fontFamily: Fonts.mono },
  monoSm: { fontSize: 11, color: C.ink55, fontFamily: Fonts.mono },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.line92,
    backgroundColor: C.surface,
  },
  headerBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  headerTitle: { fontSize: 16, fontWeight: '500', color: C.ink, fontFamily: Fonts.sans },

  tabTitle: { fontSize: 26, fontWeight: '700', color: C.ink, fontFamily: Fonts.sans },
  subtitle: { fontSize: 13, color: C.ink55, fontFamily: Fonts.sans },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500', fontFamily: Fonts.sans },

  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '500', fontFamily: Fonts.sans },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  buttonText: { fontSize: 15, fontWeight: '500', fontFamily: Fonts.sans },

  input: {
    borderWidth: 1,
    borderColor: C.line88,
    backgroundColor: C.bg98,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.ink,
    fontFamily: Fonts.sans,
  },
  inputMultiline: { height: 92, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 13, color: C.ink55, marginBottom: 6, fontFamily: Fonts.sans },

  segmented: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: C.bg95,
    borderRadius: Radius.md,
    padding: 4,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  segmentText: { fontSize: 14, fontWeight: '500', fontFamily: Fonts.sans },

  card: { borderWidth: 1, borderColor: C.line90, borderRadius: Radius.xl, padding: 18 },
  rowGroup: { borderWidth: 1, borderColor: C.line90, borderRadius: Radius.xl, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.line92,
  },
  rowLabel: { flex: 1, fontSize: 15, color: C.ink, fontFamily: Fonts.sans },
  rowValue: { fontSize: 13, color: C.ink55, fontFamily: Fonts.sans },

  progressTrack: { height: 6, borderRadius: 3, backgroundColor: C.line92, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: C.accent },

  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: C.ink,
    borderRadius: Radius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    zIndex: 9,
  },
  toastText: { color: '#fff', fontSize: 13, textAlign: 'center', fontFamily: Fonts.sans },

  empty: {
    borderWidth: 1,
    borderColor: C.line90,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    padding: 24,
  },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  errorNote: {
    backgroundColor: C.dangerBg,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 16,
  },
});
