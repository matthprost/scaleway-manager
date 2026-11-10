import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../theme';
import type { spacing as spacingTokens } from '../tokens';
import { NoEdgeEffects } from './NoEdgeEffects';

type CarouselProps = {
  children: ReactNode;
  // Each item's width at the default text size: a token (sizes.resourceCard)
  itemWidth: number;
  gap?: keyof typeof spacingTokens;
};

// A row of cards that scrolls sideways, stops on a card, and runs to the screen edges.
export function Carousel({ children, itemWidth, gap = 'sm' }: CarouselProps) {
  const { sizes, spacing } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  // It sits in the content column (a padded Screen or a Stack paddingHorizontal md contained): 16 pt in, centred at 560
  const column = Math.min(width, sizes.contentMaxWidth);
  const bleed = (width - column) / 2 + spacing.md;
  // Items grow with the text, so their words fit; one item at most fills the column
  const item = Math.min(itemWidth * Math.max(1, fontScale), column - 2 * spacing.md);
  const space = spacing[gap];

  // Slots stretch to the tallest card, and a card fills its slot (Card grow, ResourceCard).
  // Each slot keeps its card's key, so a card that moves keeps its state.
  return (
    <NoEdgeEffects style={{ flexGrow: 1, flexShrink: 1, marginHorizontal: -bleed }}>
      <ScrollView
        testID="carousel"
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={item + space}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: bleed, gap: space, alignItems: 'stretch' }}
      >
        {Children.toArray(children).map((child, index) => (
          <View key={isValidElement(child) ? child.key : index} testID="carousel-item" style={{ width: item }}>
            {child}
          </View>
        ))}
      </ScrollView>
    </NoEdgeEffects>
  );
}
