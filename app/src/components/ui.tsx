import type { LucideIcon } from '../icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { font, radius, space, useTheme, type Theme } from '../theme';

export function Heading({ children, size = 28, style, theme: override }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle>; theme?: Theme }) {
  const theme = useTheme();
  const t = override ?? theme;
  return (
    <Text accessibilityRole="header" style={[{ fontFamily: font.display, fontSize: size, color: t.ink, lineHeight: size * 1.05, textTransform: 'uppercase', letterSpacing: 0.3 }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, muted, style, numberOfLines }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const theme = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: font.body, fontSize: 16, lineHeight: 23, color: muted ? theme.muted : theme.ink }, style]}>
      {children}
    </Text>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  icon: Icon,
  variant = 'primary',
  disabled,
  loading,
  style,
  size = 'md',
  theme: override,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'lg';
  theme?: Theme;
  accessibilityLabel?: string;
}) {
  const appTheme = useTheme();
  const theme = override ?? appTheme;
  const colours: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.accent, fg: theme.onAccent, border: theme.accent },
    secondary: { bg: theme.surface, fg: theme.ink, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.ink, border: 'transparent' },
    danger: { bg: theme.danger, fg: theme.onDanger, border: theme.danger },
  };
  const c = colours[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      aria-disabled={!!inactive}
      aria-busy={!!loading}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        size === 'lg' && styles.buttonLg,
        { backgroundColor: c.bg, borderColor: c.border, opacity: inactive ? 0.5 : pressed ? 0.8 : hovered ? 0.92 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={c.fg} /> : Icon ? <Icon color={c.fg} size={size === 'lg' ? 24 : 20} strokeWidth={2.5} /> : null}
      {label ? (
        <Text style={{ fontFamily: font.display, fontSize: size === 'lg' ? 22 : 18, color: c.fg, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function IconButton({ icon: Icon, onPress, label, theme: override, active }: { icon: LucideIcon; onPress: () => void; label: string; theme?: Theme; active?: boolean }) {
  const appTheme = useTheme();
  const theme = override ?? appTheme;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: active ? theme.accent : theme.surface, borderColor: active ? theme.accent : theme.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Icon color={active ? theme.onAccent : theme.ink} size={22} strokeWidth={2.25} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      aria-selected={selected}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? theme.ink : theme.surface, borderColor: selected ? theme.ink : theme.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: selected ? theme.bg : theme.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Stat({ label, value, unit, large, theme: override }: { label: string; value: string; unit?: string; large?: boolean; theme?: Theme }) {
  const appTheme = useTheme();
  const theme = override ?? appTheme;
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: font.display, fontSize: large ? 40 : 26, color: theme.ink, fontVariant: ['tabular-nums'] }}>
        {value}
        {unit ? <Text style={{ fontFamily: font.displaySemi, fontSize: large ? 20 : 15, color: theme.muted }}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: tone === 'accent' ? theme.accent : theme.surfaceAlt }]}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: tone === 'accent' ? theme.onAccent : theme.ink, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  const theme = useTheme();
  const base = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [...base, { borderColor: hovered ? theme.accent : theme.border, opacity: pressed ? 0.85 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceAlt }]}>
        <Icon color={theme.accentText} size={32} strokeWidth={2} />
      </View>
      <Heading size={26} style={{ textAlign: 'center' }}>
        {title}
      </Heading>
      <Body muted style={{ textAlign: 'center', maxWidth: 300 }}>
        {body}
      </Body>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    cursor: 'pointer',
  } as ViewStyle,
  buttonLg: { minHeight: 60, borderRadius: radius.lg },
  iconButton: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as ViewStyle,
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, justifyContent: 'center', cursor: 'pointer' } as ViewStyle,
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  card: { borderRadius: radius.lg, borderWidth: 1.5, padding: space.lg },
  empty: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.xxl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
