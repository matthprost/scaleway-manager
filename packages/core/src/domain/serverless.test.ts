import {
  availableServerlessActions,
  serverlessStatus,
  serverlessToSummary,
} from './serverless';
import type { ServerlessApp } from './serverless';

const app = (overrides: Partial<ServerlessApp> = {}): ServerlessApp => ({
  id: 'c-1',
  region: 'fr-par',
  kind: 'container',
  name: 'api',
  status: 'ready',
  errorMessage: null,
  domainName: 'api.functions.fnc.fr-par.scw.cloud',
  runtimeOrImage: 'rg.fr-par.scw.cloud/ns/api:latest',
  updatedAt: '2026-11-05T10:00:00Z',
  ...overrides,
});

describe('serverlessStatus', () => {
  it.each([
    ['ready', 'ok', 'Ready'],
    ['error', 'error', 'Error'],
    ['created', 'stopped', 'Not deployed'],
    ['pending', 'busy', 'Deploying…'],
    ['creating', 'busy', 'Deploying…'],
    ['updating', 'busy', 'Deploying…'],
    ['upgrading', 'busy', 'Updating…'],
    ['deleting', 'busy', 'Deleting…'],
    ['locking', 'busy', 'Locking…'],
    ['locked', 'error', 'Locked'],
    ['something_new', 'warning', 'Unknown'],
    ['constructor', 'warning', 'Unknown'],
  ])('%s is %s %s', (status, health, label) => {
    expect(serverlessStatus(app({ status }))).toEqual({ health, label });
  });
});

describe('availableServerlessActions', () => {
  it('a created function is Not deployed and can be redeployed', () => {
    const created = app({ kind: 'function', status: 'created' });

    expect(serverlessStatus(created)).toEqual({ health: 'stopped', label: 'Not deployed' });
    expect(availableServerlessActions(created)).toEqual(['redeploy']);
  });

  it.each(['ready', 'error', 'created'])('%s can be redeployed', (status) => {
    expect(availableServerlessActions(app({ status }))).toEqual(['redeploy']);
  });

  it.each(['pending', 'creating', 'updating', 'upgrading', 'deleting', 'locking', 'locked', 'other'])(
    '%s offers nothing',
    (status) => {
      expect(availableServerlessActions(app({ status }))).toEqual([]);
    },
  );
});

describe('serverlessToSummary', () => {
  it('maps a container', () => {
    expect(serverlessToSummary(app())).toEqual({
      key: 'containers:fr-par:c-1',
      product: 'containers',
      id: 'c-1',
      locality: 'fr-par',
      name: 'api',
      kindLabel: 'Serverless container',
      detail: 'api.functions.fnc.fr-par.scw.cloud',
      health: 'ok',
      statusLabel: 'Ready',
    });
  });

  it('maps a function and falls back to the runtime without a domain', () => {
    const summary = serverlessToSummary(
      app({ id: 'f-1', kind: 'function', domainName: null, runtimeOrImage: 'node22' }),
    );

    expect(summary).toMatchObject({
      key: 'functions:fr-par:f-1',
      product: 'functions',
      kindLabel: 'Serverless function',
      detail: 'node22',
    });
  });
});
