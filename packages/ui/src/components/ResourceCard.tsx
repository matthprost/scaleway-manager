import { useWindowDimensions, View } from 'react-native';

import { useTheme } from '../theme';
import type { Product } from '../tokens';
import { Card } from './Card';
import { HealthDot } from './HealthDot';
import type { Health } from './HealthDot';
import { Icon } from './Icon';
import { ProductTile } from './ProductTile';
import { Skeleton } from './Skeleton';
import { StatusPill } from './StatusPill';
import { Text } from './Text';

type ResourceCardProps =
  // While the resources load: the card's shape, nothing to press or read out
  | { loading: true }
  | {
      loading?: false;
      // Sets the tile's colour and icon
      product: Product;
      title: string;
      subtitle: string;
      meta: string;
      statusLabel: string;
      health: Health;
      pinned?: boolean;
      onPress: () => void;
    };

// A resource at a glance, for the Live resources carousel. It only shows; tapping opens the resource.
export function ResourceCard(props: ResourceCardProps) {
  const { colors, sizes, spacing, typography } = useTheme();
  const { fontScale } = useWindowDimensions();

  // The real card's shape, so nothing jumps when the resources arrive
  if (props.loading) {
    // About a status word's Pill ("Running")
    const pillPlaceholderWidth = 2 * sizes.productTile;

    return (
      <Card padding="sm" grow>
        <View
          testID="resource-card-placeholder"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexGrow: 1, gap: spacing.xs }}
        >
          <View style={{ flexGrow: 1, gap: spacing.xs }}>
            <Skeleton width={sizes.productTile} height={sizes.productTile} />

            <View>
              <Skeleton width="100%" variant="headline" />

              <Skeleton width="100%" variant="subhead" />
            </View>

            <Skeleton width="100%" variant="subhead" />
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
            <Text variant="caption" tone="muted">
              Status
            </Text>

            <Skeleton
              width={pillPlaceholderWidth}
              height={typography.caption.lineHeight * fontScale + 2 * spacing.xxs}
              radius="pill"
            />
          </View>
        </View>
      </Card>
    );
  }

  const { product, title, subtitle, meta, statusLabel, health, pinned = false, onPress } = props;
  const label = [title, subtitle, meta, statusLabel, pinned ? 'Pinned' : null].filter(Boolean).join(', ');

  // No width: it fills its Carousel slot (sizes.resourceCard, grown with the text size), and its height too.
  // The free room goes above the divider, so Status lines up on every card of the row.
  return (
    <Card onPress={onPress} padding="sm" grow accessibilityLabel={label}>
      <View testID="resource-card-body" style={{ flexGrow: 1, gap: spacing.xs }}>
        <View testID="resource-card-room" style={{ flexGrow: 1, gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ProductTile product={product} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {pinned ? (
                <View testID="resource-pinned">
                  <Icon name="star-filled" size="sm" tone="brand" />
                </View>
              ) : null}

              <HealthDot health={health} />
            </View>
          </View>

          <View>
            <Text variant="headline" numberOfLines={1}>
              {title}
            </Text>

            <Text variant="subhead" tone="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          <Text variant="subhead" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: colors.divider }} />

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.xs,
          }}
        >
          <Text variant="caption" tone="muted">
            Status
          </Text>

          <View style={{ flexShrink: 1 }}>
            <StatusPill label={statusLabel} health={health} />
          </View>
        </View>
      </View>
    </Card>
  );
}
