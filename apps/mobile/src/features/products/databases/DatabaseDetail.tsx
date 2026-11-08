import {
  availableDatabaseActions,
  backupHealth,
  backupStatusLabel,
  formatDay,
  formatTime,
} from '@scaleway-manager/core';
import type {
  DatabaseAction,
  DatabaseBackup,
  DatabaseInstance,
  MetricSeries,
  ResourceSummary,
} from '@scaleway-manager/core';
import { ActionGrid, Card, DetailHero, ListRow, MetricChart, Section, Stack, Text } from '@scaleway-manager/ui';
import type { IconName } from '@scaleway-manager/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useServices } from '../../../wiring/ServicesProvider';
import { ActionFailed } from '../../errors/ActionFailed';
import { LoadFailed } from '../../errors/LoadFailed';
import { isRefused } from '../../errors/queryFailure';
import { DetailScreen } from '../../resources/DetailScreen';
import { resourceKey } from '../../resources/products';
import { statusReason } from '../../resources/statusReason';
import { useResourceAction } from '../../resources/useResourceAction';
import { DatabaseBackupSheet } from './DatabaseBackupSheet';

// The charts' window
const DAY = 24 * 60 * 60 * 1000;
// After a backup, its list is asked again every 5 s while one is being created, for 2 minutes at most
const FOLLOW_EVERY = 5_000;
const FOLLOW_FOR = 2 * 60_000;

// In this order; a series Scaleway didn't send is left out
const CHARTS: { metric: MetricSeries['metric']; title: string }[] = [
  { metric: 'cpu', title: 'CPU' },
  { metric: 'memory', title: 'Memory' },
  { metric: 'disk', title: 'Disk' },
];

const ACTIONS: { key: DatabaseAction; label: string; icon: IconName }[] = [
  { key: 'restart', label: 'Restart', icon: 'restart' },
  { key: 'backup', label: 'Back up now', icon: 'backup' },
];

type DatabaseBodyProps = {
  db: DatabaseInstance;
  summary: ResourceSummary;
  pinned: boolean;
  region: string;
  id: string;
};

