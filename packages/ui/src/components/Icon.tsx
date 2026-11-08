import {
  Activity,
  Archive,
  Box,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePlay,
  CircleStop,
  Code,
  Container,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Fingerprint,
  House,
  Info,
  Key,
  Layers,
  Lock,
  LogOut,
  Moon,
  Play,
  Plus,
  Power,
  RefreshCw,
  Replace,
  RotateCw,
  Server,
  Split,
  Star,
  SunMoon,
  Trash2,
  TriangleAlert,
  User,
  WifiOff,
  X,
  Zap,
} from 'lucide-react-native';

import { useTheme } from '../theme';
import type { Product } from '../tokens';
import { toneColor } from './Text';
import type { Tone } from './Text';

const icons = {
  home: House,
  layers: Layers,
  chart: ChartColumn,
  user: User,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  'wifi-off': WifiOff,
  check: Check,
  // The picked choice in a list (never `check`, which means done)
  'circle-check': CircleCheck,
  lock: Lock,
  'log-out': LogOut,
  fingerprint: Fingerprint,
  alert: TriangleAlert,
  close: X,
  // Products
  server: Server,
  cube: Box,
  database: Database,
  box: Container,
  zap: Zap,
  play: Play,
  split: Split,
  // Actions and rows
  star: Star,
  // Pinned: the same star, filled in its tone
  'star-filled': Star,
  plus: Plus,
  trash: Trash2,
  key: Key,
  activity: Activity,
  file: FileText,
  copy: Copy,
  // lucide has no brand icons anymore
  github: Code,
  // Account
  appearance: SunMoon,
  // About the app; a note to read (AlertRow info)
  info: Info,
  // Opens outside the app (a ListRow's `external` trailing)
  external: ExternalLink,
  // Product actions (ActionGrid)
  power: Power,
  moon: Moon,
  restart: RotateCw,
  backup: Archive,
  redeploy: RefreshCw,
  replace: Replace,
  run: CirclePlay,
  stop: CircleStop,
};

export type IconName = keyof typeof icons;

// Drawn filled in their colour; every other icon is an outline
const filled: readonly IconName[] = ['star-filled'];

type IconProps = {
  name: IconName;
  size?: 'sm' | 'md' | 'lg';
  tone?: Tone | 'active' | 'idle';
  // Draws it in this product's colour instead of a tone (ResourceCard's tile); the tone if it has none
  product?: Product;
};

export function Icon({ name, size = 'md', tone = 'default', product }: IconProps) {
  const { colors, sizes } = useTheme();
  const Glyph = icons[name];
  const pixels = { sm: sizes.iconSm, md: sizes.iconMd, lg: sizes.iconLg }[size];
  const color = product && product in colors.products
    ? colors.products[product].icon
    : tone === 'active'
      ? colors.tabActiveIcon
      : tone === 'idle'
        ? colors.tabIdleIcon
        : toneColor(colors, tone);

  // The stroke stays on a filled icon, so it keeps the outline's size and corners
  return <Glyph size={pixels} color={color} strokeWidth={1.9} fill={filled.includes(name) ? color : 'none'} />;
}
