import type { ComponentProps } from 'react';

import type { Health } from './HealthDot';
import { Pill } from './Pill';

// Each health's Pill: readable words on the health's colour, never the colour as text
const PILL_TONE = {
  ok: 'success',
  busy: 'brand',
  warning: 'warning',
  error: 'danger',
  stopped: 'neutral',
} as const satisfies Record<Health, ComponentProps<typeof Pill>['tone']>;

type StatusPillProps = {
  // The status word: "Running", "Needs attention"
  label: string;
  health: Health;
};

// A resource's status: its word in a Pill of its health's tone.
export function StatusPill({ label, health }: StatusPillProps) {
  return <Pill tone={PILL_TONE[health]} label={label} />;
}
