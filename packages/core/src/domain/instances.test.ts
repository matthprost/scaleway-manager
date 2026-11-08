import { availableInstanceActions, instanceStatus, instanceToSummary } from './instances';
import type { InstanceServer } from './instances';

const server = (overrides: Partial<InstanceServer> = {}): InstanceServer => ({
  id: 'i-1',
  zone: 'fr-par-1',
  name: 'web-prod-1',
  state: 'running',
  commercialType: 'DEV1-S',
  imageName: 'Ubuntu 24.04',
  publicIpv4: ['51.15.12.34'],
  publicIpv6: [],
  hasDynamicPublicIp: false,
  privateIp: '10.0.0.4',
  volumes: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  allowedActions: [],
  ...overrides,
});

describe('instanceStatus', () => {
  it.each([
    ['running', 'ok', 'Running'],
    ['stopped', 'stopped', 'Stopped'],
    ['standby', 'stopped', 'Standby'],
    ['starting', 'busy', 'Starting…'],
    ['stopping', 'busy', 'Stopping…'],
    ['locked', 'error', 'Locked'],
    ['unknown', 'warning', 'Unknown'],
  ] as const)('%s is %s "%s"', (state, health, label) => {
    expect(instanceStatus(state)).toEqual({ health, label });
  });

  it.each(['something_new', 'constructor'])('maps the unknown state %s to Unknown', (state) => {
    expect(instanceStatus(state as never)).toEqual({ health: 'warning', label: 'Unknown' });
  });
});

describe('availableInstanceActions', () => {
  it('a running instance offers power off, standby, reboot and backup', () => {
    expect(availableInstanceActions(server())).toEqual(['poweroff', 'stop_in_place', 'reboot', 'backup']);
  });

  it.each(['stopped', 'standby'] as const)('a %s instance offers power on and backup', (state) => {
    expect(availableInstanceActions(server({ state }))).toEqual(['poweron', 'backup']);
  });

  it.each(['starting', 'stopping', 'locked', 'unknown'] as const)('a %s instance offers nothing', (state) => {
    expect(availableInstanceActions(server({ state }))).toEqual([]);
  });

  it('allowed_actions narrows the available actions', () => {
    expect(availableInstanceActions(server({ allowedActions: ['poweroff', 'reboot'] }))).toEqual([
      'poweroff',
      'reboot',
    ]);
  });

  it('terminate is never offered, even when Scaleway allows it', () => {
    const actions = availableInstanceActions(
      server({ allowedActions: ['poweroff', 'terminate', 'enable_routed_ip', 'backup'] }),
    );

    expect(actions).toEqual(['poweroff', 'backup']);
  });
});

describe('instanceToSummary', () => {
  it('uses the image name and the first public IPv4', () => {
    expect(instanceToSummary(server())).toEqual({
      key: 'instances:fr-par-1:i-1',
      product: 'instances',
      id: 'i-1',
      locality: 'fr-par-1',
      name: 'web-prod-1',
      kindLabel: 'Instance · Ubuntu 24.04',
      detail: '51.15.12.34',
      health: 'ok',
      statusLabel: 'Running',
    });
  });

  it('falls back to the commercial type and the private IP', () => {
    const summary = instanceToSummary(server({ imageName: null, publicIpv4: [] }));

    expect(summary.kindLabel).toBe('Instance · DEV1-S');
    expect(summary.detail).toBe('10.0.0.4');
  });

  it('falls back to the commercial type when there is no IP at all', () => {
    expect(instanceToSummary(server({ publicIpv4: [], privateIp: null })).detail).toBe('DEV1-S');
  });
});
