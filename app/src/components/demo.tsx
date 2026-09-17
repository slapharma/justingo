// Building blocks for demo-only features: placeholder imagery and buttons that are deliberately not
// wired to anything yet. Kept separate from ui.tsx so it is obvious which parts of a screen are real.
import type { ReactNode } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight, Image as ImageIcon, Lock, type LucideIcon } from '../icons';
import { PHOTOS, photoUrl, type PhotoKey } from '../photos';
import { font, radius, space, useTheme } from '../theme';

export type Tier = 'free' | 'premium' | 'creator';

/** Grey striped box standing in for a photo that doesn't exist yet. */
export function Placeholder({ label, ratio = 16 / 9, style, icon: Icon = ImageIcon }: { label: string; ratio?: number; style?: StyleProp<ViewStyle>; icon?: LucideIcon }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Placeholder image: ${label}`}
      style={[
        styles.placeholder,
        { aspectRatio: ratio, backgroundColor: theme.surfaceAlt, borderColor: theme.border },
        Platform.OS === 'web' && ({ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 14px, rgba(0,0,0,0.035) 14px 28px)' } as never),
        style,
      ]}
    >
      <Icon color={theme.muted} size={24} strokeWidth={2} />
      <Text numberOfLines={2} style={[styles.placeholderText, { color: theme.muted }]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * A demo photo from the Unsplash set in photos.ts. `width` is roughly how wide it renders, used to
 * request a right-sized crop. Small thumbnails skip the photographer credit because it wouldn't fit.
 */
export function DemoPhoto({ photo, ratio = 16 / 9, width = 360, style }: { photo: PhotoKey; ratio?: number; width?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const p = PHOTOS[photo];
  return (
    <View style={[styles.photo, { aspectRatio: ratio, backgroundColor: theme.surfaceAlt }, style]}>
      <Image source={{ uri: photoUrl(p, width, ratio) }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={p.alt} accessible />
      {width >= 160 && (
        <View style={styles.credit} accessible={false}>
          <Text style={styles.creditText} numberOfLines={1}>
            {p.author} / Unsplash
          </Text>
        </View>
      )}
    </View>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  const theme = useTheme();
  if (tier === 'free') return null;
  const creator = tier === 'creator';
  return (
    <View style={[styles.tier, { backgroundColor: creator ? theme.contrast : theme.accent }]}>
      <Lock color={creator ? theme.onContrast : theme.onAccent} size={10} strokeWidth={3} />
      <Text style={[styles.tierText, { color: creator ? theme.onContrast : theme.onAccent }]}>{creator ? 'Creator' : 'Premium'}</Text>
    </View>
  );
}

/**
 * A button for a feature that is on screen but not built. Without `onPress` it is intentionally not
 * wired: pressing it does nothing, and `aria-description` tells screen reader users so it doesn't
 * read as broken. Pass `onPress` for the few demo buttons that navigate somewhere real.
 */
export function DemoButton({ label, icon: Icon, tier = 'free', variant = 'secondary', style, onPress }: { label: string; icon?: LucideIcon; tier?: Tier; variant?: 'primary' | 'secondary' | 'dark'; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const theme = useTheme();
  const colours = {
    primary: { bg: theme.accent, fg: theme.onAccent, border: theme.accent },
    secondary: { bg: theme.surface, fg: theme.ink, border: theme.border },
    dark: { bg: theme.contrast, fg: theme.onContrast, border: theme.contrast },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-description={onPress ? undefined : 'Demo only, not available yet'}
      style={({ pressed }) => [styles.demoButton, { backgroundColor: colours.bg, borderColor: colours.border, opacity: pressed ? 0.8 : 1 }, style]}
    >
      {Icon && <Icon color={colours.fg} size={18} strokeWidth={2.5} />}
      <Text style={[styles.demoButtonText, { color: colours.fg }]} numberOfLines={1}>
        {label}
      </Text>
      <TierBadge tier={tier} />
    </Pressable>
  );
}

/** A tappable row in a settings-style list. Unwired unless `onPress` is given. */
export function ListRow({ icon: Icon, title, detail, tier = 'free', onPress, right }: { icon?: LucideIcon; title: string; detail?: string; tier?: Tier; onPress?: () => void; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
      aria-description={onPress ? undefined : 'Demo only, not available yet'}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
    >
      {Icon && (
        <View style={[styles.rowIcon, { backgroundColor: theme.surfaceAlt }]}>
          <Icon color={theme.ink} size={18} strokeWidth={2.25} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.rowTitle, { color: theme.ink }]} numberOfLines={1}>
            {title}
          </Text>
          <TierBadge tier={tier} />
        </View>
        {detail ? (
          <Text style={[styles.rowDetail, { color: theme.muted }]} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
      {right ?? <ChevronRight color={theme.muted} size={20} />}
    </Pressable>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text accessibilityRole="header" style={[styles.sectionTitleText, { color: theme.ink }]}>
        {title}
      </Text>
      {action ? <Text style={[styles.sectionAction, { color: theme.accentText }]}>{action}</Text> : null}
    </View>
  );
}

/** Horizontal strip of cards that bleeds to the screen edge. */
export function Rail({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingHorizontal: space.lg }} style={{ marginHorizontal: -space.lg }}>
      {children}
    </ScrollView>
  );
}

/** Segmented control whose selection is local state only. */
export function Segmented({ options, value, onChange, label }: { options: string[]; value: string; onChange: (v: string) => void; label: string }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, { backgroundColor: theme.surfaceAlt }]}>
      {options.map((o) => {
        const selected = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} accessibilityRole="radio" aria-checked={selected} style={[styles.segment, selected && { backgroundColor: theme.contrast }]}>
            <Text style={[styles.segmentText, { color: selected ? theme.onContrast : theme.ink }]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: space.sm, overflow: 'hidden' },
  placeholderText: { fontFamily: font.bodyMedium, fontSize: 12, textAlign: 'center' },
  photo: { borderRadius: radius.md, overflow: 'hidden' },
  credit: { position: 'absolute', right: 6, bottom: 6, maxWidth: '90%', backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  creditText: { color: '#FFFFFF', fontFamily: font.bodyMedium, fontSize: 10 },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  tierText: { fontFamily: font.bodyBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  demoButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1.5, cursor: 'pointer' } as ViewStyle,
  demoButtonText: { fontFamily: font.bodyBold, fontSize: 15, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm, borderBottomWidth: 1, cursor: 'pointer' } as ViewStyle,
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: font.bodyBold, fontSize: 16, flexShrink: 1 },
  rowDetail: { fontFamily: font.body, fontSize: 14, lineHeight: 19 },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.lg },
  sectionTitleText: { fontFamily: font.display, fontSize: 24, textTransform: 'uppercase' },
  sectionAction: { fontFamily: font.bodyBold, fontSize: 14 },
  segmented: { flexDirection: 'row', borderRadius: radius.sm, padding: 3, gap: 2 },
  segment: { flex: 1, minHeight: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, cursor: 'pointer' } as ViewStyle,
  segmentText: { fontFamily: font.bodyBold, fontSize: 13 },
});
