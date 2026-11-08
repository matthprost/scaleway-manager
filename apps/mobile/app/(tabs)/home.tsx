import { monthKeyOf } from '@scaleway-manager/core';
import { AnimatedSplashEntrance, Screen, Stack } from '@scaleway-manager/ui';
import { useState } from 'react';

import { AlertsSection } from '../../src/features/alerts/AlertsSection';
import { LiveResourcesSection } from '../../src/features/resources/LiveResourcesSection';
import { ByProductCard } from '../../src/features/spending/ByProductCard';
import { SpendingHeader } from '../../src/features/spending/SpendingHeader';
import { useSelectedMonth } from '../../src/features/spending/useSelectedMonth';
import { useSpendingHistory } from '../../src/features/spending/useSpendingHistory';
import { useHomeHandOver } from '../../src/features/splash/SplashHandOver';
import { StatusSection } from '../../src/features/status/StatusSection';
import { useStatusBarReports } from '../../src/features/statusBar/StatusBarReports';
import { ProjectPickerSheet } from '../../src/features/workspace/ProjectPickerSheet';
import { useWorkspace } from '../../src/features/workspace/useWorkspace';
import { useServices } from '../../src/wiring/ServicesProvider';

export default function Home() {
  const { clock } = useServices();
  const selection = useSelectedMonth(6);
  const history = useSpendingHistory(selection.range);
  const { entrance, reportHeaderHeight } = useHomeHandOver();
  const { setHomeHeaderUnder } = useStatusBarReports();
  const workspace = useWorkspace();
  const [picking, setPicking] = useState(false);
  // The picked month, or this month: shown as soon as it's on the phone, even while the chart waits for others
  const month = selection.selected ?? monthKeyOf(clock.now());
  const shown = history.loaded.find((item) => item.month === month);
  // Alerts, status and resources follow the project: with none (it couldn't be loaded), the chip says why
  const noProject = workspace.project === null && workspace.status === 'error';
  // The by-product card overlaps the header's curve; without it nothing may (words there would sit on purple)
  const cardShown = history.error === null;
  // The spending couldn't load (not a 403): the header's Try again says "You're offline" for the whole screen
  const spendingFailed = history.error !== null && history.error.kind !== 'forbidden';

  return (
    <Screen
      topInset="none"
      padded={false}
      onHeaderUnderStatusBar={setHomeHeaderUnder}
      // Only the splash needs it, while it lands
      onHeaderHeight={entrance === 'shown' ? undefined : reportHeaderHeight}
    >
      <SpendingHeader
        history={history}
        selection={selection}
        shown={shown}
        entrance={entrance}
        onOpenPicker={() => setPicking(true)}
      />

      <Stack
        paddingHorizontal="md"
        paddingVertical={cardShown ? undefined : 'md'}
        overlapHeader={cardShown}
        contained
      >
        {cardShown ? (
          <AnimatedSplashEntrance state={entrance} order="first">
            <ByProductCard
              month={month}
              spending={shown}
              onBackToNow={selection.selected === null ? null : () => selection.select(null)}
            />
          </AnimatedSplashEntrance>
        ) : null}

        {noProject ? null : (
          <>
            <AlertsSection entrance={entrance} />

            <StatusSection entrance={entrance} />

            <LiveResourcesSection offlineSaidAbove={spendingFailed} />
          </>
        )}
      </Stack>

      <ProjectPickerSheet visible={picking} onClose={() => setPicking(false)} />
    </Screen>
  );
}
