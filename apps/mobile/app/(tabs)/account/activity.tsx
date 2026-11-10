import { EmptyState, ListRow, Screen, ScreenHeader, Section, Stack } from '@scaleway-manager/ui';
import { useRouter } from 'expo-router';

import { useActivity } from '../../../src/features/account/useActivity';
import { useIsOnline } from '../../../src/features/connectivity/useIsOnline';
import { ActionFailed } from '../../../src/features/errors/ActionFailed';
import { LoadFailed } from '../../../src/features/errors/LoadFailed';

// Who did what in the organization lately, by day.
export default function Activity() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { days, error, retry, refresh, refreshing, refreshFailed } = useActivity();

  // Offline, no pull to refresh: it would wait for the network with its spinner up (the offline pill says why)
  return (
    <Screen topInset="belowNotice" onRefresh={isOnline ? refresh : undefined} refreshing={refreshing}>
      <Stack>
        <ScreenHeader title="Activity" onBack={router.back} />

        {error?.kind === 'forbidden' ? (
          <EmptyState
            icon="activity"
            title="Activity isn't available"
            message="You don't have access to the activity log in this organization."
          />
        ) : error !== null ? (
          <LoadFailed title="Couldn't load your activity" onRetry={retry} />
        ) : days === undefined ? (
          <Section loading />
        ) : days.length === 0 ? (
          <EmptyState icon="activity" title="No recent activity" />
        ) : (
          <>
            {/* Above the newest events */}
            {refreshFailed ? <ActionFailed /> : null}

            {days.map((day) => (
              <Section key={day.key} title={day.title}>
                {day.rows.map((row) => (
                  <ListRow
                    key={row.id}
                    title={row.title}
                    subtitle={row.subtitle}
                    subtitleTone={row.failed ? 'danger' : 'muted'}
                    trailing={{ type: 'text', text: row.time }}
                  />
                ))}
              </Section>
            ))}
          </>
        )}
      </Stack>
    </Screen>
  );
}
