import { AppError } from '@scaleway-manager/core';
import type { KubernetesCluster, KubernetesNode, KubernetesPool } from '@scaleway-manager/core';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { renderWithApp } from '../../../test-utils/renderWithApp';
import { createServices } from '../../../wiring/services';
import type { Services } from '../../../wiring/services';
import { LockProvider } from '../../lock/LockProvider';
import { ClusterDetail } from './ClusterDetail';

// The demo (signed in, no network), with its own empty phone storage
const demo = (): Services => {
  const saved = new Map<string, string>();

  return createServices('demo', {
    kv: {
      getItem: async (key) => saved.get(key) ?? null,
      setItem: async (key, value) => {
        saved.set(key, value);
      },
      removeItem: async (key) => {
        saved.delete(key);
      },
    },
  });
};

let services = demo();

beforeEach(() => {
  jest.useFakeTimers();
  services = demo();
  onlineManager.setOnline(true);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  onlineManager.setOnline(true);
});

const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

const open = async () => {
  await renderWithApp(
    <LockProvider>
      <ClusterDetail locality="fr-par" id="demo-k8s-main" />
    </LockProvider>,
    { services },
  );
  await settle();
};

const press = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
  await settle();
};

const sheet = () => within(screen.getByTestId('sheet-content'));

const pressInSheet = async (name: string) => {
  await act(async () => {
    fireEvent.press(sheet().getByRole('button', { name }));
  });
  await settle();
};

const NODE = 'scw-k8s-main-default-a1b2';

// The demo's cluster, changed
const demoCluster = (): Promise<KubernetesCluster> => demo().kubernetes.get('fr-par', 'demo-k8s-main');

const withNodes = async (nodes: KubernetesNode[] | null) => {
  const cluster = await demoCluster();
  jest.spyOn(services.kubernetes, 'get').mockResolvedValue({ ...cluster, nodes });
};

const node = (overrides: Partial<KubernetesNode> = {}): KubernetesNode => ({
  id: 'demo-node-1',
  poolId: 'demo-pool-default',
  name: NODE,
  status: 'ready',
  errorMessage: null,
  publicIpv4: '198.51.100.40',
  ...overrides,
});

const pool = (overrides: Partial<KubernetesPool> = {}): KubernetesPool => ({
  id: 'demo-pool-default',
  name: 'default',
  nodeType: 'PRO2-S',
  size: 3,
  minSize: 3,
  maxSize: 3,
  autoscaling: false,
  status: 'ready',
  zone: 'fr-par-1',
  ...overrides,
});

