import { formatMoney, monthAndYear, monthKeyOf } from '@scaleway-manager/core';
import type { Money, MonthKey, ProductSpend } from '@scaleway-manager/core';
import { BreakdownBar, Card, ListRow, Section, Sheet, Stack, Text } from '@scaleway-manager/ui';

import { useServices } from '../../wiring/ServicesProvider';
import { useSheetVisible } from '../lock/useSheetVisible';
import { breakdownSegments } from '../spending/breakdownSegments';

type ProjectSpendSheetProps = {
  // Its name ("Unknown project" when it isn't in the list), that month's amount and its products, largest first
  project: { name: string; amount: Money; byProduct: ProductSpend[] };
  month: MonthKey;
  // The month had a discount: these amounts are before it
  discounted: boolean;
  // The screen wants it open
  visible: boolean;
  onClose: () => void;
};

// One project's month, read-only: what it spent, its three biggest products, then every product.
export function ProjectSpendSheet({ project, month, discounted, visible, onClose }: ProjectSpendSheetProps) {
  const { clock } = useServices();
  const sheet = useSheetVisible(visible);
  const soFar = month === monthKeyOf(clock.now()) ? ' so far' : '';
  // A project of a few sub-cent lines can have a total but no product at €0.01 or more
  const hasProducts = project.byProduct.length > 0;

  return (
    <Sheet visible={sheet} title={project.name} onClose={onClose}>
      <Stack>
        <Card>
          <Stack gap="sm">
            <Stack gap="xxs">
              <Text variant="subhead" tone="muted">
                {`Spent in ${monthAndYear(month)}${soFar}`}
              </Text>

              <Text variant="title">{formatMoney(project.amount)}</Text>
            </Stack>

            {hasProducts ? (
              <BreakdownBar
                segments={breakdownSegments(project.byProduct.map(({ product, amount }) => ({ label: product, amount })))}
              />
            ) : null}
          </Stack>
        </Card>

        {hasProducts || discounted ? (
          <Stack gap="xs">
            {hasProducts ? (
              <Section title="All products">
                {project.byProduct.map((part) => (
                  <ListRow key={part.product} title={part.product} trailing={{ type: 'text', text: formatMoney(part.amount) }} />
                ))}
              </Section>
            ) : null}

            {discounted ? (
              <Text variant="caption" tone="muted">
                Before discounts
              </Text>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Sheet>
  );
}
