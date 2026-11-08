// The store screenshots, in store order: what each one shows and its caption. Demo data only.
export const SCREENSHOTS: readonly { id: string; caption: string; theme: 'light' | 'dark'; route: string }[] = [
  { id: 'home-light', caption: 'The all-new Scaleway Manager', theme: 'light', route: '/home' },
  { id: 'home-dark', caption: 'Easy on the eyes, day and night', theme: 'dark', route: '/home' },
  { id: 'resources', caption: 'Everything you run, one tap away', theme: 'light', route: '/resources' },
  {
    id: 'instance',
    caption: 'Every server, at a glance',
    theme: 'light',
    route: '/resources/instances/fr-par-1/demo-web-prod-1',
  },
  {
    id: 'database',
    caption: 'See trouble before it grows',
    theme: 'light',
    route: '/resources/databases/fr-par/demo-db-main',
  },
  { id: 'billing', caption: 'Know what you spend, month by month', theme: 'light', route: '/billing' },
];

// Each store size, and the folder of captures it is framed from
export const STORE_SIZES = {
  // App Store "iPhone with Dynamic Island (medium display)": the required iPhone set, from the 6.9" captures (same shape)
  iphone63: { width: 1206, height: 2622, raw: 'iphone69' },
  // App Store "iPhone with Dynamic Island (large display)": optional
  iphone69: { width: 1320, height: 2868, raw: 'iphone69' },
  ipad13: { width: 2064, height: 2752, raw: 'ipad13' },
  android: { width: 1080, height: 1920, raw: 'android' },
  // Google Play 7" tablet: 9:16, sized so the emulator's 1200 x 1920 captures shrink a little rather than blur
  androidTablet7: { width: 1260, height: 2240, raw: 'androidTablet7' },
} as const;
