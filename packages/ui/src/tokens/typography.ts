export type TypographyStyle = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '300' | '400' | '500' | '600' | '700';
  letterSpacing?: number;
};

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  headline: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  subhead: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: 0.2 },
} as const satisfies Record<string, TypographyStyle>;

export type TypographyVariant = keyof typeof typography;

// The phone's monospace font, for keys, fingerprints and secrets (`Text mono`), picked with Platform.select
export const monoFont = { ios: 'Menlo', default: 'monospace' } as const;

// Above this text size the phone uses an accessibility size: between iOS's largest normal size (1.353 in
// React Native) and Android's 150%; iOS's first accessibility size (AX1) is 1.786
export const accessibilityTextScale = 1.4;

// The splash's name, drawn as part of the logo. Not Text variants: it never grows with the phone's text size.
export const brandTypography = {
  splashName: { fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: -0.6 },
  splashNameLight: { fontSize: 40, lineHeight: 48, fontWeight: '300', letterSpacing: 4.3 },
} as const satisfies Record<string, TypographyStyle>;
