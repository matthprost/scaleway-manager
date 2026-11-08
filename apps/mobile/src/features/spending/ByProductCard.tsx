import { formatMoney, monthName } from '@scaleway-manager/core';
import type { MonthKey, MonthSpending } from '@scaleway-manager/core';
import { BreakdownBar, Card, ListRow, Section, SectionHeader, Stack, Text } from '@scaleway-manager/ui';
import type { ReactNode } from 'react';

import { breakdownSegments } from './breakdownSegments';

type ByProductCardProps = {
  month: MonthKey;
  // Undefined while it loads
  spending: MonthSpending | undefined;
  // While a past month is shown: back to this month
  onBackToNow: (() => void) | null;
  // Billing: every product too, one row each, under the card (titled like the screen's other parts)
  showAll?: boolean;
  // Billing: the Products | Projects switch, under the title
  control?: ReactNode;
  // Billing's Projects view: its bar (in the card) and its list (under it) take the products' place
  byProject?: { bar: ReactNode; list: ReactNode };
};

// "{Month} by product": where the organization's money went that month, the three biggest products, then the rest.
export function ByProductCard({ month, spending, onBackToNow, showAll = false, control, byProject }: ByProductCardProps) {
  const breakdown =
    byProject !== undefined ? (
      byProject.bar
    ) : spending === undefined ? (
      <BreakdownBar segments={[]} loading />
    ) : spending.byProduct.length === 0 ? (
      <Text variant="body" tone="muted">
        {onBackToNow === null ? `Nothing spent in ${monthName(month)} so far.` : `Nothing spent in ${monthName(month)}.`}
      </Text>
    ) : (
      <BreakdownBar
        segments={breakdownSegments(spending.byProduct.map(({ product, amount }) => ({ label: product, amount })))}
      />
    );

  return (
    <>
      <Card raised>
        <Stack gap="none">
          <SectionHeader
            title={`${monthName(month)} by ${byProject === undefined ? 'product' : 'project'}`}
            action={onBackToNow === null ? undefined : { label: 'Back to now', onPress: onBackToNow, chevron: false }}
          />

          {control === undefined ? (
            breakdown
          ) : (
            <Stack gap="xs">
              {control}

              {breakdown}
            </Stack>
          )}
        </Stack>
      </Card>

      {byProject !== undefined ? (
        byProject.list
      ) : showAll && spending !== undefined && spending.byProduct.length > 0 ? (
        <>
          <SectionHeader title="All products" />

          <Section>
            {spending.byProduct.map((part) => (
              <ListRow key={part.product} title={part.product} trailing={{ type: 'text', text: formatMoney(part.amount) }} />
            ))}
          </Section>
        </>
      ) : null}
    </>
  );
}
