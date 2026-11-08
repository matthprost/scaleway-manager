import { formatMoney, topParts } from '@scaleway-manager/core';
import type { Money } from '@scaleway-manager/core';

// A BreakdownBar's segments: the three biggest parts (they come largest first), then the rest as "Other".
export const breakdownSegments = (parts: { label: string; amount: Money }[]) =>
  topParts(parts).map((part) => ({ label: part.label, value: part.amount.minor, formatted: formatMoney(part.amount) }));
