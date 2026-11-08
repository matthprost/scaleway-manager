import { addMoney, zeroMoney } from './money';
import type { Money } from './money';
import { daysInMonth, monthKeyOf } from './month';
import type { MonthKey } from './month';

export type ProductSpend = { product: string; amount: Money };

// One project's spending, before discounts: Scaleway gives a discount for the whole organization only.
export type ProjectSpend = { projectId: string; amount: Money; byProduct: ProductSpend[] };

// The organization's month. `total` is after the month's discount (zero when there's none); byProduct and byProject
// are before it, sorted by amount, largest first.
export type MonthSpending = {
  month: MonthKey;
  total: Money;
  byProduct: ProductSpend[];
  byProject: ProjectSpend[];
  discount: Money;
};

// Null before day 3 of the month (UTC): the guess would be wild.
export function projectMonthEnd(soFar: Money, now: Date): Money | null {
  if (now.getUTCDate() < 3) {
    return null;
  }

  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const daysElapsed = (now.getTime() - monthStart) / 86_400_000;
  const total = daysInMonth(monthKeyOf(now));

  return { minor: Math.round((soFar.minor / daysElapsed) * total), currency: soFar.currency };
}

// Percentage change as an integer, null when there is nothing to compare to.
export function compareMonths(current: Money, previous: Money): number | null {
  if (previous.minor === 0) {
    return null;
  }

  return Math.round(((current.minor - previous.minor) / previous.minor) * 100);
}

// The `keep` biggest parts (they come largest first), then the rest added up as "Other", left out when it's zero.
export function topParts(
  parts: { label: string; amount: Money }[],
  keep = 3,
): { label: string; amount: Money }[] {
  const top = parts.slice(0, keep);
  const rest = parts.slice(keep);
  const first = parts[0];

  if (first === undefined) {
    return top;
  }

  const other = rest.reduce((sum, part) => addMoney(sum, part.amount), zeroMoney(first.amount.currency));

  return other.minor === 0 ? top : [...top, { label: 'Other', amount: other }];
}
