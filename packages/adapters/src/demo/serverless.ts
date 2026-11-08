import type { ClockPort, ServerlessApp, ServerlessPort } from '@scaleway-manager/core';

import { DAY, createStateBook, notFound } from './transitions';

const REGION = 'fr-par';
const ERROR_MESSAGE = 'Build failed: missing handler';

type Seed = Omit<ServerlessApp, 'updatedAt'> & { ageDays: number };

const SEEDS: Seed[] = [
  {
    id: 'demo-frontend',
    region: REGION,
    kind: 'container',
    name: 'frontend',
    status: 'ready',
    errorMessage: null,
    domainName: 'frontend-acme.functions.fnc.fr-par.scw.cloud',
    runtimeOrImage: 'rg.fr-par.scw.cloud/acme/frontend:latest',
    ageDays: 3,
  },
  {
    id: 'demo-resize-images',
    region: REGION,
    kind: 'function',
    name: 'resize-images',
    status: 'error',
    errorMessage: ERROR_MESSAGE,
    domainName: null,
    runtimeOrImage: 'python313',
    ageDays: 1,
  },
];

export const createDemoServerless = (clock: ClockPort): ServerlessPort => {
  const book = createStateBook<string>(
    clock,
    Object.fromEntries(SEEDS.map((seed) => [seed.id, seed.status])),
  );

  const build = ({ ageDays, ...seed }: Seed): ServerlessApp => {
    const status = book.get(seed.id) ?? seed.status;

    return {
      ...seed,
      status,
      errorMessage: status === 'error' ? seed.errorMessage : null,
      updatedAt: new Date(clock.now().getTime() - ageDays * DAY).toISOString(),
    };
  };

  const find = (region: string, kind: ServerlessApp['kind'], id: string): Seed => {
    const found = SEEDS.find((seed) => seed.id === id && seed.region === region && seed.kind === kind);

    if (found === undefined) {
      throw notFound();
    }

    return found;
  };

  return {
    list: async (projectId) => (projectId === 'demo-prod' ? SEEDS.map(build) : []),
    get: async (region, kind, id) => build(find(region, kind, id)),
    redeploy: async (region, kind, id) => {
      book.start(find(region, kind, id).id, 'updating', 'ready');
    },
  };
};
