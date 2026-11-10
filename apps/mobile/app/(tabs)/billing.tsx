import { monthKeyOf } from '@scaleway-manager/core';
import { Card, Screen, Stack } from '@scaleway-manager/ui';

import { BillingHeader } from '../../src/features/billing/BillingHeader';
import { InvoiceList } from '../../src/features/billing/InvoiceList';
import { NoBillingAccess } from '../../src/features/billing/NoBillingAccess';
import { SpendingBreakdown } from '../../src/features/billing/SpendingBreakdown';
import { useInvoices } from '../../src/features/billing/useInvoices';
import { useProjectBreakdown } from '../../src/features/billing/useProjectBreakdown';
import { LoadFailed } from '../../src/features/errors/LoadFailed';
import { useSelectedMonth } from '../../src/features/spending/useSelectedMonth';
import { useSpendingHistory } from '../../src/features/spending/useSpendingHistory';
import { useStatusBarReports } from '../../src/features/statusBar/StatusBarReports';
import { useServices } from '../../src/wiring/ServicesProvider';

export default function Billing() {
  const { clock } = useServices();
  // Its own pick, apart from Home's; 12 months to start with
  const selection = useSelectedMonth(12);
  const history = useSpendingHistory(selection.range);
  const invoices = useInvoices();
  const { setBillingHeaderUnder } = useStatusBarReports();
  // The picked month, or this month: shown as soon as it's on the phone, even while the chart waits for others
  const month = selection.selected ?? monthKeyOf(clock.now());
  const shown = history.loaded.find((item) => item.month === month);
  // When the spending can't show, its card speaks for the screen: the invoices only show if they came anyway
  const showInvoices = history.error === null || invoices.list !== undefined;
  // Its Try again then says "You're offline" for the whole screen
  const spendingFailed = history.error !== null && history.error.kind !== 'forbidden';
  const breakdown = useProjectBreakdown(shown);
  // The Projects view's Try again (names that couldn't load) says it too
  const projectsFailed = breakdown.switchable && breakdown.view === 'projects' && breakdown.failed;

  return (
    <Screen topInset="none" padded={false} onHeaderUnderStatusBar={setBillingHeaderUnder}>
      <BillingHeader history={history} selection={selection} shown={shown} />

      <Stack paddingHorizontal="md" overlapHeader contained>
        {history.error === null ? (
          <SpendingBreakdown
            month={month}
            spending={shown}
            onBackToNow={selection.selected === null ? null : () => selection.select(null)}
            breakdown={breakdown}
          />
        ) : history.error.kind === 'forbidden' ? (
          <Card raised>
            <NoBillingAccess />
          </Card>
        ) : (
          <Card raised>
            <LoadFailed
              title="Couldn't load your spending"
              onRetry={() => {
                history.retry();
                invoices.retry();
              }}
            />
          </Card>
        )}

        {showInvoices ? <InvoiceList invoices={invoices} offlineSaidAbove={spendingFailed || projectsFailed} /> : null}
      </Stack>
    </Screen>
  );
}
