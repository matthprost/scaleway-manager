import { incidentsAffecting } from './status';
import type { ProductKey } from './resources';
import type { ServiceIncident } from './status';

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

type Used = { product: ProductKey; locality: string }[];

const used: Used = [{ product: 'instances', locality: 'fr-par-1' }];

const ids = (list: ServiceIncident[]): string[] => list.map((i) => i.id);

describe('incidentsAffecting', () => {
  it('keeps incidents on products in use', () => {
    expect(ids(incidentsAffecting([incident('a', ['Instances'])], used))).toEqual(['a']);
  });

  it('matches a region to its zones', () => {
    const list = [incident('a', ['fr-par-2']), incident('b', ['fr-par-1']), incident('c', ['nl-ams-1'])];

    expect(ids(incidentsAffecting(list, [{ product: 'kubernetes', locality: 'fr-par' }]))).toEqual([
      'a',
      'b',
    ]);
    expect(ids(incidentsAffecting(list, [{ product: 'instances', locality: 'fr-par-1' }]))).toEqual(['b']);
  });

  it('matches the region prefix both ways', () => {
    const list = [incident('a', ['fr-par']), incident('b', ['nl-ams']), incident('c', ['fr-par-1'])];

    // A region on the page covers the zones in use; a zone on the page is inside a region in use.
    expect(ids(incidentsAffecting(list, used))).toEqual(['a', 'c']);
    expect(ids(incidentsAffecting(list, [{ product: 'kubernetes', locality: 'fr-par' }]))).toEqual([
      'a',
      'c',
    ]);
  });

  it('needs the product and a locality in use when the incident lists localities', () => {
    const list = [
      incident('a', ['Instances', 'fr-par-1']),
      incident('b', ['Instances', 'nl-ams-1']),
      incident('c', ['Instances', 'fr-par']),
      incident('d', ['Load Balancer', 'fr-par-1']),
      incident('e', ['Instances']),
    ];

    expect(ids(incidentsAffecting(list, used))).toEqual(['a', 'c', 'e']);
  });

  it("an incident on one product doesn't match another product's region", () => {
    const list = [incident('a', ['Instances', 'fr-par-2']), incident('b', ['Kubernetes Kapsule', 'fr-par-2'])];
    const onlyKubernetes: Used = [{ product: 'kubernetes', locality: 'fr-par' }];

    expect(ids(incidentsAffecting(list, onlyKubernetes))).toEqual(['b']);
  });

  it('matches each product with its own locality', () => {
    const list = [incident('a', ['Instances', 'nl-ams-1'])];
    const pairs: Used = [
      { product: 'instances', locality: 'fr-par-1' },
      { product: 'kubernetes', locality: 'nl-ams' },
    ];

    expect(incidentsAffecting(list, pairs)).toEqual([]);
  });

  it('always keeps API and account incidents', () => {
    const list = ['APIs', 'Account', 'IAM', 'Billing'].map((c) => incident(c, [c]));

    expect(incidentsAffecting(list, [])).toHaveLength(4);
  });

  it('keeps API and account incidents whatever locality they name', () => {
    const list = ['APIs', 'Account', 'IAM', 'Billing'].map((c) => incident(c, [c, 'nl-ams']));

    expect(incidentsAffecting(list, used)).toHaveLength(4);
    expect(incidentsAffecting(list, [])).toHaveLength(4);
  });

  it('drops unrelated incidents', () => {
    const list = [incident('a', ['Jobs']), incident('b', ['nl-ams-1']), incident('c', ['fr-parx-1'])];

    expect(incidentsAffecting(list, used)).toEqual([]);
  });
});