describe('a Kubernetes cluster', () => {
  test('shows pools and nodes', async () => {
    await open();

    expect(screen.getByLabelText('Kubernetes 1.33 · fr-par, Healthy')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Node pools' })).toBeOnTheScreen();
    expect(screen.getByLabelText('default, 3 × PRO2-S, Ready')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Nodes' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `${NODE}, 198.51.100.40, Ready` })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'scw-k8s-main-default-c3d4, 198.51.100.41, Ready' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'scw-k8s-main-default-e5f6, 198.51.100.42, Ready' })).toBeOnTheScreen();
  });

  test('an autoscaling pool says its range, and a node with no public IP says its pool', async () => {
    jest.spyOn(services.kubernetes, 'pools').mockResolvedValue([
      pool({ autoscaling: true, minSize: 1, maxSize: 5, status: 'scaling' }),
    ]);
    await withNodes([node({ publicIpv4: null })]);
    await open();

    expect(screen.getByLabelText('default, 3 × PRO2-S · autoscaling 1–5, Scaling…')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `${NODE}, default, Ready` })).toBeOnTheScreen();
  });

  test('upgrade notice appears when available', async () => {
    await open();

    expect(
      screen.getByLabelText(
        'Note, Upgrade available, A newer Kubernetes version is available. Upgrade from the Scaleway console.',
      ),
    ).toBeOnTheScreen();
  });

  test('no upgrade notice when the cluster is up to date', async () => {
    const cluster = await demoCluster();
    jest.spyOn(services.kubernetes, 'get').mockResolvedValue({ ...cluster, upgradeAvailable: false });
    await open();

    expect(screen.queryByText('Upgrade available')).not.toBeOnTheScreen();
  });

  test('a cluster with no node pool shows its status, and no empty lists', async () => {
    const cluster = await demoCluster();
    jest.spyOn(services.kubernetes, 'get').mockResolvedValue({ ...cluster, status: 'pool_required', nodes: [] });
    jest.spyOn(services.kubernetes, 'pools').mockResolvedValue([]);
    await open();

    expect(screen.getByLabelText('Kubernetes 1.33 · fr-par, Needs a node pool')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Node pools' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Nodes' })).not.toBeOnTheScreen();
  });

  test('a big cluster draws only the nodes near the screen', async () => {
    const many = Array.from({ length: 200 }, (_, index) =>
      node({ id: `node-${index}`, name: `node-${String(index).padStart(3, '0')}` }),
    );
    await withNodes(many);
    await open();

    const drawn = screen.getAllByRole('button', { name: /^node-\d+, / }).length;

    expect(screen.getByRole('header', { name: 'Nodes' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'node-000, 198.51.100.40, Ready' })).toBeOnTheScreen();
    expect(drawn).toBeLessThan(many.length);
  });

  test("nodes that couldn't load say so, and Try again asks again", async () => {
    await withNodes(null);
    await open();

    expect(screen.getByLabelText('Kubernetes 1.33 · fr-par, Nodes unavailable')).toBeOnTheScreen();
    expect(screen.getByText("Couldn't load your nodes")).toBeOnTheScreen();

    const get = jest.spyOn(services.kubernetes, 'get').mockImplementation(demo().kubernetes.get);
    await press('Try again');

    expect(get).toHaveBeenCalled();
    expect(screen.queryByText("Couldn't load your nodes")).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `${NODE}, 198.51.100.40, Ready` })).toBeOnTheScreen();
  });

  test('node pools Scaleway refuses (403) are left out, with no Try again', async () => {
    jest.spyOn(services.kubernetes, 'pools').mockRejectedValue(new AppError('forbidden', 'Forbidden', 403));
    await open();

    expect(screen.queryByRole('header', { name: 'Node pools' })).not.toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load your node pools")).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
    // The nodes are still there
    expect(screen.getByRole('button', { name: `${NODE}, 198.51.100.40, Ready` })).toBeOnTheScreen();
  });

  test('offline with the pools and the nodes both missing, "You\'re offline" is said once', async () => {
    services = { ...demo(), mode: 'real' };
    jest.spyOn(services.kubernetes, 'pools').mockRejectedValue(new AppError('server', 'Down', 500));
    await withNodes(null);
    await open();
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(screen.getByText("Couldn't load your node pools")).toBeOnTheScreen();
    expect(screen.getByText("Couldn't load your nodes")).toBeOnTheScreen();
    expect(screen.getAllByText("You're offline")).toHaveLength(1);
  });

  test("node pools that couldn't load say so, and Try again asks again", async () => {
    const pools = jest.spyOn(services.kubernetes, 'pools').mockRejectedValue(new AppError('server', 'Down', 500));
    await open();

    expect(screen.getByText("Couldn't load your node pools")).toBeOnTheScreen();
    // The rest of the cluster is there
    expect(screen.getByRole('button', { name: `${NODE}, 198.51.100.40, Ready` })).toBeOnTheScreen();

    pools.mockRestore();
    await press('Try again');

    expect(screen.getByLabelText('default, 3 × PRO2-S, Ready')).toBeOnTheScreen();
  });
});

