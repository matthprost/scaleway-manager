import { View } from 'react-native';

import { useTheme } from '../theme';
import type { Product } from '../tokens';
import { Card } from './Card';
import type { Health } from './HealthDot';
import { Icon } from './Icon';
import { ProductTile } from './ProductTile';
import { StatusPill } from './StatusPill';
import { Text } from './Text';

type DetailHeroProps = {
  // Sets the tile's colour and icon
  product: Product;
  // What it is and where: "PRO2-S · fr-par-1"
  subtitle: string;
  statusLabel: string;
  health: Health;
  // Says "Pinned" in words, after the filled star
  pinned?: boolean;
};

// The top of a resource's screen, under its ScreenHeader (which holds the name): what it is, and its status.
export function DetailHero({ product, subtitle, statusLabel, health, pinned = false }: DetailHeroProps) {
  const { spacing } = useTheme();
  const label = [subtitle, statusLabel, pinned ? 'Pinned' : null].filter(Boolean).join(', ');

  return (
    <Card>
      <View
        accessible
        accessibilityLabel={label}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <ProductTile product={product} size="large" />

        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="body" tone="muted">
            {subtitle}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ flexShrink: 1 }}>
              <StatusPill label={statusLabel} health={health} />
            </View>

            {pinned ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
                <Icon name="star-filled" size="sm" tone="brand" />

                <Text variant="caption" tone="muted">
                  Pinned
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}
