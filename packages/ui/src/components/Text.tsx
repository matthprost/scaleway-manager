import type { ReactNode } from 'react';
import { Text as NativeText, Platform } from 'react-native';
import type { AccessibilityRole } from 'react-native';

import { useTheme } from '../theme';
import { monoFont } from '../tokens';
import type { ThemeColors, TypographyVariant } from '../tokens';

export type Tone =
  | 'default'
  | 'muted'
  | 'brand'
  | 'onBrand'
  | 'danger'
  // Button labels only
  | 'primaryButton'
  | 'onPrimaryButton'
  // Pill labels only
  | 'onBadge';

// Maps a tone name to a colour from the current theme.
export function toneColor(colors: ThemeColors, tone: Tone): string {
  const map: Record<Tone, string> = {
    default: colors.text,
    muted: colors.textMuted,
    brand: colors.brand,
    onBrand: colors.onBrand,
    danger: colors.alertText,
    primaryButton: colors.primaryButton,
    onPrimaryButton: colors.onPrimaryButton,
    onBadge: colors.onBadge,
  };

  return map[tone];
}

type TextProps = {
  variant: TypographyVariant;
  tone?: Tone;
  children: ReactNode;
  numberOfLines?: number;
  accessibilityRole?: AccessibilityRole;
  // What screen readers say, when it must differ from what is shown
  accessibilityLabel?: string;
  // Makes screen readers read the text when it changes (Android; iOS needs an announcement too)
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  // 'center' centres every line, wrapped ones too; 'end' lines them up on the other side (a value in a row)
  align?: 'start' | 'center' | 'end';
  // The variant in bold (700): picks one label out of a row, like the chart's selected month
  bold?: boolean;
  // One line that shrinks just enough when it doesn't fit (chart labels at the largest text sizes)
  shrinkToFit?: boolean;
  // The phone's monospace font, same size: keys, fingerprints, secrets
  mono?: boolean;
};

export function Text({
  variant,
  tone = 'default',
  children,
  numberOfLines,
  accessibilityRole,
  accessibilityLabel,
  accessibilityLiveRegion,
  align = 'start',
  bold = false,
  shrinkToFit = false,
  mono = false,
}: TextProps) {
  const { colors, typography } = useTheme();

  return (
    <NativeText
      numberOfLines={shrinkToFit ? 1 : numberOfLines}
      adjustsFontSizeToFit={shrinkToFit}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={accessibilityLiveRegion}
      style={[
        typography[variant],
        { color: toneColor(colors, tone) },
        align === 'center' ? { textAlign: 'center' } : null,
        // 'right' is the end of the line (React Native swaps it in right-to-left languages)
        align === 'end' ? { textAlign: 'right' } : null,
        bold ? { fontWeight: '700' } : null,
        mono ? { fontFamily: Platform.select(monoFont) } : null,
      ]}
    >
      {children}
    </NativeText>
  );
}
