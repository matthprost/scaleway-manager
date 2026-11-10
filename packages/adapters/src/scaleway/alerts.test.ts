import { AppError } from '@scaleway-manager/core';

import { createScalewayAlerts } from './alerts';
import { fakeHttp } from './testing/fakeHttp';

const alertsPath = (region: string) => `/cockpit/v1/regions/${region}/alerts?project_id=p-1&state=firing`;

const alert = (region: string, name: string, state: string, annotations: Record<string, string> = {}) => ({
  region,
  preconfigured: false,
  name,
  rule: 'up == 0',
  duration: '5m',
  rule_status: 'enabled',
  state,
  annotations,
  preconfigured_data: null,
  data_source_id: 'ds-1',
});

// Answers by path; a region left out answers with no alerts.
const setup = (answers: Record<string, unknown>) => {
  const { request, http } = fakeHttp(answers, { alerts: [], total_count: 0 });

  return { request, alerts: createScalewayAlerts({ http }) };
};

test('alerts query every region with the project and keep firing ones', async () => {
  const { request, alerts } = setup({
    [alertsPath('fr-par')]: {
      alerts: [
        alert('fr-par', 'High CPU on db-main', 'firing', {
          summary: 'CPU has been above 90% for 10 minutes.',
          description: 'Long text',
        }),
        alert('fr-par', 'Disk filling up', 'pending', { summary: 'Disk at 80%.' }),
      ],
      total_count: 2,
    },
    [alertsPath('nl-ams')]: {
      alerts: [alert('nl-ams', 'Instance down', 'firing', { description: 'web-1 stopped answering.' })],
      total_count: 1,
    },
    [alertsPath('it-mil')]: { alerts: [alert('it-mil', 'Quiet alert', 'firing')], total_count: 1 },
  });

  await expect(alerts.listFiring('p-1')).resolves.toEqual([
    {
      id: 'fr-par:High CPU on db-main',
      name: 'High CPU on db-main',
      region: 'fr-par',
      summary: 'CPU has been above 90% for 10 minutes.',
    },
    { id: 'nl-ams:Instance down', name: 'Instance down', region: 'nl-ams', summary: 'web-1 stopped answering.' },
    { id: 'it-mil:Quiet alert', name: 'Quiet alert', region: 'it-mil', summary: null },
  ]);
  expect(request.mock.calls).toEqual([
    ['GET', alertsPath('fr-par')],
    ['GET', alertsPath('nl-ams')],
    ['GET', alertsPath('pl-waw')],
    ['GET', alertsPath('it-mil')],
  ]);
});

test('alerts show the display name of preconfigured alerts', async () => {
  const preconfigured = (name: string, displayName: string) => ({
    ...alert('fr-par', name, 'firing'),
    preconfigured: true,
    preconfigured_data: {
      preconfigured_rule_id: `rule-${name}`,
      display_name: displayName,
      display_description: '',
      product_name: 'instance',
      product_family: 'compute',
    },
  });
  const { alerts } = setup({
    [alertsPath('fr-par')]: {
      alerts: [preconfigured('instance-cpu-high', 'Instance CPU high'), preconfigured('instance-down', '')],
      total_count: 2,
    },
  });

  await expect(alerts.listFiring('p-1')).resolves.toEqual([
    { id: 'fr-par:instance-cpu-high', name: 'Instance CPU high', region: 'fr-par', summary: null },
    { id: 'fr-par:instance-down', name: 'instance-down', region: 'fr-par', summary: null },
  ]);
});

test('alerts ignore regions without Cockpit', async () => {
  const { alerts } = setup({
    [alertsPath('fr-par')]: { alerts: [alert('fr-par', 'High CPU', 'firing')], total_count: 1 },
    [alertsPath('nl-ams')]: new AppError('not_found', 'Not found', 404),
    [alertsPath('pl-waw')]: new AppError('forbidden', 'Forbidden', 403),
    [alertsPath('it-mil')]: { alerts: [alert('it-mil', 'Disk full', 'firing')], total_count: 1 },
  });

  await expect(alerts.listFiring('p-1')).resolves.toEqual([
    { id: 'fr-par:High CPU', name: 'High CPU', region: 'fr-par', summary: null },
    { id: 'it-mil:Disk full', name: 'Disk full', region: 'it-mil', summary: null },
  ]);
});

test('alerts fail when a region fails for another reason', async () => {
  const { alerts } = setup({
    [alertsPath('fr-par')]: { alerts: [alert('fr-par', 'High CPU', 'firing')], total_count: 1 },
    [alertsPath('nl-ams')]: new AppError('server', 'Internal error', 500),
  });

  await expect(alerts.listFiring('p-1')).rejects.toMatchObject({ kind: 'server', status: 500 });
});
