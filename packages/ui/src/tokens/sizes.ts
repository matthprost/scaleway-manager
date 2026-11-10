export const sizes = {
  buttonMd: 48,
  buttonSm: 36,
  // The tab's capsule (44) with 4 pt (spacing.xxs) and the 1 pt border above and below
  tabBarHeight: 54,
  // The least room between the bar and the screen's sides (only a very narrow window gets that close)
  tabBarInset: 36,
  tabBarMinBottom: 18,
  // One tab's slot, which its capsule fills when it's the active tab
  tabItemWidth: 68,
  tabItemHeight: 44,
  listRowMin: 52,
  iconSm: 16,
  iconMd: 21,
  iconLg: 24,
  touchMin: 44,
  contentMaxWidth: 560,
  logoHero: 72,
  // The splash's logo, and the app switcher's cover (centred, like the splash's first frame)
  logoSplash: 96,
  // The chart's line area (LineChart size 'header' / 'large'); its labels add room above and below
  chartHeader: 88,
  chartLarge: 168,
  // A resource card in a Carousel, at the default text size (it grows with the text)
  resourceCard: 150,
  // A product's icon tile in a ResourceCard or a ListRow, from the approved mockup; bigger in a DetailHero
  productTile: 30,
  productTileLarge: 44,
  // A MetricChart's line area; its captions may make it taller
  chartMetric: 72,
  // The visible height of PickerChip and SegmentedControl (their touch box is touchMin)
  compactControl: 28,
  // A status dot, and a dot in a legend
  dot: 7,
} as const;
