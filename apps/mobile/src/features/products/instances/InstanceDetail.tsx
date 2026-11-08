import { availableInstanceActions, formatDay, formatTime } from '@scaleway-manager/core';
import type { InstanceAction, InstanceServer, ResourceSummary } from '@scaleway-manager/core';
import { ActionGrid, DetailHero, ListRow, Section, Stack } from '@scaleway-manager/ui';
import type { IconName } from '@scaleway-manager/ui';
import { useState } from 'react';

import { useServices } from '../../../wiring/ServicesProvider';
import { ActionFailed } from '../../errors/ActionFailed';
import { DetailScreen } from '../../resources/DetailScreen';
import { statusReason } from '../../resources/statusReason';
import { useResourceAction } from '../../resources/useResourceAction';
import type { ActionQuestion, ResourceAction } from '../../resources/useResourceAction';
import { BackupSheet } from './BackupSheet';

const GB = 1_000_000_000;

// Each action's button: a verb and its icon (one meaning per icon)
const BUTTONS: Record<InstanceAction, { label: string; icon: IconName }> = {
  poweron: { label: 'Power on', icon: 'power' },
  poweroff: { label: 'Power off', icon: 'power' },
  stop_in_place: { label: 'Standby', icon: 'moon' },
  reboot: { label: 'Reboot', icon: 'restart' },
  backup: { label: 'Back up', icon: 'backup' },
};

// Scaleway's disk types in words; any other shows as given
const DISK_TYPES = new Map([
  ['l_ssd', 'Local SSD'],
  ['b_ssd', 'Block storage'],
  ['sbs_volume', 'Block storage'],
  ['scratch', 'Scratch'],
]);

// "8 Nov 2026 · 14:05", on the phone's clock
const dateAndTime = (iso: string) => {
  const date = new Date(iso);

  return `${formatDay(date)} · ${formatTime(date)}`;
};

type InstanceBodyProps = { server: InstanceServer; summary: ResourceSummary; pinned: boolean };

// The backup sheet: open or not, its opening (a fresh name each time), and the failure already there when it opened
type BackupState = { open: boolean; round: number; earlier: ResourceAction<InstanceAction>['failure'] };

