import type { Health, ResourceSummary } from './resources';

export type ServerlessApp = {
  id: string;
  region: string;
  kind: 'container' | 'function';
  name: string;
  status: string;
  errorMessage: string | null;
  domainName: string | null;
  runtimeOrImage: string;
  updatedAt: string;
};

export type ServerlessAction = 'redeploy';

type Status = { health: Health; label: string };

const STATUS = new Map<string, Status>(
  Object.entries({
    ready: { health: 'ok', label: 'Ready' },
    error: { health: 'error', label: 'Error' },
    created: { health: 'stopped', label: 'Not deployed' },
    pending: { health: 'busy', label: 'Deploying…' },
    creating: { health: 'busy', label: 'Deploying…' },
    updating: { health: 'busy', label: 'Deploying…' },
    upgrading: { health: 'busy', label: 'Updating…' },
    deleting: { health: 'busy', label: 'Deleting…' },
    locking: { health: 'busy', label: 'Locking…' },
    locked: { health: 'error', label: 'Locked' },
  } satisfies Record<string, Status>),
);

export function serverlessStatus(app: Pick<ServerlessApp, 'status'>): Status {
  return STATUS.get(app.status) ?? { health: 'warning', label: 'Unknown' };
}

export function availableServerlessActions(app: Pick<ServerlessApp, 'status'>): ServerlessAction[] {
  const canRedeploy = app.status === 'ready' || app.status === 'error' || app.status === 'created';

  return canRedeploy ? ['redeploy'] : [];
}

export function serverlessToSummary(app: ServerlessApp): ResourceSummary {
  const status = serverlessStatus(app);
  const isContainer = app.kind === 'container';

  return {
    key: `${isContainer ? 'containers' : 'functions'}:${app.region}:${app.id}`,
    product: isContainer ? 'containers' : 'functions',
    id: app.id,
    locality: app.region,
    name: app.name,
    kindLabel: isContainer ? 'Serverless container' : 'Serverless function',
    detail: app.domainName ?? app.runtimeOrImage,
    health: status.health,
    statusLabel: status.label,
  };
}
