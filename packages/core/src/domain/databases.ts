import type { Health, ResourceSummary } from './resources';

export type DatabaseInstance = {
  id: string;
  region: string;
  name: string;
  engine: string;
  status: string;
  nodeType: string;
  endpoint: string | null;
  isHa: boolean;
};

export type DatabaseBackup = {
  id: string;
  name: string;
  databaseName: string;
  status: string;
  sizeBytes: number | null;
  createdAt: string;
  expiresAt: string | null;
};

export type MetricSeries = {
  metric: 'cpu' | 'memory' | 'disk';
  unit: '%';
  points: { at: string; value: number }[];
};

export type DatabaseAction = 'restart' | 'backup';

type Status = { health: Health; label: string };

const STATUS = new Map<string, Status>(
  Object.entries({
    ready: { health: 'ok', label: 'Ready' },
    disk_full: { health: 'error', label: 'Disk full' },
    error: { health: 'error', label: 'Error' },
    autohealing: { health: 'warning', label: 'Self-healing…' },
    provisioning: { health: 'busy', label: 'Setting up…' },
    initializing: { health: 'busy', label: 'Setting up…' },
    configuring: { health: 'busy', label: 'Setting up…' },
    backuping: { health: 'busy', label: 'Backing up…' },
    snapshotting: { health: 'busy', label: 'Taking a snapshot…' },
    restarting: { health: 'busy', label: 'Restarting…' },
    deleting: { health: 'busy', label: 'Deleting…' },
    locked: { health: 'error', label: 'Locked' },
  } satisfies Record<string, Status>),
);

const ACTIONABLE = ['ready', 'autohealing', 'disk_full', 'error'];

export function databaseStatus(db: Pick<DatabaseInstance, 'status'>): Status {
  return STATUS.get(db.status) ?? { health: 'warning', label: 'Unknown' };
}

export function availableDatabaseActions(db: Pick<DatabaseInstance, 'status'>): DatabaseAction[] {
  return ACTIONABLE.includes(db.status) ? ['restart', 'backup'] : [];
}

// Sizes in the units Scaleway shows (1 GB = 1 000 000 000 bytes)
const MB = 1_000_000;
const GB = 1_000_000_000;

const BACKUP_STATUS = new Map<string, { label: string; health: Health }>(
  Object.entries({
    creating: { label: 'Creating…', health: 'busy' },
    restoring: { label: 'Restoring…', health: 'busy' },
    exporting: { label: 'Exporting…', health: 'busy' },
    deleting: { label: 'Deleting…', health: 'busy' },
    error: { label: 'Failed', health: 'error' },
    locked: { label: 'Locked', health: 'error' },
  } satisfies Record<string, { label: string; health: Health }>),
);

// A backup's words in its list: its size once it's ready ("412 MB", "1.5 GB"), otherwise what it's doing
export function backupStatusLabel(backup: Pick<DatabaseBackup, 'status' | 'sizeBytes'>): string {
  const { status, sizeBytes } = backup;

  if (status !== 'ready') {
    return BACKUP_STATUS.get(status)?.label ?? 'Unknown';
  }
  if (sizeBytes === null) {
    return 'Ready';
  }
  if (sizeBytes < MB) {
    return '< 1 MB';
  }
  const megabytes = Math.round(sizeBytes / MB);

  return megabytes < 1000 ? `${megabytes} MB` : `${Number((sizeBytes / GB).toFixed(1))} GB`;
}

// A backup's health, for its status Pill while it isn't ready
export function backupHealth(backup: Pick<DatabaseBackup, 'status'>): Health {
  if (backup.status === 'ready') {
    return 'ok';
  }

  return BACKUP_STATUS.get(backup.status)?.health ?? 'warning';
}

export function databaseToSummary(db: DatabaseInstance): ResourceSummary {
  const status = databaseStatus(db);

  return {
    key: `databases:${db.region}:${db.id}`,
    product: 'databases',
    id: db.id,
    locality: db.region,
    name: db.name,
    kindLabel: db.engine,
    detail: db.endpoint ?? db.nodeType,
    health: status.health,
    statusLabel: status.label,
  };
}
