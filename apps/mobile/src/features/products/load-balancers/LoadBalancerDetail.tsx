import { formatDay, formatDayShort, formatTime } from '@scaleway-manager/core';
import type { BackendHealth, LoadBalancer, ResourceSummary } from '@scaleway-manager/core';
import { Card, DetailHero, ListRow, Section } from '@scaleway-manager/ui';
import type { Health } from '@scaleway-manager/ui';
import { useQueryClient } from '@tanstack/react-query';

import { useServices } from '../../../wiring/ServicesProvider';
import { LoadFailed } from '../../errors/LoadFailed';
import { DetailScreen } from '../../resources/DetailScreen';
import { resourceKey } from '../../resources/products';

// A backend server's words, and where it goes in the list: down first
const BACKEND_STATES = {
  down: { order: 0, label: 'Down', health: 'error' },
  checking: { order: 1, label: 'Checking', health: 'busy' },
  up: { order: 2, label: 'Up', health: 'ok' },
} satisfies Record<BackendHealth['state'], { order: number; label: string; health: Health }>;

// A load balancer's screen, to look at only (no actions): its status, its address and its backend servers.
export function LoadBalancerDetail({ locality, id }: { locality: string; id: string }) {
  return (
    <DetailScreen product="load-balancers" locality={locality} id={id}>
      {({ item, summary, pinned }) => (
        <LoadBalancerBody zone={locality} id={id} lb={item} summary={summary} pinned={pinned} />
      )}
    </DetailScreen>
  );
}

type LoadBalancerBodyProps = {
  // The screen's own zone and id: the load balancer's query, asked again when its backends couldn't load
  zone: string;
  id: string;
  lb: LoadBalancer;
  summary: ResourceSummary;
  pinned: boolean;
};

function LoadBalancerBody({ zone, id, lb, summary, pinned }: LoadBalancerBodyProps) {
  const services = useServices();
  const queryClient = useQueryClient();
  const today = formatDay(services.clock.now());
  // Left out when there are none
  const backends = [...(lb.backends ?? [])].sort(
    (a, b) => BACKEND_STATES[a.state].order - BACKEND_STATES[b.state].order,
  );

  return (
    <>
      <DetailHero
        product="load-balancers"
        subtitle={`${summary.kindLabel} · ${lb.zone}`}
        statusLabel={summary.statusLabel}
        health={summary.health}
        pinned={pinned}
      />

      <Section title="Details">
        {lb.ip === null ? null : (
          <ListRow
            title="IP address"
            trailing={{ type: 'text', text: lb.ip, onCopy: (text, options) => services.clipboard.copy(text, options) }}
          />
        )}

        <ListRow title="Zone" trailing={{ type: 'text', text: lb.zone }} />
      </Section>

      {lb.backends === null ? (
        <Card>
          <LoadFailed
            title="Couldn't load your backend servers"
            onRetry={() =>
              void queryClient.refetchQueries({ queryKey: resourceKey('load-balancers', zone, id), exact: true })
            }
          />
        </Card>
      ) : backends.length === 0 ? null : (
        <Section title="Backend servers">
          {backends.map((backend) => {
            const state = BACKEND_STATES[backend.state];
            const changed = backend.changedAt === null ? null : new Date(backend.changedAt);
            // Changed today: the time ("since 14:05"); earlier: the day ("since 8 Nov")
            const when =
              changed === null ? null : formatDay(changed) === today ? formatTime(changed) : formatDayShort(changed);

            return (
              <ListRow
                key={`${backend.backendId}:${backend.ip}`}
                title={backend.ip}
                subtitle={when === null ? backend.backendName : `${backend.backendName} · since ${when}`}
                trailing={{ type: 'status', label: state.label, health: state.health }}
              />
            );
          })}
        </Section>
      )}
    </>
  );
}
