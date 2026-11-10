import { healthSummary, pickLiveResources } from './resources';
import type { Health, ResourceSummary } from './resources';

const res = (name: string, health: Health): ResourceSummary => ({
  key: `instances:fr-par-1:${name}`,
  product: 'instances',
  id: name,
  locality: 'fr-par-1',
  name,
  kindLabel: 'Instance',
  detail: 'DEV1-S',
  health,
  statusLabel: health,
});

const names = (list: ResourceSummary[]): string[] => list.map((r) => r.name);

describe('pickLiveResources', () => {
  it('puts pinned resources first, then problems, then running', () => {
    const all = [
      res('ok-a', 'ok'),
      res('busy-a', 'busy'),
      res('warn-a', 'warning'),
      res('err-b', 'error'),
      res('err-a', 'error'),
      res('pin-z', 'stopped'),
      res('pin-y', 'ok'),
    ];
    const pinned = ['instances:fr-par-1:pin-z', 'instances:fr-par-1:pin-y'];

    expect(names(pickLiveResources(all, pinned))).toEqual([
      'pin-z',
      'pin-y',
      'err-a',
      'err-b',
      'warn-a',
      'busy-a',
    ]);
  });

  it('shows a resource once when its key is pinned twice', () => {
    const all = [res('a', 'ok'), res('b', 'ok')];
    const key = all[0]?.key ?? '';

    expect(names(pickLiveResources(all, [key, key]))).toEqual(['a', 'b']);
  });

  it('stops at 6', () => {
    const all = Array.from({ length: 10 }, (_, i) => res(`r${i}`, 'ok'));

    expect(pickLiveResources(all, [])).toHaveLength(6);
    expect(pickLiveResources(all, [], 3)).toHaveLength(3);
  });

  it('shows stopped resources only when there is room', () => {
    const running = Array.from({ length: 6 }, (_, i) => res(`r${i}`, 'ok'));
    const stopped = res('off', 'stopped');

    expect(names(pickLiveResources([stopped, ...running], []))).not.toContain('off');
    expect(names(pickLiveResources([stopped, ...running.slice(0, 2)], []))).toEqual([
      'r0',
      'r1',
      'off',
    ]);
  });
});

describe('healthSummary', () => {
  it('counts each health in words, worst first, and gives the worst health', () => {
    const all = [
      res('a', 'ok'),
      res('b', 'stopped'),
      res('c', 'error'),
      res('d', 'ok'),
      res('e', 'busy'),
      res('f', 'warning'),
      res('g', 'warning'),
    ];

    expect(healthSummary(all)).toEqual({
      text: '1 failing · 2 need attention · 1 busy · 2 OK · 1 stopped',
      health: 'error',
    });
  });

  it('leaves out the healths nobody has', () => {
    expect(healthSummary([res('a', 'ok'), res('b', 'stopped'), res('c', 'ok')])).toEqual({
      text: '2 OK · 1 stopped',
      health: 'ok',
    });
  });

  it('one resource that needs attention is said in the singular', () => {
    expect(healthSummary([res('a', 'warning'), res('b', 'ok')])).toEqual({
      text: '1 needs attention · 1 OK',
      health: 'warning',
    });
  });

  it('says nothing for no resources', () => {
    expect(healthSummary([])).toEqual({ text: '', health: null });
  });
});
