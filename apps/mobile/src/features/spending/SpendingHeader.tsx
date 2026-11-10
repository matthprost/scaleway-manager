import type { MonthSpending } from '@scaleway-manager/core';
import {
  Button,
  HeaderBackground,
  PickerChip,
  sizes,
  Skeleton,
  Stack,
  Text,
  useHomeHeaderLayout,
} from '@scaleway-manager/ui';
import type { SplashEntranceState } from '@scaleway-manager/ui';

import { useIsOnline } from '../connectivity/useIsOnline';
import { useNoticeShown } from '../connectivity/useNoticeShown';
import { useWorkspace } from '../workspace/useWorkspace';
import { RangeSwitch } from './RangeSwitch';
import { SpendingOverview } from './SpendingOverview';
import type { SelectedMonth } from './useSelectedMonth';
import type { SpendingHistory } from './useSpendingHistory';

type SpendingHeaderProps = {
  history: SpendingHistory;
  selection: SelectedMonth;
  // The month on screen (the picked one, or this month); undefined while it loads
  shown: MonthSpending | undefined;
  // The chart draws itself in once the splash is gone, not out of sight under it
  entrance: SplashEntranceState;
  onOpenPicker: () => void;
};

// Home's purple header: what the whole organization spent this month (or the picked one), compared, and the chart.
export function SpendingHeader({ history, selection, shown, entrance, onOpenPicker }: SpendingHeaderProps) {
  const { status, organization, project } = useWorkspace();
  const isOnline = useIsOnline();
  const noticeShown = useNoticeShown();
  const layout = useHomeHeaderLayout();
  const { error, retry } = history;
  // Failed: the picker it opens says why, with Try again
  const chip =
    project === null
      ? status === 'error'
        ? "Couldn't load projects"
        : null
      : organization === null
        ? project.name
        : `${organization.name} · ${project.name}`;
  const forbidden = error?.kind === 'forbidden';
  const failed = error !== null && !forbidden;

  // Only the by-product card overlaps its bottom: without it (no spending), no room is kept for it
  return (
    <HeaderBackground minHeight={layout.height} insetTop noticeShown={noticeShown} overlapped={error === null}>
      <Stack paddingHorizontal="lg" gap="sm" grow>
        <Stack direction="row" justify={chip === null && status !== 'loading' ? 'end' : 'between'} gap="sm">
          {chip !== null ? (
            <PickerChip label={chip} onPress={onOpenPicker} />
          ) : status === 'loading' ? (
            <Stack grow justify="center">
              <Skeleton width="100%" height={sizes.compactControl} radius="pill" tone="onBrand" />
            </Stack>
          ) : null}

          {error === null ? <RangeSwitch selection={selection} /> : null}
        </Stack>

        {forbidden ? (
          <Stack grow justify="center" gap="xxs">
            <Text variant="headline" tone="onBrand">
              {"Spending isn't available"}
            </Text>

            <Text variant="subhead" tone="onBrand">
              {"You don't have access to billing in this organization."}
            </Text>
          </Stack>
        ) : failed ? (
          <Stack grow justify="center" align="start" gap="sm">
            <Text variant="body" tone="onBrand">
              {"Couldn't load your spending"}
            </Text>

            <Button label="Try again" size="md" variant="onBrand" disabled={!isOnline} onPress={retry} />

            {isOnline ? null : (
              <Text variant="caption" tone="onBrand">
                {"You're offline"}
              </Text>
            )}
          </Stack>
        ) : (
          <SpendingOverview
            history={history}
            selection={selection}
            shown={shown}
            size="header"
            // Under the splash's purple the line would draw itself out of sight
            waiting={entrance !== 'shown'}
          />
        )}
      </Stack>
    </HeaderBackground>
  );
}
