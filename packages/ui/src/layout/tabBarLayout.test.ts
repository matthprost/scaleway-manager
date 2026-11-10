import { tabBarLayout } from './tabBarLayout';

describe('tabBarLayout', () => {
  it('keeps the bar above the home indicator', () => {
    expect(tabBarLayout(34)).toEqual({ bottom: 34, height: 54, clearance: 104 });
  });

  it('lifts the bar on phones without a home indicator', () => {
    expect(tabBarLayout(0).bottom).toBe(18);
  });
});
