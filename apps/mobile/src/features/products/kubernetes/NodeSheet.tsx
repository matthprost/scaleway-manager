import { availableNodeActions, nodeStatus } from '@scaleway-manager/core';
import type { KubernetesNode, KubernetesNodeAction } from '@scaleway-manager/core';
import { ActionGrid, AlertRow, ListRow, Section, Sheet, Stack } from '@scaleway-manager/ui';
import type { IconName } from '@scaleway-manager/ui';
import { useState } from 'react';

import { useServices } from '../../../wiring/ServicesProvider';
import { ActionFailed } from '../../errors/ActionFailed';
import { useSheetVisible } from '../../lock/useSheetVisible';
import { statusReason } from '../../resources/statusReason';
import { useResourceAction } from '../../resources/useResourceAction';

type NodeActionCopy = { label: string; icon: IconName; verb: string; message: string; toast: string };

// In the order the sheet shows them
const ACTIONS: Record<KubernetesNodeAction, NodeActionCopy> = {
  reboot: {
    label: 'Reboot node',
    icon: 'restart',
    verb: 'Reboot',
    message: 'Pods on this node stop and restart on other nodes if they can.',
    toast: 'Node reboot requested',
  },
  replace: {
    label: 'Replace node',
    icon: 'replace',
    verb: 'Replace',
    message: 'This node is deleted and a fresh one takes its place. Pods move to other nodes.',
    toast: 'Node replacement requested',
  },
};

const KEYS = Object.keys(ACTIONS) as KubernetesNodeAction[];

type NodeSheetProps = {
  node: KubernetesNode;
  // Its pool's name, once the pools are known
  poolName: string | undefined;
  region: string;
  // The screen wants it open
  visible: boolean;
  onClose: () => void;
};

// One node: what went wrong on Scaleway's side, its status, pool and public IP, then its actions. An action asks
// first, as this sheet's second step (a sheet can't open a sheet), and the sheet closes once it's sent.
export function NodeSheet({ node, poolName, region, visible, onClose }: NodeSheetProps) {
  const { clipboard, kubernetes } = useServices();
  const sheet = useSheetVisible(visible);
  const action = useResourceAction<KubernetesNodeAction>();
  // The node the last action was for: a failure shows in that node's sheet only
  const [actedOn, setActedOn] = useState<string | null>(null);
  const status = nodeStatus(node);
  const available = availableNodeActions(node);

  const ask = (key: KubernetesNodeAction) => {
    const copy = ACTIONS[key];
    setActedOn(node.id);
    action.run({
      key,
      confirm: { title: `${copy.verb} ${node.name}?`, message: copy.message, confirmLabel: copy.verb },
      toast: copy.toast,
      perform: async () => {
        await kubernetes.actOnNode(region, node.id, key);
        // Closed before the toast, which shows under a sheet
        onClose();
      },
    });
  };

  return (
    <Sheet
      visible={sheet}
      title={node.name}
      // Closing it drops the question too
      onClose={() => {
        action.confirm?.onCancel();
        onClose();
      }}
      confirm={action.confirm}
    >
      <Stack>
        {node.errorMessage === null ? null : <AlertRow title="Node problem" detail={node.errorMessage} />}

        <Section>
          <ListRow title="Status" trailing={{ type: 'status', label: status.label, health: status.health }} />

          {poolName === undefined ? null : <ListRow title="Pool" trailing={{ type: 'text', text: poolName }} />}

          {node.publicIpv4 === null ? null : (
            <ListRow
              title="Public IP"
              trailing={{
                type: 'text',
                text: node.publicIpv4,
                onCopy: (text, options) => clipboard.copy(text, options),
              }}
            />
          )}
        </Section>

        <Stack gap="xs">
          <ActionGrid
            actions={KEYS.map((key) => ({
              key,
              label: ACTIONS[key].label,
              icon: ACTIONS[key].icon,
              disabled: !available.includes(key),
            }))}
            onPress={ask}
            busyKey={action.running}
            disabledReason={action.disabledReason ?? statusReason(available, status.health, 'node')}
          />

          {action.failure === null || actedOn !== node.id ? null : <ActionFailed message={action.failure.message} />}
        </Stack>
      </Stack>
    </Sheet>
  );
}
