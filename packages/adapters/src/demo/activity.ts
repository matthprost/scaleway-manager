import type { ActivityEvent, ActivityPort, ClockPort } from '@scaleway-manager/core';

import { DEMO_USER } from './data';

const HOUR = 3_600_000;

// Hours before now, so the days group the same way on any date.
const TEMPLATE: [number, Omit<ActivityEvent, 'id' | 'at'>][] = [
  [1, { kind: 'login', actorId: DEMO_USER.id, title: 'Logged in', product: null, result: 'success' }],
  [3, { kind: 'api', actorId: DEMO_USER.id, title: 'Stop server', product: 'Instances', result: 'success' }],
  [5, { kind: 'api', actorId: 'demo-teammate', title: 'Create SSH key', product: 'IAM', result: 'success' }],
  [8, { kind: 'login', actorId: 'demo-teammate', title: 'Login failed', product: null, result: 'failure' }],
  [12, { kind: 'system', actorId: null, title: 'Reboot node', product: 'Kubernetes', result: null }],
  [20, { kind: 'api', actorId: DEMO_USER.id, title: 'Create API key', product: 'IAM', result: 'success' }],
  [26, { kind: 'api', actorId: 'demo-teammate', title: 'Update database', product: 'Databases', result: 'success' }],
  [30, { kind: 'api', actorId: DEMO_USER.id, title: 'Start server', product: 'Instances', result: 'success' }],
  [38, { kind: 'login', actorId: DEMO_USER.id, title: 'Logged in', product: null, result: 'success' }],
  [47, { kind: 'api', actorId: 'demo-teammate', title: 'Delete snapshot', product: 'Instances', result: 'failure' }],
  [55, { kind: 'system', actorId: null, title: 'Upgrade cluster', product: 'Kubernetes', result: null }],
  [68, { kind: 'api', actorId: DEMO_USER.id, title: 'Create bucket', product: 'Object Storage', result: 'success' }],
];

export const createDemoActivity = (clock: ClockPort): ActivityPort => ({
  listRecent: async () =>
    TEMPLATE.map(([hoursAgo, event], index) => ({
      ...event,
      id: `demo-event-${index + 1}`,
      at: new Date(clock.now().getTime() - hoursAgo * HOUR).toISOString(),
    })),
});
