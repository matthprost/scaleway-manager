import {
  compareMonths,
  formatMoney,
  monthAndYear,
  monthInitial,
  monthKeyOf,
  monthName,
  monthRange,
  monthShort,
  projectMonthEnd,
} from '@scaleway-manager/core';
import type { MonthSpending } from '@scaleway-manager/core';
import { LineChart, SpendingSummary, Stack } from '@scaleway-manager/ui';
import { useQuery } from '@tanstack/react-query';

import { useServices } from '../../wiring/ServicesProvider';
import { useWorkspace } from '../workspace/useWorkspace';
import type { SelectedMonth } from './useSelectedMonth';
import { monthQuery } from './useSpendingHistory';
import type { SpendingHistory } from './useSpendingHistory';

type SpendingOverviewProps = {
  history: SpendingHistory;
  selection: SelectedMonth;
  // The month on screen (the picked one, or this month); undefined while it loads
  shown: MonthSpending | undefined;
  // Home's chart, or Billing's larger one
  size: 'header' | 'large';
  // Keeps the chart's placeholder: under Home's splash the line would draw itself out of sight
  waiting: boolean;
};

// The organization's spending on a purple header: the month shown, compared with the one before, then the chart.
export function SpendingOverview({ history, selection, shown, size, waiting }: SpendingOverviewProps) {
  const { clock, spending } = useServices();
  const { status, user, organization } = useWorkspace();
  const now = clock.now();
  const { months } = history;
  const { range, selected, select } = selection;
  const shownKey = selected ?? monthKeyOf(now);
  // The month before the one shown (monthRange ends on the month it's given)
  const previousKey = monthRange(shownKey, 6).at(-2) ?? shownKey;
  // The chart's own query when the chart shows it (nothing more is asked); asked for only before its oldest month
  const { data: previous } = useQuery({
    ...monthQuery(spending, user?.organizationId, previousKey, now),
    enabled: shown !== undefined,
  });
  const change = shown === undefined || previous === undefined ? null : compareMonths(shown.total, previous.total);
  // A sign the eye reads; screen readers hear words
  const nothing = { value: '—', valueLabel: 'Nothing to compare' };
  const comparison =
    shown === undefined
      ? null
      : selected === null
        ? { title: monthName(previousKey), ...(previous === undefined ? nothing : { value: formatMoney(previous.total) }) }
        : {
            title: `vs ${monthName(previousKey)}`,
            // "+19%" or "−4%" (a real minus sign)
            ...(change === null ? nothing : { value: `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)}%` }),
          };
  const running = months.at(-1);
  const projected = running === undefined ? null : projectMonthEnd(running.total, now);
  // The picked month on the chart; none (-1) while it's this month
  const pickedIndex = months.findIndex((month) => month.month === selected);

  // Some air between the numbers and the chart, so the projection's words don't crowd the comparison
  return (
    <Stack gap="md">
      <SpendingSummary
        label={selected === null ? `Spent in ${monthName(shownKey)} so far` : `Spent in ${monthName(shownKey)}`}
        amount={shown === undefined ? null : formatMoney(shown.total)}
        comparison={comparison}
        // The spending is the whole organization's, whichever project is picked
        scope={
          organization !== null
            ? `All projects in ${organization.name}`
            : status === 'loading'
              ? null
              : 'All projects in this organization'
        }
      />

      <LineChart
        points={months.map((month) => ({
          key: month.month,
          label: range === 6 ? monthShort(month.month) : monthInitial(month.month),
          value: month.total.minor,
          description: `${monthAndYear(month.month)}, ${formatMoney(month.total)}`,
        }))}
        unfinishedLast
        projection={
          projected === null ? null : { value: projected.minor, label: `≈ ${formatMoney(projected)} by month end` }
        }
        projectionVisible={selected === null}
        selectedIndex={pickedIndex < 0 ? null : pickedIndex}
        // The last month is "now"
        onSelect={(picked) =>
          select(picked === null || picked === months.length - 1 ? null : (months[picked]?.month ?? null))
        }
        size={size}
        loading={months.length === 0 || waiting}
      />
    </Stack>
  );
}
