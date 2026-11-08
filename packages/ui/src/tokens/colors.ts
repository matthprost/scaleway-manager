import { palette } from './palette';

export type ColorScheme = 'light' | 'dark';
export type AppearancePreference = 'system' | 'light' | 'dark';

// The Scaleway products the app shows. Same keys as core's ProductKey; ui can't import core.
export type Product =
  | 'instances'
  | 'elastic-metal'
  | 'kubernetes'
  | 'databases'
  | 'containers'
  | 'functions'
  | 'jobs'
  | 'load-balancers';

export type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  divider: string;
  brand: string;
  onBrand: string;
  primaryButton: string;
  onPrimaryButton: string;
  headerGradient: readonly string[];
  series: readonly [string, string, string, string];
  alertBackground: string;
  alertText: string;
  warningBackground: string;
  infoBackground: string;
  success: string;
  warning: string;
  neutral: string;
  // Status badges (Pill): a darker shade of each status colour, under white words (onBadge)
  successBadge: string;
  warningBadge: string;
  dangerBadge: string;
  neutralBadge: string;
  inverseBadge: string;
  // The inverse pill floats over anything: its edge shows its shape
  inverseBadgeEdge: string;
  onBadge: string;
  tabBarBackground: string;
  tabBarBorder: string;
  tabActiveBackground: string;
  tabActiveIcon: string;
  tabIdleIcon: string;
  splashBackground: string;
  chartFill: string;
  chartDotRing: string;
  skeletonOnBrand: string;
  controlOnBrand: string;
  highlightBackground: string;
  fieldBorder: string;
  shadow: string;
  scrim: string;
  // One colour per product: a soft tile and its icon
  products: Record<Product, { tile: string; icon: string }>;
};

export const lightColors: ThemeColors = {
  background: '#F6F5FA',
  surface: palette.white,
  text: palette.ink,
  textMuted: '#6B6878',
  divider: '#EEECF3',
  brand: palette.purple500,
  onBrand: palette.white,
  primaryButton: palette.purple500,
  onPrimaryButton: palette.white,
  headerGradient: ['#3D0480', '#4F0599', '#6A1FD0'],
  series: ['#4F0599', '#8A5CF0', '#C4B0F5', '#E3DDF5'],
  alertBackground: '#FFECEC',
  alertText: '#B3261E',
  warningBackground: '#FFF3D6',
  // A note to read, calmer than a warning (AlertRow tone="info")
  infoBackground: '#F0E8FF',
  success: '#22B573',
  warning: '#F5A524',
  neutral: '#B9B6C4',
  // White words (onBadge) reach 4.5:1 or more on each
  successBadge: '#137A4E',
  warningBadge: '#A15800',
  dangerBadge: '#B3261E',
  neutralBadge: '#6B6878',
  inverseBadge: palette.ink,
  // No edge to see: the pill's own ink
  inverseBadgeEdge: palette.ink,
  onBadge: palette.white,
  tabBarBackground: 'rgba(255,255,255,0.82)',
  tabBarBorder: 'rgba(20,18,26,0.06)',
  tabActiveBackground: '#F0E8FF',
  tabActiveIcon: palette.purple500,
  tabIdleIcon: '#858293',
  splashBackground: palette.purple500,
  chartFill: palette.white,
  // A deep purple ring, as in the approved mockup
  chartDotRing: '#5A0FB0',
  skeletonOnBrand: 'rgba(255,255,255,0.12)',
  // The chip and the 6M / 12M switch on the header, as in the approved mockup
  controlOnBrand: 'rgba(255,255,255,0.16)',
  // A soft purple behind a value to look at closely (SecretBox)
  highlightBackground: '#F0E8FF',
  // A text field's border at rest: at least 3:1 on surface and background
  fieldBorder: '#8A8798',
  shadow: 'rgba(40,10,90,0.10)',
  scrim: 'rgba(20,18,26,0.5)',
  // From the approved mockup where it shows them; containers' green a little darker, for 3:1
  products: {
    instances: { tile: '#FFE9DE', icon: '#E95420' },
    'elastic-metal': { tile: '#FBE3EC', icon: '#A80030' },
    kubernetes: { tile: '#E6F0FF', icon: '#3F6ED8' },
    databases: { tile: '#FFF3D6', icon: '#C77700' },
    containers: { tile: '#E8F8F2', icon: '#16996F' },
    functions: { tile: '#E0F4F8', icon: '#0B7C93' },
    jobs: { tile: '#F9E6F5', icon: '#A3348F' },
    'load-balancers': { tile: '#EEF5DC', icon: '#5E7D12' },
  },
};

export const darkColors: ThemeColors = {
  background: '#0E0C14',
  surface: '#1A1724',
  text: '#F2F0F7',
  textMuted: '#9A97A6',
  divider: '#262233',
  brand: '#A47BFF',
  onBrand: palette.white,
  primaryButton: palette.purple400,
  onPrimaryButton: palette.white,
  headerGradient: ['#22074F', '#4A0A95'],
  series: ['#A47BFF', palette.purple400, '#4E3A86', '#342A55'],
  alertBackground: '#2A1214',
  alertText: '#FF8A80',
  warningBackground: '#2A2210',
  // A note to read, calmer than a warning (AlertRow tone="info")
  infoBackground: '#33295A',
  success: '#3DD68C',
  warning: '#F7B547',
  neutral: '#5E5A6E',
  // As in light, except the greys; inverse is a dark grey here, so its words stay white
  successBadge: '#137A4E',
  warningBadge: '#A15800',
  dangerBadge: '#B3261E',
  neutralBadge: '#5E5A6E',
  inverseBadge: '#4A4558',
  // A light edge: at least 3:1 on the page, a card and the purple header
  inverseBadgeEdge: '#8F8AA0',
  onBadge: palette.white,
  tabBarBackground: 'rgba(32,28,44,0.82)',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  tabActiveBackground: '#33295A',
  tabActiveIcon: '#D9C8FF',
  tabIdleIcon: '#7D7A8C',
  splashBackground: palette.purple900,
  chartFill: '#C9A8FF',
  // A deep purple ring, as in the approved mockup
  chartDotRing: '#3A0A78',
  skeletonOnBrand: 'rgba(255,255,255,0.12)',
  // The chip and the 6M / 12M switch on the header, as in the approved mockup
  controlOnBrand: 'rgba(255,255,255,0.16)',
  // A soft purple behind a value to look at closely (SecretBox)
  highlightBackground: '#33295A',
  // A text field's border at rest: at least 3:1 on surface and background
  fieldBorder: '#6E6A80',
  shadow: 'rgba(0,0,0,0.5)',
  scrim: 'rgba(0,0,0,0.6)',
  // The same hues: a deep tile and a light icon (databases more yellow, away from the warning dot)
  products: {
    instances: { tile: '#3A2219', icon: '#FF8A5C' },
    'elastic-metal': { tile: '#3A1A26', icon: '#FF7AA0' },
    kubernetes: { tile: '#1C2A45', icon: '#7FA6FF' },
    databases: { tile: '#3A2E14', icon: '#F2DD6E' },
    containers: { tile: '#133229', icon: '#4FD1A5' },
    functions: { tile: '#12313A', icon: '#4FC8DE' },
    jobs: { tile: '#36193A', icon: '#E07ACF' },
    'load-balancers': { tile: '#283214', icon: '#9CC94E' },
  },
};