describe("a node's sheet", () => {
  test("shows the node's status, pool and public IP, which can be copied", async () => {
    const copy = jest.spyOn(services.clipboard, 'copy').mockResolvedValue(undefined);
    await open();
    await press(`${NODE}, 198.51.100.40, Ready`);

    expect(sheet().getByRole('header', { name: NODE })).toBeOnTheScreen();
    expect(sheet().getByLabelText('Status, Ready')).toBeOnTheScreen();
    expect(sheet().getByLabelText('Pool, default')).toBeOnTheScreen();
    expect(sheet().getByLabelText('Public IP, 198.51.100.40')).toBeOnTheScreen();

    await pressInSheet('Copy Public IP');

    expect(copy).toHaveBeenCalledWith('198.51.100.40', { sensitive: false });
  });

  test('a node with no public IP leaves the row out', async () => {
    await withNodes([node({ publicIpv4: null })]);
    await open();
    await press(`${NODE}, default, Ready`);

    expect(sheet().getByLabelText('Pool, default')).toBeOnTheScreen();
    expect(sheet().queryByText('Public IP')).not.toBeOnTheScreen();
  });

  test('a node error message is shown', async () => {
    await withNodes([
      node({ status: 'creation_error', errorMessage: 'No capacity left for PRO2-S in fr-par-1', publicIpv4: null }),
    ]);
    await open();

    expect(screen.getByLabelText('Kubernetes 1.33 · fr-par, Node problem')).toBeOnTheScreen();

    await press(`${NODE}, default, Failed to start`);

    expect(sheet().getByLabelText('Alert, Node problem, No capacity left for PRO2-S in fr-par-1')).toBeOnTheScreen();
    // What went wrong reads first, before the node's facts
    const order = sheet()
      .getAllByLabelText(/^(Alert, Node problem|Status, )/)
      .map((element) => element.props.accessibilityLabel as string);

    expect(order).toEqual(['Alert, Node problem, No capacity left for PRO2-S in fr-par-1', 'Status, Failed to start']);
  });

  test('a node without an error shows no notice', async () => {
    await open();
    await press(`${NODE}, 198.51.100.40, Ready`);

    expect(sheet().queryByText('Node problem')).not.toBeOnTheScreen();
  });

  test('replacing a node asks first', async () => {
    const actOnNode = jest.spyOn(services.kubernetes, 'actOnNode');
    await open();
    await press(`${NODE}, 198.51.100.40, Ready`);
    await pressInSheet('Replace node');

    expect(sheet().getByRole('header', { name: `Replace ${NODE}?` })).toBeOnTheScreen();
    expect(
      sheet().getByText('This node is deleted and a fresh one takes its place. Pods move to other nodes.'),
    ).toBeOnTheScreen();
    expect(actOnNode).not.toHaveBeenCalled();

    await pressInSheet('Replace');

    expect(actOnNode).toHaveBeenCalledTimes(1);
    expect(actOnNode).toHaveBeenCalledWith('fr-par', 'demo-node-1', 'replace');
    // The sheet goes, so the toast can be seen
    expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();
    expect(screen.getByText('Node replacement requested')).toBeOnTheScreen();
  });

  test('rebooting a node asks first', async () => {
    const actOnNode = jest.spyOn(services.kubernetes, 'actOnNode');
    await open();
    await press(`${NODE}, 198.51.100.40, Ready`);
    await pressInSheet('Reboot node');

    expect(sheet().getByRole('header', { name: `Reboot ${NODE}?` })).toBeOnTheScreen();
    expect(sheet().getByText('Pods on this node stop and restart on other nodes if they can.')).toBeOnTheScreen();
    expect(actOnNode).not.toHaveBeenCalled();

    await pressInSheet('Reboot');

    expect(actOnNode).toHaveBeenCalledTimes(1);
    expect(actOnNode).toHaveBeenCalledWith('fr-par', 'demo-node-1', 'reboot');
    expect(screen.getByText('Node reboot requested')).toBeOnTheScreen();

    // The node follows the change
    expect(screen.getByRole('button', { name: `${NODE}, 198.51.100.40, Rebooting…` })).toBeOnTheScreen();
  });

  test('cancelling the question sends nothing and goes back to the node', async () => {
    const actOnNode = jest.spyOn(services.kubernetes, 'actOnNode');
    await open();
    await press(`${NODE}, 198.51.100.40, Ready`);
    await pressInSheet('Replace node');
    await pressInSheet('Cancel');

    expect(actOnNode).not.toHaveBeenCalled();
    expect(sheet().getByRole('header', { name: NODE })).toBeOnTheScreen();
  });

  test("a busy node's actions are off", async () => {
    await withNodes([node({ status: 'rebooting' })]);
    await open();
    await press(`${NODE}, 198.51.100.40, Rebooting…`);

    expect(sheet().getByRole('button', { name: 'Reboot node' })).toBeDisabled();
    expect(sheet().getByRole('button', { name: 'Replace node' })).toBeDisabled();
    expect(sheet().getByText('Wait until the node is ready')).toBeOnTheScreen();
  });

  test("a locked node's actions are off, and say so", async () => {
    await withNodes([node({ status: 'locked' })]);
    await open();
    await press(`${NODE}, 198.51.100.40, Locked`);

    expect(sheet().getByRole('button', { name: 'Reboot node' })).toBeDisabled();
    expect(sheet().getByRole('button', { name: 'Replace node' })).toBeDisabled();
    expect(sheet().getByText('Not available right now')).toBeOnTheScreen();
  });

  test('a ready node says nothing under its actions', async () => {
    await open();
    await press(`${NODE}, 198.51.100.40, Ready`);

    expect(sheet().getByRole('button', { name: 'Reboot node' })).toBeEnabled();
    expect(sheet().queryByText('Wait until the node is ready')).not.toBeOnTheScreen();
    expect(sheet().queryByText('Not available right now')).not.toBeOnTheScreen();
  });

  test("offline, the node's actions are off and say why", async () => {
    services = { ...demo(), mode: 'real' };
    const actOnNode = jest.spyOn(services.kubernetes, 'actOnNode');
    await open();
    await press(`${NODE}, 198.51.100.40, Ready`);
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(sheet().getByRole('button', { name: 'Reboot node' })).toBeDisabled();
    expect(sheet().getByRole('button', { name: 'Replace node' })).toBeDisabled();
    expect(sheet().getAllByText("You're offline")).toHaveLength(1);
    expect(actOnNode).not.toHaveBeenCalled();
  });

  test('offline, a busy node says only that it is offline', async () => {
    services = { ...demo(), mode: 'real' };
    await withNodes([node({ status: 'rebooting' })]);
    await open();
    await press(`${NODE}, 198.51.100.40, Rebooting…`);
    await act(async () => {
      onlineManager.setOnline(false);
    });

    expect(sheet().getAllByText("You're offline")).toHaveLength(1);
    expect(sheet().queryByText('Wait until the node is ready')).not.toBeOnTheScreen();
  });

  test("a failed action says so in its node's sheet, and only there", async () => {
    jest.spyOn(services.kubernetes, 'actOnNode').mockRejectedValue(new AppError('server', 'Down', 500));
    await open();
    await press(`${NODE}, 198.51.100.40, Ready`);
    await pressInSheet('Reboot node');
    await pressInSheet('Reboot');

    expect(sheet().getByText("Scaleway isn't responding right now. Try again in a moment.")).toBeOnTheScreen();
    expect(screen.queryByText('Node reboot requested')).not.toBeOnTheScreen();

    await pressInSheet('Close');
    await press('scw-k8s-main-default-c3d4, 198.51.100.41, Ready');

    expect(sheet().getByRole('header', { name: 'scw-k8s-main-default-c3d4' })).toBeOnTheScreen();
    expect(sheet().queryByText("Scaleway isn't responding right now. Try again in a moment.")).not.toBeOnTheScreen();
  });
});
