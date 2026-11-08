import { View } from 'react-native';

import { useTheme } from '../theme';
import type { Product } from '../tokens';
import { Icon } from './Icon';
import type { IconName } from './Icon';

// Each product's icon (the gallery shows them too)
export const PRODUCT_ICON = {
  instances: 'server',
  'elastic-metal': 'server',
  kubernetes: 'cube',
  databases: 'database',
  containers: 'box',
  functions: 'zap',
  jobs: 'play',
  'load-balancers': 'split',
} as const satisfies Record<Product, IconName>;

type ProductTileProps = {
  product: Product;
  // 'large' in a DetailHero, with a bigger icon
  size?: 'regular' | 'large';
};

// A product's icon on its soft tile (private to ui: ResourceCard, ListRow, DetailHero).
export function ProductTile({ product, size = 'regular' }: ProductTileProps) {
  const { colors, radii, sizes } = useTheme();
  const large = size === 'large';
  const side = large ? sizes.productTileLarge : sizes.productTile;
  // A product core has and ui doesn't yet: a neutral tile instead of a crash
  const known = product in colors.products;

  return (
    <View
      testID="product-tile"
      style={{
        width: side,
        height: side,
        borderRadius: large ? radii.md : radii.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: known ? colors.products[product].tile : colors.background,
      }}
    >
      <Icon
        name={known ? PRODUCT_ICON[product] : 'layers'}
        size={large ? 'md' : 'sm'}
        product={known ? product : undefined}
        tone="muted"
      />
    </View>
  );
}
