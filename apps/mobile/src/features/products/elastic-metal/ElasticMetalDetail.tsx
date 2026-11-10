import { availableElasticMetalActions, formatDay, formatTime } from '@scaleway-manager/core';
import type { ElasticMetalAction, ElasticMetalServer, ResourceSummary } from '@scaleway-manager/core';
import { ActionGrid, Card, DetailHero, ListRow, MetricChart, Section, Stack, Text } from '@scaleway-manager/ui';
import type { IconName } from '@scaleway-manager/ui';
import { useQuery } from '@tanstack/react-query';

import { useServices } from '../../../wiring/ServicesProvider';
import { ActionFailed } from '../../errors/ActionFailed';
import { LoadFailed } from '../../errors/LoadFailed';
import { isRefused } from '../../errors/queryFailure';
import { DetailScreen } from '../../resources/DetailScreen';
import { resourceKey } from '../../resources/products';
import { statusReason } from '../../resources/statusReason';
import { useResourceAction } from '../../resources/useResourceAction';
import type { ActionQuestion } from '../../resources/useResourceAction';

// Each action's button: a verb and its icon (one meaning per icon)
const BUTTONS: Record<ElasticMetalAction, { label: string; icon: IconName }> = {
  start: { label: 'Start', icon: 'power' },
  stop: { label: 'Stop', icon: 'power' },
  reboot: { label: 'Reboot', icon: 'restart' },
};

const REACHABILITY = 'Reachability (24 h)';

type ElasticMetalBodyProps = {
  // The screen's own zone and id: the pings sit under the resource's query
  zone: string;
  id: string;
  server: ElasticMetalServer;
  summary: ResourceSummary;
  pinned: boolean;
};

// Under the header, in the detail order: the hero, the facts, the reachability chart, then the actions
function ElasticMetalBody({ zone, id, server, summary, pinned }: ElasticMetalBodyProps) {
  const services = useServices();
  const action = useResourceAction<ElasticMetalAction>();
  const pings = useQuery({
    queryKey: [...resourceKey('elastic-metal', zone, id), 'pings'],
    queryFn: () => services.elasticMetal.pings(zone, id),
  });
  // Up is 100%, down 0%
  const reachability = pings.data?.map((ping) => ({ value: ping.up ? 100 : 0 }));
  // Refused (403): the chart is left out, since trying again can't help
  const pingsRefused = reachability === undefined && isRefused(pings.error);
  // Nothing to show: they failed, or they wait for the network with nothing saved
  const pingsFailed = reachability === undefined && !pingsRefused && (pings.isError || pings.fetchStatus === 'paused');
  const offered = availableElasticMetalActions(server);
  // The grid never changes shape while the screen polls: Start and Stop share one place, like a switch
  const power: ElasticMetalAction = server.status === 'stopped' ? 'start' : 'stop';
  const keys = [power, 'reboot'] as const;
  // Never off without a reason: only a stopped server can run some of them (Start, not Reboot)
  const note = offered.length > 0 && keys.some((key) => !offered.includes(key)) ? 'The server is stopped' : undefined;
  const created = new Date(server.createdAt);
  // What each action asks first, naming the server (start asks nothing), and says once it worked
  const specs: Record<ElasticMetalAction, { confirm?: ActionQuestion; toast: string }> = {
    start: { toast: 'Start requested' },
    stop: {
      confirm: {
        title: `Stop ${server.name}?`,
        message: 'The server shuts down. You keep paying for it.',
        confirmLabel: 'Stop',
      },
      toast: 'Stop requested',
    },
    reboot: {
      confirm: {
        title: `Reboot ${server.name}?`,
        message: 'The server restarts. Anything running on it stops for a moment.',
        confirmLabel: 'Reboot',
      },
      toast: 'Reboot requested',
    },
  };

  return (
    <>
      <DetailHero
        product="elastic-metal"
        subtitle={`${server.offerName} · ${server.zone}`}
        statusLabel={summary.statusLabel}
        health={summary.health}
        pinned={pinned}
      />

      {server.ips.length === 0 ? null : (
        <Section title="Network">
          {server.ips.map((ip) => (
            <ListRow
              key={ip}
              title="Public IP"
              trailing={{
                type: 'text',
                text: ip,
                onCopy: (text, options) => services.clipboard.copy(text, options),
                // Every row is "Public IP": each copy button says its address
                copyLabel: `Public IP ${ip}`,
              }}
            />
          ))}
        </Section>
      )}

      <Section title="Details">
        <ListRow title="Offer" trailing={{ type: 'text', text: server.offerName }} />

        <ListRow title="Zone" trailing={{ type: 'text', text: server.zone }} />

        <ListRow title="Created" trailing={{ type: 'text', text: `${formatDay(created)} · ${formatTime(created)}` }} />
      </Section>

      {reachability !== undefined ? (
        <Stack gap="xs">
          <MetricChart title={REACHABILITY} points={reachability} unit="%" />

          {reachability.length === 0 ? (
            <Text variant="caption" tone="muted">
              No reachability data yet.
            </Text>
          ) : null}
        </Stack>
      ) : pingsFailed ? (
        // Only the chart couldn't load: the rest stays
        <Card>
          <LoadFailed
            title="Couldn't load the reachability"
            onRetry={() => void pings.refetch()}
            // The actions below already say "You're offline": once per screen
            offlineSaidAbove
          />
        </Card>
      ) : pingsRefused ? null : (
        <MetricChart title={REACHABILITY} points={[]} unit="%" loading />
      )}

      <Stack gap="xs">
        <ActionGrid
          actions={keys.map((key) => ({
            key,
            ...BUTTONS[key],
            disabled: !offered.includes(key),
          }))}
          onPress={(key) =>
            action.run({ key, ...specs[key], perform: () => services.elasticMetal.act(server.zone, server.id, key) })
          }
          busyKey={action.running}
          disabledReason={action.disabledReason ?? statusReason(offered, summary.health, 'server')}
          note={note}
        />

        {action.failure === null ? null : <ActionFailed message={action.failure.message} />}
      </Stack>

      {action.sheet}
    </>
  );
}

// An Elastic Metal server's screen: what it is and how it's doing, its network, details and reachability, then its
// actions.
export function ElasticMetalDetail({ locality, id }: { locality: string; id: string }) {
  return (
    <DetailScreen product="elastic-metal" locality={locality} id={id}>
      {({ item, summary, pinned }) => (
        <ElasticMetalBody zone={locality} id={id} server={item} summary={summary} pinned={pinned} />
      )}
    </DetailScreen>
  );
}
