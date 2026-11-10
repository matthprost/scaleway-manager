import type { MonthSpending } from '@scaleway-manager/core';
import { HeaderBackground, Stack, Text } from '@scaleway-manager/ui';

import { useNoticeShown } from '../connectivity/useNoticeShown';
import { RangeSwitch } from '../spending/RangeSwitch';
import { SpendingOverview } from '../spending/SpendingOverview';
import type { SelectedMonth } from '../spending/useSelectedMonth';
import type { SpendingHistory } from '../spending/useSpendingHistory';

type BillingHeaderProps = {
  history: SpendingHistory;
  selection: SelectedMonth;
  // The month on screen (the picked one, or this month); undefined while it loads
  shown: MonthSpending | undefined;
};

// Billing's purple header: its title, the 6M/12M switch, and the organization's spending on the larger chart.
// When the spending can't be shown, only the title stays: the card under it says why.
export function BillingHeader({ history, selection, shown }: BillingHeaderProps) {
  const noticeShown = useNoticeShown();

  return (
    <HeaderBackground insetTop noticeShown={noticeShown} overlapped>
      <Stack paddingHorizontal="lg" gap="sm">
        <Stack direction="row" justify="between" align="center" gap="sm">
          <Text variant="title" tone="onBrand" accessibilityRole="header">
            Billing
          </Text>

          {history.error === null ? <RangeSwitch selection={selection} /> : null}
        </Stack>

        {history.error === null ? (
          <SpendingOverview history={history} selection={selection} shown={shown} size="large" waiting={false} />
        ) : null}
      </Stack>
    </HeaderBackground>
  );
}
