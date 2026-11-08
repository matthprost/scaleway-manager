import {
  availableDatabaseActions,
  backupHealth,
  backupStatusLabel,
  databaseStatus,
  databaseToSummary,
} from './databases';
import type { DatabaseBackup, DatabaseInstance } from './databases';

const db = (overrides: Partial<DatabaseInstance> = {}): DatabaseInstance => ({
  id: 'db-1',
  region: 'fr-par',
  name: 'main-db',
  engine: 'PostgreSQL-15',
  status: 'ready',
  nodeType: 'DB-DEV-S',
  endpoint: 'db.example.scw.cloud:5432',
  isHa: false,
  ...overrides,
});

const backup = (overrides: Partial<DatabaseBackup> = {}): DatabaseBackup => ({
  id: 'backup-1',
  name: 'nightly',
  databaseName: 'app',
  status: 'ready',
  sizeBytes: 412_000_000,
  createdAt: '2026-11-07T03:00:00.000Z',
  expiresAt: '2026-12-07T03:00:00.000Z',
  ...overrides,
});

describe('databaseStatus', () => {
  it.each([
    ['ready', 'ok', 'Ready'],
    ['disk_full', 'error', 'Disk full'],
    ['error', 'error', 'Error'],
    ['autohealing', 'warning', 'Self-healing…'],
    ['provisioning', 'busy', 'Setting up…'],
    ['initializing', 'busy', 'Setting up…'],
    ['configuring', 'busy', 'Setting up…'],
    ['backuping', 'busy', 'Backing up…'],
    ['snapshotting', 'busy', 'Taking a snapshot…'],
    ['restarting', 'busy', 'Restarting…'],
    ['deleting', 'busy', 'Deleting…'],
    ['locked', 'error', 'Locked'],
    ['unknown', 'warning', 'Unknown'],
    ['brand_new_state', 'warning', 'Unknown'],
    ['constructor', 'warning', 'Unknown'],
  ])('%s is %s "%s"', (status, health, label) => {
    expect(databaseStatus(db({ status }))).toEqual({ health, label });
  });
});

describe('availableDatabaseActions', () => {
  it.each(['ready', 'autohealing', 'disk_full', 'error'])('a %s database can restart or back up', (status) => {
    expect(availableDatabaseActions(db({ status }))).toEqual(['restart', 'backup']);
  });

  it.each(['provisioning', 'backuping', 'restarting', 'deleting', 'locked', 'unknown'])(
    'a %s database offers nothing',
    (status) => {
      expect(availableDatabaseActions(db({ status }))).toEqual([]);
    },
  );
});

describe('databaseToSummary', () => {
  it('uses the engine and the endpoint', () => {
    expect(databaseToSummary(db())).toEqual({
      key: 'databases:fr-par:db-1',
      product: 'databases',
      id: 'db-1',
      locality: 'fr-par',
      name: 'main-db',
      kindLabel: 'PostgreSQL-15',
      detail: 'db.example.scw.cloud:5432',
      health: 'ok',
      statusLabel: 'Ready',
    });
  });

  it('shows the node type when there is no endpoint', () => {
    expect(databaseToSummary(db({ endpoint: null })).detail).toBe('DB-DEV-S');
  });
});

describe('backupStatusLabel', () => {
  it.each([
    [412_000_000, '412 MB'],
    [1_000_000, '1 MB'],
    [999_400_000, '999 MB'],
    [999_600_000, '1 GB'],
    [1_500_000_000, '1.5 GB'],
    [12_340_000_000, '12.3 GB'],
    [400_000, '< 1 MB'],
    [0, '< 1 MB'],
  ])('a ready backup of %d bytes shows its size, "%s"', (sizeBytes, label) => {
    expect(backupStatusLabel(backup({ sizeBytes }))).toBe(label);
  });

  it('a ready backup whose size is unknown says Ready', () => {
    expect(backupStatusLabel(backup({ sizeBytes: null }))).toBe('Ready');
  });

  it.each([
    ['creating', 'Creating…'],
    ['restoring', 'Restoring…'],
    ['exporting', 'Exporting…'],
    ['deleting', 'Deleting…'],
    ['error', 'Failed'],
    ['locked', 'Locked'],
    ['unknown', 'Unknown'],
    ['brand_new_state', 'Unknown'],
    ['constructor', 'Unknown'],
  ])('a %s backup says "%s", whatever its size', (status, label) => {
    expect(backupStatusLabel(backup({ status }))).toBe(label);
  });
});

describe('backupHealth', () => {
  it.each([
    ['ready', 'ok'],
    ['creating', 'busy'],
    ['restoring', 'busy'],
    ['exporting', 'busy'],
    ['deleting', 'busy'],
    ['error', 'error'],
    ['locked', 'error'],
    ['unknown', 'warning'],
    ['brand_new_state', 'warning'],
    ['constructor', 'warning'],
  ])("a %s backup's health is %s", (status, health) => {
    expect(backupHealth(backup({ status }))).toBe(health);
  });
});