// Under the header, in the detail order: the hero, the facts, then the actions
function InstanceBody({ server, summary, pinned }: InstanceBodyProps) {
  const services = useServices();
  const action = useResourceAction<InstanceAction>();
  const [backup, setBackup] = useState<BackupState>({ open: false, round: 0, earlier: null });
  const { failure } = action;
  // A backup's failure shows in its sheet while it's open, under the actions otherwise (it may close while sending)
  const failedUnderActions = failure !== null && (failure.key !== 'backup' || !backup.open);
  const offered = availableInstanceActions(server);
  // The grid never changes shape while the screen polls: Power on and Power off share one place, like a switch, and
  // an action the status doesn't allow stays, turned off
  const power: InstanceAction = server.state === 'stopped' || server.state === 'standby' ? 'poweron' : 'poweroff';
  const keys: InstanceAction[] = [power, 'stop_in_place', 'reboot', 'backup'];
  // Never off without a reason: what the status turns off while others can run is said under the grid
  const note =
    offered.length === 0 || keys.every((key) => offered.includes(key))
      ? undefined
      : server.state === 'stopped'
        ? 'The server is stopped'
        : server.state === 'standby'
          ? 'The server is on standby'
          : "Some actions aren't available right now";
  const ips = [
    ...server.publicIpv4.map((ip) => ({ title: 'Public IPv4', ip })),
    ...server.publicIpv6.map((ip) => ({ title: 'Public IPv6', ip })),
    ...(server.privateIp === null ? [] : [{ title: 'Private IP', ip: server.privateIp }]),
  ];
  // Power off also releases a dynamic public IP and wipes scratch disks
  const powerOff = [
    'The server shuts down and its compute resources are released. Its disks are kept.',
    server.hasDynamicPublicIp ? 'Its public IP is released and will change.' : null,
    server.volumes.some((volume) => volume.type === 'scratch') ? 'Scratch disks are erased.' : null,
  ]
    .filter((sentence) => sentence !== null)
    .join(' ');
  // What each action asks first, naming the server (power on asks nothing), and says once it worked
  const specs: Record<Exclude<InstanceAction, 'backup'>, { confirm?: ActionQuestion; toast: string }> = {
    poweron: { toast: 'Power on requested' },
    poweroff: {
      confirm: { title: `Power off ${server.name}?`, message: powerOff, confirmLabel: 'Power off' },
      toast: 'Power off requested',
    },
    stop_in_place: {
      confirm: {
        title: `Put ${server.name} on standby?`,
        message: 'The server stops but keeps its resources reserved, so it starts again faster. You keep paying for it.',
        confirmLabel: 'Standby',
      },
      toast: 'Standby requested',
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
        product="instances"
        subtitle={`${server.commercialType} · ${server.zone}`}
        statusLabel={summary.statusLabel}
        health={summary.health}
        pinned={pinned}
      />

      {ips.length === 0 ? null : (
        <Section title="Network">
          {ips.map(({ title, ip }) => (
            <ListRow
              key={`${title} ${ip}`}
              title={title}
              trailing={{
                type: 'text',
                text: ip,
                onCopy: (text, options) => services.clipboard.copy(text, options),
                // Several rows can share a title: each copy button says its address
                copyLabel: `${title} ${ip}`,
              }}
            />
          ))}
        </Section>
      )}

      <Section title="Details">
        {server.imageName === null ? null : (
          <ListRow title="Image" trailing={{ type: 'text', text: server.imageName }} />
        )}

        <ListRow title="Type" trailing={{ type: 'text', text: server.commercialType }} />

        <ListRow title="Zone" trailing={{ type: 'text', text: server.zone }} />

        <ListRow title="Created" trailing={{ type: 'text', text: dateAndTime(server.createdAt) }} />

        <ListRow title="Updated" trailing={{ type: 'text', text: dateAndTime(server.updatedAt) }} />
      </Section>

      {server.volumes.length === 0 ? null : (
        <Section title="Disks">
          {server.volumes.map((volume, index) => {
            const type = DISK_TYPES.get(volume.type) ?? volume.type;
            // A disk with no name is titled by its type; an unknown size is left out
            const facts = [
              volume.sizeBytes === null ? null : `${Math.round(volume.sizeBytes / GB)} GB`,
              volume.name === null ? null : type,
            ].filter((fact) => fact !== null);

            return (
              <ListRow
                key={index}
                title={volume.name ?? type}
                trailing={facts.length === 0 ? undefined : { type: 'text', text: facts.join(' · ') }}
              />
            );
          })}
        </Section>
      )}

      <Stack gap="xs">
        <ActionGrid
          actions={keys.map((key) => ({ key, ...BUTTONS[key], disabled: !offered.includes(key) }))}
          onPress={(key) => {
            // Taking a backup asks for its name instead of a question
            if (key === 'backup') {
              setBackup({ open: true, round: backup.round + 1, earlier: failure });

              return;
            }
            action.run({ key, ...specs[key], perform: () => services.instances.act(server.zone, server.id, key) });
          }}
          busyKey={action.running}
          disabledReason={action.disabledReason ?? statusReason(offered, summary.health, 'server')}
          note={note}
        />

        {failedUnderActions ? <ActionFailed message={failure.message} /> : null}
      </Stack>

      {action.sheet}

      <BackupSheet
        key={backup.round}
        serverName={server.name}
        visible={backup.open}
        onClose={() => setBackup((current) => ({ ...current, open: false }))}
        onBackUp={(name) =>
          action.run({
            key: 'backup',
            toast: 'Backup started',
            // A backup leaves the server's status as it is: nothing to follow
            poll: false,
            // Closes once sent, so a failure keeps it open with the reason under its button
            perform: async () => {
              await services.instances.act(server.zone, server.id, 'backup', name);
              setBackup((current) => ({ ...current, open: false }));
            },
          })
        }
        sending={action.running === 'backup'}
        disabledReason={action.disabledReason}
        failure={failure !== null && failure.key === 'backup' && failure !== backup.earlier ? failure.message : null}
      />
    </>
  );
}

// An Instance's screen: what it is and how it's doing, its network, details and disks, then its actions.
export function InstanceDetail({ locality, id }: { locality: string; id: string }) {
  return (
    <DetailScreen product="instances" locality={locality} id={id}>
      {({ item, summary, pinned }) => <InstanceBody server={item} summary={summary} pinned={pinned} />}
    </DetailScreen>
  );
}