// Below the header: the database, its endpoint, its last 24 hours, its backups, then Restart and Back up now.
function DatabaseBody({ db, summary, pinned, region, id }: DatabaseBodyProps) {
  const { clipboard, clock, databases } = useServices();
  const action = useResourceAction<DatabaseAction>();
  const key = resourceKey('databases', region, id);
  // Scaleway marks this call deprecated: if it fails, the charts are simply left out
  const metrics = useQuery({
    queryKey: [...key, 'metrics'],
    queryFn: () => {
      const until = clock.now();

      return databases.metrics(region, id, new Date(until.getTime() - DAY), until);
    },
  });
  // Follows a backup just sent until it's created: started by the sheet, stopped once an answer since then has none
  // creating, or after 2 minutes. Safe to ask more than once for the same answer
  const [following] = useState(() => {
    let since: number | null = null;

    return {
      start() {
        since = Date.now();
      },
      next(answer: { data: DatabaseBackup[] | undefined; dataUpdatedAt: number }): number | false {
        if (since === null) {
          return false;
        }
        // An answer from before the backup (asked again while the list is being fetched) says nothing yet
        const answered = answer.dataUpdatedAt >= since;
        const creating = answer.data?.some((backup) => backup.status === 'creating') === true;

        if ((answered && !creating) || Date.now() - since >= FOLLOW_FOR) {
          since = null;

          return false;
        }

        return FOLLOW_EVERY;
      },
    };
  });
  const backups = useQuery({
    queryKey: [...key, 'backups'],
    queryFn: () => databases.backups(region, id),
    refetchInterval: (query) => following.next(query.state),
  });
  // Refused (403): the backups are left out, since trying again can't help
  const backupsRefused = backups.data === undefined && isRefused(backups.error);
  // Nothing to show: they failed, or they wait for the network with nothing saved
  const backupsFailed =
    backups.data === undefined && !backupsRefused && (backups.isError || backups.fetchStatus === 'paused');
  const [backingUp, setBackingUp] = useState(false);
  const available = availableDatabaseActions(db);
  const { failure } = action;
  // A backup's failure shows in its sheet while it's open, under the actions otherwise (it may close while sending)
  const failedUnderActions = failure !== null && (failure.key !== 'backup' || !backingUp);

  return (
    <>
      <DetailHero
        product="databases"
        subtitle={`${db.engine} · ${db.region}${db.isHa ? ' · High availability' : ''}`}
        statusLabel={summary.statusLabel}
        health={summary.health}
        pinned={pinned}
      />

      {db.endpoint === null ? null : (
        <Section title="Connection">
          <ListRow
            title="Endpoint"
            trailing={{ type: 'text', text: db.endpoint, onCopy: (text, options) => clipboard.copy(text, options) }}
          />
        </Section>
      )}

      {metrics.isError
        ? null
        : CHARTS.map(({ metric, title }) => {
            if (metrics.isLoading) {
              return <MetricChart key={metric} title={title} points={[]} unit="%" loading />;
            }
            const series = metrics.data?.find((candidate) => candidate.metric === metric);

            return series === undefined ? null : (
              <MetricChart key={metric} title={title} points={series.points} unit="%" />
            );
          })}

      {backups.data !== undefined ? (
        backups.data.length === 0 ? (
          <Text variant="caption" tone="muted">
            No backups yet.
          </Text>
        ) : (
          <Section title="Backups">
            {backups.data.map((backup) => {
              const createdAt = new Date(backup.createdAt);

              return (
                <ListRow
                  key={backup.id}
                  title={backup.name}
                  subtitle={`${backup.databaseName} · ${formatDay(createdAt)} · ${formatTime(createdAt)}`}
                  // A ready backup shows its size; any other status is its Pill, like every list's statuses
                  trailing={
                    backup.status === 'ready'
                      ? { type: 'text', text: backupStatusLabel(backup) }
                      : { type: 'status', label: backupStatusLabel(backup), health: backupHealth(backup) }
                  }
                />
              );
            })}
          </Section>
        )
      ) : backupsFailed ? (
        <Card>
          <LoadFailed
            title="Couldn't load your backups"
            onRetry={() => void backups.refetch()}
            // The actions' caption says "You're offline"
            offlineSaidAbove
          />
        </Card>
      ) : backupsRefused ? null : (
        <Section title="Backups" loading />
      )}

      <Stack gap="xs">
        <ActionGrid
          actions={ACTIONS.map((choice) => ({ ...choice, disabled: !available.includes(choice.key) }))}
          onPress={(choice) => {
            if (choice === 'backup') {
              setBackingUp(true);

              return;
            }
            action.run({
              key: 'restart',
              confirm: {
                title: `Restart ${db.name}?`,
                message: 'The database is unavailable for a moment while it restarts.',
                confirmLabel: 'Restart',
              },
              toast: 'Restart requested',
              perform: () => databases.restart(region, id),
            });
          }}
          busyKey={action.running}
          disabledReason={action.disabledReason ?? statusReason(available, summary.health, 'database')}
        />

        {failedUnderActions ? <ActionFailed message={failure.message} /> : null}
      </Stack>

      {action.sheet}

      <DatabaseBackupSheet
        dbName={db.name}
        region={region}
        id={id}
        visible={backingUp}
        onClose={() => setBackingUp(false)}
        onSent={() => {
          following.start();
          setBackingUp(false);
        }}
        action={action}
      />
    </>
  );
}

// A database's screen: its engine and health, its endpoint, CPU, memory and disk over a day, its backups, then
// Restart and Back up now.
export function DatabaseDetail({ locality, id }: { locality: string; id: string }) {
  return (
    <DetailScreen product="databases" locality={locality} id={id}>
      {({ item, summary, pinned }) => (
        <DatabaseBody db={item} summary={summary} pinned={pinned} region={locality} id={id} />
      )}
    </DetailScreen>
  );
}
