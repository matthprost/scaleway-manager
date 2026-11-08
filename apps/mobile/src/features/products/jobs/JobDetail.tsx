import {
  canStopRun,
  cronInWords,
  formatDayShort,
  formatTime,
  jobRunStatus,
  runDurationLabel,
} from '@scaleway-manager/core';
import type { JobDefinition, ResourceSummary } from '@scaleway-manager/core';
import { ActionGrid, Card, DetailHero, ListRow, Section, Stack } from '@scaleway-manager/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useServices } from '../../../wiring/ServicesProvider';
import { ActionFailed } from '../../errors/ActionFailed';
import { LoadFailed } from '../../errors/LoadFailed';
import { isRefused } from '../../errors/queryFailure';
import { DetailScreen } from '../../resources/DetailScreen';
import { resourceKey } from '../../resources/products';
import { useResourceAction } from '../../resources/useResourceAction';

// The runs shown, newest first
const RECENT_RUNS = 20;

// A job's screen: its schedule, how its last run went, its recent runs (a running one can be stopped), and Run now.
export function JobDetail({ locality, id }: { locality: string; id: string }) {
  return (
    <DetailScreen product="jobs" locality={locality} id={id}>
      {({ item, summary, pinned }) => <JobBody job={item} summary={summary} pinned={pinned} />}
    </DetailScreen>
  );
}

function JobBody({ job, summary, pinned }: { job: JobDefinition; summary: ResourceSummary; pinned: boolean }) {
  const services = useServices();
  const action = useResourceAction<'run' | 'stop'>();
  const { lastRun } = job;
  // The runs are asked again whenever the job's last run changes (the screen asks the job again while a run goes on)
  const lastRunKey = lastRun === null || lastRun === 'unavailable' ? lastRun : `${lastRun.id}:${lastRun.state}`;
  const runs = useQuery({
    queryKey: [...resourceKey('jobs', job.region, job.id), 'runs', lastRunKey],
    queryFn: () => services.jobs.runs(job.region, job.id),
    placeholderData: keepPreviousData,
  });
  const now = services.clock.now();
  const schedule = job.cronSchedule === null ? 'Runs manually' : cronInWords(job.cronSchedule, job.cronTimezone);
  const actionsOff = action.disabledReason !== undefined || action.busy;
  // Refused (403): the runs are left out, since trying again can't help
  const runsRefused = runs.data === undefined && isRefused(runs.error);
  // Nothing to show: they failed, or they wait for the network with nothing saved
  const runsFailed = runs.data === undefined && !runsRefused && (runs.isError || runs.fetchStatus === 'paused');

  return (
    <>
      <DetailHero
        product="jobs"
        subtitle={`${schedule} · ${job.region}`}
        statusLabel={summary.statusLabel}
        health={summary.health}
        pinned={pinned}
      />

      {runsFailed ? (
        <Card>
          <LoadFailed
            title="Couldn't load your recent runs"
            onRetry={() => void runs.refetch()}
            // The actions below already say when the phone is offline
            offlineSaidAbove
          />
        </Card>
      ) : runsRefused ? null : runs.data === undefined ? (
        <Section title="Recent runs" loading />
      ) : runs.data.length === 0 ? null : (
        <Stack gap="xs">
          <Section title="Recent runs">
            {runs.data.slice(0, RECENT_RUNS).map((run) => {
              const status = jobRunStatus(run);
              const stoppable = canStopRun(run);
              const started = run.startedAt === null ? null : new Date(run.startedAt);
              const exit = run.exitCode === null ? '' : ` · exit ${run.exitCode}`;

              return (
                <ListRow
                  key={run.id}
                  title={started === null ? 'Not started yet' : `${formatDayShort(started)} ${formatTime(started)}`}
                  subtitle={run.errorMessage ?? (started === null ? undefined : `${runDurationLabel(run, now)}${exit}`)}
                  trailing={{ type: 'status', label: status.label, health: status.health }}
                  // Its chevron looks like it opens the run: say that a tap asks to stop it
                  accessibilityHint={stoppable ? 'Asks if you want to stop this run' : undefined}
                  onPress={
                    stoppable
                      ? () =>
                          action.run({
                            key: 'stop',
                            confirm: {
                              title: `Stop this run of ${job.name}?`,
                              message: 'The job is interrupted where it is.',
                              confirmLabel: 'Stop',
                            },
                            toast: 'Run stopped',
                            perform: () => services.jobs.stopRun(job.region, run.id),
                          })
                      : undefined
                  }
                  disabled={stoppable ? actionsOff : false}
                />
              );
            })}
          </Section>

          {action.failure?.key === 'stop' ? <ActionFailed message={action.failure.message} /> : null}
        </Stack>
      )}

      <Stack gap="xs">
        <ActionGrid
          actions={[{ key: 'run', label: 'Run now', icon: 'run' }]}
          onPress={(key) =>
            action.run({
              key,
              confirm: {
                title: `Run ${job.name} now?`,
                message: 'This starts a new run right away.',
                confirmLabel: 'Run',
              },
              toast: 'Run started',
              perform: () => services.jobs.start(job.region, job.id),
            })
          }
          busyKey={action.running}
          disabledReason={action.disabledReason}
        />

        {action.failure?.key === 'run' ? <ActionFailed message={action.failure.message} /> : null}
      </Stack>

      {action.sheet}
    </>
  );
}
