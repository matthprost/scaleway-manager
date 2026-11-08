import { backendState, loadBalancerStatus, loadBalancerToSummary } from './loadBalancers';
import type { BackendHealth, LoadBalancer } from './loadBalancers';

const backend = (state: BackendHealth['state'], id = 'b-1'): BackendHealth => ({
  backendId: id,
  backendName: `backend-${id}`,
  ip: '10.0.0.1',
  state,
  changedAt: null,
});

const lb = (overrides: Partial<LoadBalancer> = {}): LoadBalancer => ({
  id: 'lb-1',
  zone: 'fr-par-1',
  name: 'front',
  status: 'ready',
  ip: '51.15.0.1',
  backends: [],
  ...overrides,
});

describe('backendState', () => {
  it.each([
    ['running', 'passed', 'up'],
    ['running', 'condpass', 'up'],
    ['running', 'failed', 'down'],
    ['stopped', 'failed', 'down'],
    ['stopped', 'unknown', 'down'],
    ['running', 'unknown', 'checking'],
    ['running', 'neutral', 'checking'],
    ['maintenance', 'passed', 'checking'],
    ['', '', 'checking'],
  ])('%s + %s is %s', (serverState, healthCheck, expected) => {
    expect(backendState({ serverState, healthCheck })).toBe(expected);
  });
});

describe('loadBalancerStatus', () => {
  it('a ready load balancer without backends is Healthy', () => {
    expect(loadBalancerStatus(lb())).toEqual({ health: 'ok', label: 'Healthy' });
  });

  it('every backend up is Healthy', () => {
    expect(loadBalancerStatus(lb({ backends: [backend('up'), backend('up', 'b-2')] }))).toEqual({
      health: 'ok',
      label: 'Healthy',
    });
  });

  it('backends still being checked count as healthy', () => {
    expect(loadBalancerStatus(lb({ backends: [backend('checking'), backend('up', 'b-2')] }))).toEqual({
      health: 'ok',
      label: 'Healthy',
    });
  });

  it('a ready load balancer whose backends could not load shows Backends unavailable', () => {
    expect(loadBalancerStatus(lb({ backends: null }))).toEqual({ health: 'warning', label: 'Backends unavailable' });
  });

  it('a load balancer in another state keeps its label when its backends could not load', () => {
    expect(loadBalancerStatus(lb({ status: 'stopped', backends: null }))).toEqual({
      health: 'stopped',
      label: 'Stopped',
    });
    expect(loadBalancerStatus(lb({ status: 'pending', backends: null }))).toEqual({
      health: 'busy',
      label: 'Setting up…',
    });
  });

  it('one backend down out of three is a warning', () => {
    const backends = [backend('down'), backend('up', 'b-2'), backend('up', 'b-3')];

    expect(loadBalancerStatus(lb({ backends }))).toEqual({ health: 'warning', label: '1 backend down' });
  });

  it('two backends down out of three says backends', () => {
    const backends = [backend('down'), backend('down', 'b-2'), backend('up', 'b-3')];

    expect(loadBalancerStatus(lb({ backends }))).toEqual({ health: 'warning', label: '2 backends down' });
  });

  it('all backends down is an error', () => {
    const backends = [backend('down'), backend('down', 'b-2')];

    expect(loadBalancerStatus(lb({ backends }))).toEqual({ health: 'error', label: 'All backends down' });
  });

  it.each([
    ['pending', 'busy', 'Setting up…'],
    ['creating', 'busy', 'Setting up…'],
    ['to_create', 'busy', 'Setting up…'],
    ['migrating', 'busy', 'Setting up…'],
    ['deleting', 'busy', 'Deleting…'],
    ['to_delete', 'busy', 'Deleting…'],
    ['stopped', 'stopped', 'Stopped'],
    ['error', 'error', 'Error'],
    ['locked', 'error', 'Locked'],
    ['whatever', 'warning', 'Unknown'],
    ['constructor', 'warning', 'Unknown'],
  ])('%s is %s %s', (status, health, label) => {
    expect(loadBalancerStatus(lb({ status, backends: [backend('down')] }))).toEqual({ health, label });
  });
});

describe('loadBalancerToSummary', () => {
  it('maps a load balancer', () => {
    expect(loadBalancerToSummary(lb())).toEqual({
      key: 'load-balancers:fr-par-1:lb-1',
      product: 'load-balancers',
      id: 'lb-1',
      locality: 'fr-par-1',
      name: 'front',
      kindLabel: 'Load balancer',
      detail: '51.15.0.1',
      health: 'ok',
      statusLabel: 'Healthy',
    });
  });

  it('is never Healthy when its backends could not load', () => {
    expect(loadBalancerToSummary(lb({ backends: null }))).toMatchObject({
      detail: '51.15.0.1',
      health: 'warning',
      statusLabel: 'Backends unavailable',
    });
  });

  it('shows a dash without an IP', () => {
    expect(loadBalancerToSummary(lb({ ip: null })).detail).toBe('—');
  });
});
