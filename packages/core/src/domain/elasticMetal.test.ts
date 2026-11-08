import {
  availableElasticMetalActions,
  elasticMetalStatus,
  elasticMetalToSummary,
} from './elasticMetal';
import type { ElasticMetalServer, ElasticMetalStatus } from './elasticMetal';

const server = (overrides: Partial<ElasticMetalServer> = {}): ElasticMetalServer => ({
  id: 'em-1',
  zone: 'fr-par-2',
  name: 'db-metal',
  status: 'ready',
  ping: 'up',
  offerName: 'EM-A410X-SSD',
  ips: ['163.172.1.1'],
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('elasticMetalStatus', () => {
  it('a ready Elastic Metal server that answers pings is Running', () => {
    expect(elasticMetalStatus(server())).toEqual({ health: 'ok', label: 'Running' });
  });

  it('a ready server with unknown ping is Running', () => {
    expect(elasticMetalStatus(server({ ping: 'unknown' }))).toEqual({ health: 'ok', label: 'Running' });
  });

  it('a ready Elastic Metal server that stops answering pings is Not responding', () => {
    expect(elasticMetalStatus(server({ ping: 'down' }))).toEqual({
      health: 'error',
      label: 'Not responding',
    });
  });

  it.each([
    ['stopped', 'stopped', 'Stopped'],
    ['starting', 'busy', 'Starting…'],
    ['stopping', 'busy', 'Stopping…'],
    ['resetting', 'busy', 'Restarting…'],
    ['delivering', 'busy', 'Being delivered'],
    ['ordered', 'busy', 'Ordered'],
    ['migrating', 'busy', 'Migrating…'],
    ['deleting', 'busy', 'Deleting…'],
    ['error', 'error', 'Error'],
    ['locked', 'error', 'Locked'],
    ['out_of_stock', 'warning', 'Out of stock'],
    ['unknown', 'warning', 'Unknown'],
  ] as const)('%s is %s "%s"', (status, health, label) => {
    expect(elasticMetalStatus(server({ status, ping: 'down' }))).toEqual({ health, label });
  });

  it.each(['new_one', 'constructor'])('maps the unknown status %s to Unknown', (status) => {
    expect(elasticMetalStatus(server({ status: status as ElasticMetalStatus }))).toEqual({
      health: 'warning',
      label: 'Unknown',
    });
  });
});

describe('availableElasticMetalActions', () => {
  it('a ready server can stop or reboot', () => {
    expect(availableElasticMetalActions(server())).toEqual(['stop', 'reboot']);
  });

  it('a stopped server can start', () => {
    expect(availableElasticMetalActions(server({ status: 'stopped' }))).toEqual(['start']);
  });

  it.each(['starting', 'stopping', 'resetting', 'delivering', 'error', 'locked'] as const)(
    'a %s server offers nothing',
    (status) => {
      expect(availableElasticMetalActions(server({ status }))).toEqual([]);
    },
  );
});

describe('elasticMetalToSummary', () => {
  it('uses the offer name and the first IP', () => {
    expect(elasticMetalToSummary(server())).toEqual({
      key: 'elastic-metal:fr-par-2:em-1',
      product: 'elastic-metal',
      id: 'em-1',
      locality: 'fr-par-2',
      name: 'db-metal',
      kindLabel: 'Elastic Metal · EM-A410X-SSD',
      detail: '163.172.1.1',
      health: 'ok',
      statusLabel: 'Running',
    });
  });

  it('shows the offer name when there is no IP yet', () => {
    expect(elasticMetalToSummary(server({ ips: [] })).detail).toBe('EM-A410X-SSD');
  });
});
