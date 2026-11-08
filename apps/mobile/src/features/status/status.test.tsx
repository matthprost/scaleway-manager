import { AppError } from '@scaleway-manager/core';
import type { ServiceIncident } from '@scaleway-manager/core';
import { screen, waitFor } from '@testing-library/react-native';

import { renderWithApp } from '../../test-utils/renderWithApp';
import { createServices } from '../../wiring/services';
import { StatusSection } from './StatusSection';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));

// The demo (no network), with its own empty phone storage
const demo = () => {
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

afterEach(() => {
  jest.restoreAllMocks();
});

test('with a product failed, the status keeps its placeholder until the status page answers', async () => {
  const services = demo();
  jest.spyOn(services.instances, 'list').mockRejectedValue(new AppError('server', 'Down', 503));
  // The status page hasn't answered yet
  jest.spyOn(services.status, 'listOpenIncidents').mockReturnValue(new Promise<ServiceIncident[]>(() => {}));
  const { queryClient } = await renderWithApp(<StatusSection entrance="shown" />, { services });

  await waitFor(() =>
    expect(queryClient.getQueryState(['resources', 'instances', 'demo-prod'])?.status).toBe('error'),
  );

  // Not nothing, then a card popping in: the line's placeholder, until it knows
  expect(await screen.findByTestId('skeleton')).toBeOnTheScreen();
  expect(screen.queryByText('All Scaleway services running normally')).not.toBeOnTheScreen();
});

test("an incident on a product the project doesn't use is hidden, even in a zone it uses", async () => {
  const services = demo();
  // Our own resource: one Instance in fr-par-1, nothing else
  for (const port of [
    services.elasticMetal,
    services.kubernetes,
    services.databases,
    services.serverless,
    services.jobs,
    services.loadBalancers,
  ]) {
    jest.spyOn(port, 'list').mockResolvedValue([]);
  }
  jest.spyOn(services.instances, 'list').mockResolvedValue([
    {
      id: 'i-1',
      zone: 'fr-par-1',
      name: 'web',
      state: 'running',
      commercialType: 'DEV1-S',
      imageName: null,
      publicIpv4: [],
      publicIpv6: [],
      hasDynamicPublicIp: false,
      privateIp: null,
      volumes: [],
      createdAt: '2026-11-01T10:00:00Z',
      updatedAt: '2026-11-01T10:00:00Z',
      allowedActions: [],
    },
  ]);
  const incident = (id: string, components: string[]): ServiceIncident => ({
    id,
    name: id,
    status: 'investigating',
    impact: 'minor',
    components,
    latestUpdate: null,
    updatedAt: '2026-11-05T10:00:00Z',
    url: `https://status.scaleway.com/incidents/${id}`,
  });

  jest
    .spyOn(services.status, 'listOpenIncidents')
    .mockResolvedValue([
      incident('Kubernetes outage', ['Kubernetes Kapsule', 'fr-par-1']),
      incident('Instances outage', ['Instances', 'fr-par-1']),
    ]);
  await renderWithApp(<StatusSection entrance="shown" />, { services });

  expect(await screen.findByText('Instances outage')).toBeOnTheScreen();
  expect(screen.queryByText('Kubernetes outage')).not.toBeOnTheScreen();
});
