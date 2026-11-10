import type { Money } from './money';
import { compareMonths, projectMonthEnd, topParts } from './spending';

const eur = (minor: number): Money => ({ minor, currency: 'EUR' });

describe('projectMonthEnd', () => {
  it('returns null before day 3', () => {
    expect(projectMonthEnd(eur(1000), new Date(Date.UTC(2026, 10, 1, 12)))).toBeNull();
    expect(projectMonthEnd(eur(1000), new Date(Date.UTC(2026, 10, 2, 23, 59)))).toBeNull();
  });

  it('returns a value from day 3', () => {
    expect(projectMonthEnd(eur(1000), new Date(Date.UTC(2026, 10, 3)))).not.toBeNull();
  });

  it('scales to the whole month', () => {
    expect(projectMonthEnd(eur(8460), new Date(Date.UTC(2026, 10, 18)))).toEqual(eur(14929));
  });
});

describe('compareMonths', () => {
  it('returns null when the previous month is zero', () => {
    expect(compareMonths(eur(500), eur(0))).toBeNull();
  });

  it('rounds', () => {
    expect(compareMonths(eur(11860), eur(9980))).toBe(19);
  });

  it('returns -100 when the current month is zero', () => {
    expect(compareMonths(eur(0), eur(5000))).toBe(-100);
  });

  it('returns a negative change', () => {
    expect(compareMonths(eur(5000), eur(10000))).toBe(-50);
  });
});

describe('topParts', () => {
  const spend = [
    { label: 'Instances', amount: eur(5000) },
    { label: 'Object Storage', amount: eur(3000) },
    { label: 'Databases', amount: eur(2000) },
    { label: 'Domains', amount: eur(700) },
    { label: 'Kapsule', amount: eur(300) },
  ];

  it('topParts returns an empty list for no parts', () => {
    expect(topParts([])).toEqual([]);
  });

  it('topParts groups the rest as Other', () => {
    const top = topParts(spend);

    expect(top).toHaveLength(4);
    expect(top[3]).toEqual({ label: 'Other', amount: eur(1000) });
  });

  it('topParts leaves out Other when nothing is left', () => {
    expect(topParts(spend.slice(0, 3))).toEqual(spend.slice(0, 3));
    expect(topParts([...spend.slice(0, 3), { label: 'Free', amount: eur(0) }])).toHaveLength(3);
  });
});
