import { SegmentedControl } from '@scaleway-manager/ui';

import type { SelectedMonth } from './useSelectedMonth';

const RANGES = [
  { key: '6M', label: '6M', accessibilityLabel: '6 months' },
  { key: '12M', label: '12M', accessibilityLabel: '12 months' },
] as const;

// The 6M / 12M switch of a purple spending header.
export function RangeSwitch({ selection }: { selection: SelectedMonth }) {
  const { range, setRange } = selection;

  return (
    <SegmentedControl
      options={RANGES}
      value={range === 6 ? '6M' : '12M'}
      onChange={(key) => setRange(key === '6M' ? 6 : 12)}
      tone="onBrand"
      accessibilityLabel="Range"
    />
  );
}
