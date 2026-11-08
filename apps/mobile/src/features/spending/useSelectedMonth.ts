import { monthKeyOf, monthRange } from '@scaleway-manager/core';
import type { MonthKey } from '@scaleway-manager/core';
import { useState } from 'react';

import { useServices } from '../../wiring/ServicesProvider';

export type SelectedMonth = {
  range: 6 | 12;
  setRange: (range: 6 | 12) => void;
  // null: "now", this month
  selected: MonthKey | null;
  select: (month: MonthKey | null) => void;
};

// How many months the chart shows, and the month picked on it (null: now).
export function useSelectedMonth(initialRange: 6 | 12): SelectedMonth {
  const { clock } = useServices();
  const [range, keepRange] = useState(initialRange);
  const [picked, select] = useState<MonthKey | null>(null);
  // A month the chart no longer shows (a new month began) means now
  const selected = picked !== null && monthRange(monthKeyOf(clock.now()), range).includes(picked) ? picked : null;

  // Another range starts again from now
  const setRange = (next: 6 | 12) => {
    keepRange(next);
    select(null);
  };

  return { range, setRange, selected, select };
}
