import { brandTypography, contrastRatio, darkColors, lightColors, motion, palette, sizes, spacing } from './index';

// Every Pill's background: its own badge colour, and the busy purple of `brand`
const BADGES = ['successBadge', 'warningBadge', 'dangerBadge', 'neutralBadge', 'inverseBadge', 'primaryButton'] as const;

const BADGE_PAIRS = (
  [
    ['light', lightColors],
    ['dark', darkColors],
  ] as const
).flatMap(([theme, colors]) => BADGES.map((badge) => [theme, badge, colors] as const));

describe('tokens', () => {
  it.each(BADGE_PAIRS)('%s: white words on %s reach 4.5:1', (_, badge, colors) => {
    expect(colors.onBadge).toBe(palette.white);
    expect(contrastRatio(colors.onBadge, colors[badge])).toBeGreaterThanOrEqual(4.5);
  });

  it("dark: the inverse pill's edge reaches 3:1 on the page, a card and every header stop", () => {
    for (const behind of [darkColors.background, darkColors.surface, ...darkColors.headerGradient]) {
      expect(contrastRatio(darkColors.inverseBadgeEdge, behind)).toBeGreaterThanOrEqual(3);
    }
  });

  it('light: the inverse pill has no edge to see (its own ink), so it is unchanged', () => {
    expect(lightColors.inverseBadgeEdge).toBe(lightColors.inverseBadge);
  });

  it('no longer holds the dark words on a badge, nor the inverse pair', () => {
    for (const gone of ['onAccent', 'inverseSurface', 'inverseText']) {
      expect(lightColors).not.toHaveProperty(gone);
      expect(darkColors).not.toHaveProperty(gone);
    }
  });

  it('holds the sizes screens used to type as numbers', () => {
    expect(sizes.logoHero).toBe(72);
    expect(sizes.logoSplash).toBe(96);
    // Home's header grows with the text size: homeHeaderLayout works it out, for Home and the splash
    expect(sizes).not.toHaveProperty('homeHeader');
  });

  it('holds every splash timing, from the approved mockup', () => {
    expect(motion.duration).toMatchObject({
      splashRiseDelay: 150,
      splashRise: 600,
      splashNameDelay: 380,
      splashLineDelay: 240,
      splashLetter: 420,
      splashLetterStagger: 36,
      splashHandOver: 600,
      splashFadeOutDelay: 100,
      splashFadeOut: 300,
      splashPurpleFade: 200,
      splashEntranceDelay: 250,
      splashEntrance: 420,
      splashEntranceStagger: 90,
    });
    expect(motion.easing).toMatchObject({
      overshoot: [0.33, 1.73, 0.67, 1],
      enter: [0.33, 1, 0.67, 1],
      glide: [0.65, 0, 0.35, 1],
    });
  });

  it('holds the chart sizes, timings and rise, from the approved mockup', () => {
    // The line's area; the labels above and below add 32 at the default text size (120 and 200 in all)
    expect(sizes.chartHeader).toBe(88);
    expect(sizes.chartLarge).toBe(168);
    expect(motion.duration).toMatchObject({
      chartDraw: 1400,
      chartFillDelay: 700,
      chartFillRise: 900,
      chartDotsDelay: 1200,
      chartDottedFade: 600,
      chartPulse: 2400,
    });
    expect(motion.distance.chartRise).toBe(8);
  });

  it("holds the Home pieces' sizes, from the approved mockup", () => {
    // A resource card in the Live resources carousel, at the default text size
    expect(sizes.resourceCard).toBe(150);
    // The visible height of the chip and the 6M / 12M switch on the header (their touch box is 44)
    expect(sizes.compactControl).toBe(28);
    // A status dot, and a dot in a legend
    expect(sizes.dot).toBe(7);
  });

  it("holds the tab bar's sizes, from the owner's reference: a compact capsule with a wide active tab", () => {
    // Each tab's slot, filled by its capsule when active (about 68 × 44 in the reference)
    expect(sizes.tabItemWidth).toBe(68);
    expect(sizes.tabItemHeight).toBe(44);
    // The capsule, 4 pt of padding and the 1 pt border, above and below
    expect(sizes.tabBarHeight).toBe(sizes.tabItemHeight + 2 * spacing.xxs + 2);
    // As wide as its tabs now, so no widest size
    expect(sizes).not.toHaveProperty('tabBarMaxWidth');
  });

  it('no longer holds the loading dots or the old shrink', () => {
    for (const gone of ['dotPulse', 'dotStagger', 'logoFade', 'splashShrink']) {
      expect(motion.duration).not.toHaveProperty(gone);
    }
  });

  it('holds the splash name styles apart from the Text variants', () => {
    expect(brandTypography.splashName).toEqual({ fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: -0.6 });
    expect(brandTypography.splashNameLight).toEqual({ fontSize: 40, lineHeight: 48, fontWeight: '300', letterSpacing: 4.3 });
  });
});
