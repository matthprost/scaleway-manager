export type ProductKey =
  | 'instances'
  | 'elastic-metal'
  | 'kubernetes'
  | 'databases'
  | 'containers'
  | 'functions'
  | 'jobs'
  | 'load-balancers';

export type Health = 'ok' | 'busy' | 'warning' | 'error' | 'stopped';

// key is `product:locality:id`.
export type ResourceSummary = {
  key: string;
  product: ProductKey;
  id: string;
  locality: string;
  name: string;
  kindLabel: string;
  detail: string;
  health: Health;
  statusLabel: string;
};

const HEALTH_ORDER: Health[] = ['error', 'warning', 'busy', 'ok', 'stopped'];

// Pinned first (pin order), then by health, then by name.
export function pickLiveResources(
  all: ResourceSummary[],
  pinnedKeys: string[],
  max = 6,
): ResourceSummary[] {
  const pinned = [...new Set(pinnedKeys)]
    .map((key) => all.find((resource) => resource.key === key))
    .filter((resource): resource is ResourceSummary => resource !== undefined);
  const rest = all
    .filter((resource) => !pinnedKeys.includes(resource.key))
    .sort(
      (a, b) =>
        HEALTH_ORDER.indexOf(a.health) - HEALTH_ORDER.indexOf(b.health) ||
        a.name.localeCompare(b.name, 'en'),
    );

  return [...pinned, ...rest].slice(0, max);
}

// How each health is counted in a product's summary ("1 needs attention", "2 need attention")
const HEALTH_WORDS: Record<Health, { one: string; many: string }> = {
  error: { one: 'failing', many: 'failing' },
  warning: { one: 'needs attention', many: 'need attention' },
  busy: { one: 'busy', many: 'busy' },
  ok: { one: 'OK', many: 'OK' },
  stopped: { one: 'stopped', many: 'stopped' },
};

// A product's resources in a few words, worst first ("1 failing · 2 OK"), and the worst health (its dot).
export function healthSummary(resources: Pick<ResourceSummary, 'health'>[]): {
  text: string;
  health: Health | null;
} {
  const present = HEALTH_ORDER.map((health) => ({
    health,
    count: resources.filter((resource) => resource.health === health).length,
  })).filter(({ count }) => count > 0);

  return {
    text: present
      .map(({ health, count }) => `${count} ${HEALTH_WORDS[health][count === 1 ? 'one' : 'many']}`)
      .join(' · '),
    health: present[0]?.health ?? null,
  };
}
