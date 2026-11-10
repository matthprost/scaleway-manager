import { formatMoney } from '@scaleway-manager/core';
import type { Money, MonthKey, MonthSpending, ProductSpend } from '@scaleway-manager/core';
import { BreakdownBar, ListRow, Section, SectionHeader, SegmentedControl, Stack, Text } from '@scaleway-manager/ui';
import { useState } from 'react';

import { LoadFailed } from '../errors/LoadFailed';
import { breakdownSegments } from '../spending/breakdownSegments';
import { ByProductCard } from '../spending/ByProductCard';
import { ProjectSpendSheet } from './ProjectSpendSheet';
import type { ProjectBreakdown } from './useProjectBreakdown';

const VIEWS = [
  { key: 'products', label: 'Products' },
  { key: 'projects', label: 'Projects' },
] as const;

type SpendingBreakdownProps = {
  month: MonthKey;
  // Undefined while it loads
  spending: MonthSpending | undefined;
  // While a past month is shown: back to this month
  onBackToNow: (() => void) | null;
  // The Products | Projects choice and the projects, kept by the screen (the invoices follow what it says)
  breakdown: ProjectBreakdown;
};

// The project whose sheet is open, as it was when tapped (kept while the sheet slides away)
type Picked = {
  project: { name: string; amount: Money; byProduct: ProductSpend[] };
  month: MonthKey;
  discounted: boolean;
};

// Billing's "{Month} by product" card, with every product under it. When 2 or more projects spent that month (and the
// user can see the projects), a switch shows "{Month} by project" instead: every project, each opening its own sheet.
export function SpendingBreakdown({ month, spending, onBackToNow, breakdown }: SpendingBreakdownProps) {
  const { view, setView, switchable, rows, failed } = breakdown;
  const [picked, setPicked] = useState<Picked | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Project amounts are before it: Scaleway gives a discount for the whole organization only
  const discounted = spending !== undefined && spending.discount.minor > 0;

  const bar = failed ? (
    <LoadFailed title="Couldn't load your projects" onRetry={breakdown.retry} />
  ) : rows === null ? (
    <BreakdownBar segments={[]} loading />
  ) : (
    <BreakdownBar segments={breakdownSegments(rows.map(({ name, amount }) => ({ label: name, amount })))} />
  );

  const list = failed ? null : (
    <>
      <SectionHeader title="All projects" />

      {rows === null ? (
        <Section loading />
      ) : (
        <Stack gap="xs">
          <Section>
            {rows.map((row) => (
              <ListRow
                key={row.projectId}
                title={row.name}
                trailing={{ type: 'chevron', text: formatMoney(row.amount) }}
                onPress={() => {
                  setPicked({ project: row, month, discounted });
                  setSheetOpen(true);
                }}
              />
            ))}
          </Section>

          {discounted ? (
            <Text variant="caption" tone="muted">
              Before discounts
            </Text>
          ) : null}
        </Stack>
      )}
    </>
  );

  return (
    <>
      <ByProductCard
        month={month}
        spending={spending}
        onBackToNow={onBackToNow}
        showAll
        control={
          switchable ? (
            <SegmentedControl options={VIEWS} value={view} onChange={setView} accessibilityLabel="Breakdown" />
          ) : undefined
        }
        byProject={switchable && view === 'projects' ? { bar, list } : undefined}
      />

      {picked === null ? null : (
        <ProjectSpendSheet
          project={picked.project}
          month={picked.month}
          discounted={picked.discounted}
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
