import { useEffect, useState } from 'react';

import { MetricChart } from '../charts/MetricChart';
import { ActionGrid } from '../components/ActionGrid';
import { DetailHero } from '../components/DetailHero';
import type { Health } from '../components/HealthDot';
import { ListRow } from '../components/ListRow';
import { Section } from '../components/Section';
import { Stack } from '../components/Stack';
import { StatusPill } from '../components/StatusPill';
import { Text } from '../components/Text';
import { DEMO_WAIT_MS } from './formsSections';
import type { GallerySection } from './sections';

// The pieces of the Resources tab and the product screens, and their sample data.

const noop = () => {};

// Every health, with words from the products
const STATUSES: readonly { label: string; health: Health }[] = [
  { label: 'Running', health: 'ok' },
  { label: 'Rebooting…', health: 'busy' },
  { label: 'Needs a node pool', health: 'warning' },
  { label: 'Failed', health: 'error' },
  { label: 'Stopped', health: 'stopped' },
];

// A running instance's actions
const INSTANCE_ACTIONS = [
  { key: 'poweroff', label: 'Power off', icon: 'power' },
  { key: 'standby', label: 'Standby', icon: 'moon' },
  { key: 'reboot', label: 'Reboot', icon: 'restart' },
  { key: 'backup', label: 'Back up', icon: 'backup' },
] as const;

type InstanceAction = (typeof INSTANCE_ACTIONS)[number]['key'];

// A database's CPU over a day, ending at 92% (demo db-main)
const CPU = [14, 12, 15, 18, 22, 35, 31, 28, 40, 52, 47, 64, 58, 71, 66, 80, 75, 92].map((value) => ({ value }));
const MEMORY = [41, 42, 42, 43, 45, 44, 46, 47, 47, 48, 49, 51].map((value) => ({ value }));
// A day of pings, one a minute: up, except ten minutes this morning
const PINGS = Array.from({ length: 1440 }, (_, minute) => ({ value: minute >= 420 && minute < 430 ? 0 : 100 }));

export const PRODUCT_SECTIONS: readonly GallerySection[] = [
  {
    name: 'StatusPill',
    render: () => (
      <Stack gap="sm">
        <Stack direction="row" wrap align="center" gap="xs">
          {STATUSES.map((status) => (
            <StatusPill key={status.label} label={status.label} health={status.health} />
          ))}
        </Stack>

        <Text variant="caption" tone="muted">
          A resource&apos;s status word in a Pill of its health&apos;s tone: ok, busy, warning, error, stopped. Never the
          health colour as text. A ResourceCard, a DetailHero and a ListRow status use it.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'DetailHero',
    render: () => (
      <Stack gap="sm">
        <DetailHero product="instances" subtitle="PRO2-S · fr-par-1" statusLabel="Running" health="ok" pinned />

        <DetailHero
          product="kubernetes"
          subtitle="Kubernetes 1.31.2 · fr-par"
          statusLabel="Needs a node pool"
          health="warning"
        />

        <DetailHero
          product="databases"
          subtitle="PostgreSQL 16 · fr-par · High availability"
          statusLabel="Restarting…"
          health="busy"
        />

        <Text variant="caption" tone="muted">
          The top of a resource&apos;s screen, under its ScreenHeader (which holds the name): the product&apos;s tile,
          what it is and where, and its status. A pinned resource says Pinned in words, after the filled star. Screen
          readers hear one phrase.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'ActionGrid',
    render: function ActionGridSection() {
      const [busyKey, setBusyKey] = useState<InstanceAction | null>(null);
      const [offline, setOffline] = useState(false);

      useEffect(() => {
        if (busyKey === null) {
          return;
        }

        const done = setTimeout(() => setBusyKey(null), DEMO_WAIT_MS);

        return () => clearTimeout(done);
      }, [busyKey]);

      return (
        <Stack gap="sm">
          <Section>
            <ListRow title="Offline" trailing={{ type: 'switch', value: offline, onValueChange: setOffline }} />
          </Section>

          <ActionGrid
            actions={INSTANCE_ACTIONS}
            onPress={setBusyKey}
            busyKey={busyKey}
            disabledReason={offline ? "You're offline" : undefined}
          />

          <ActionGrid
            actions={[
              { key: 'poweron', label: 'Power on', icon: 'power' },
              { key: 'backup', label: 'Back up', icon: 'backup', disabled: true },
            ]}
            onPress={noop}
          />

          <ActionGrid actions={[{ key: 'redeploy', label: 'Redeploy', icon: 'redeploy' }]} onPress={noop} />

          <ActionGrid
            actions={INSTANCE_ACTIONS.map((action) => ({ ...action, disabled: true }))}
            onPress={noop}
            disabledReason="Wait until the server is ready"
          />

          <ActionGrid
            actions={[
              { key: 'poweron', label: 'Power on', icon: 'power' },
              { key: 'standby', label: 'Standby', icon: 'moon', disabled: true },
              { key: 'reboot', label: 'Reboot', icon: 'restart', disabled: true },
              { key: 'backup', label: 'Back up', icon: 'backup' },
            ]}
            onPress={noop}
            note="The server is stopped"
          />

          <Text variant="caption" tone="muted">
            Two secondary md buttons per row, the same width and height; a lone last one keeps half the width; one per
            row at accessibility text sizes. Tap one: it spins while it runs and the others wait. Offline: every button
            is off and one caption says why. Back up: an action off on its own. Then a server that is starting, so none
            can run: they stay in place, off, and the caption says why (disabledReason). Last, a stopped server: Power
            on and Back up can run, Standby and Reboot stay, off, and the note says why (it turns nothing off). Actions
            that stop, restart, replace or redeploy something, and Run now, ask first (ConfirmSheet), from the screen.
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'MetricChart',
    render: () => (
      <Stack gap="sm">
        <MetricChart title="CPU" points={CPU} unit="%" />

        <MetricChart title="Memory" points={MEMORY} unit="%" />

        <MetricChart title="Reachability (24 h)" points={PINGS} unit="%" />

        <MetricChart title="Disk" points={[{ value: 37 }]} unit="%" />

        <MetricChart title="Disk" points={[]} unit="%" />

        <MetricChart title="Reachability (24 h)" points={PINGS} unit="%" valueLabel="Up" />

        <MetricChart title="CPU" points={[]} unit="%" loading />

        <Text variant="caption" tone="muted">
          A still line on its own card: brand, over a soft brand fill. The latest value top-right (92%), the scale&apos;s
          ends as captions (a percentage runs from 0 to 100). A day of pings is thinned to the width: the dip is ten
          minutes down. One point: a dot. No points yet: a dash and no line. valueLabel: other words top-right (Up). Loading: placeholders in the value&apos;s and the line&apos;s place. Screen
          readers hear one image: the title, the latest value, the lowest and the highest.
        </Text>
      </Stack>
    ),
  },
];
