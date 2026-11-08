import { sizes, spacing, typography } from '../tokens';

// Where the floating notice (the offline Pill) sits, and how far down a screen must start so it covers nothing.
export function noticeLayout(insetTop: number, fontScale: number): { top: number; clearance: number } {
  const top = insetTop + spacing.xxs;
  // The long offline label wraps at larger text sizes: one more caption line per step of text size
  const lines = Math.ceil(fontScale);
  // A Pill: its caption lines (which grow with the text size) or its icon, plus its padding
  const pill = Math.max(sizes.iconSm, lines * typography.caption.lineHeight * fontScale) + 2 * spacing.xxs;

  return { top, clearance: top + pill + spacing.xs };
}
