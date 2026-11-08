import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme';
import type { spacing as spacingTokens } from '../tokens';

type Space = keyof typeof spacingTokens | 'none';

type StackProps = {
  children: ReactNode;
  direction?: 'column' | 'row';
  gap?: Space;
  padding?: Space;
  paddingHorizontal?: Space;
  paddingVertical?: Space;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
  grow?: boolean;
  wrap?: boolean;
  // Pulls the stack up over a HeaderBackground's rounded bottom
  overlapHeader?: boolean;
  // Centres the stack at the content width on wide screens (content under a full-bleed header)
  contained?: boolean;
};

const alignItems = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' } as const;

const justifyContent = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
} as const;

// Places children in a column or a row, with token gaps and padding.
export function Stack({
  children,
  direction = 'column',
  gap = 'md',
  padding,
  paddingHorizontal,
  paddingVertical,
  align,
  justify,
  grow = false,
  wrap = false,
  overlapHeader = false,
  contained = false,
}: StackProps) {
  const { spacing, radii, sizes } = useTheme();
  const space = (value: Space | undefined) =>
    value === undefined ? undefined : value === 'none' ? 0 : spacing[value];

  return (
    <View
      style={{
        flexDirection: direction,
        gap: space(gap),
        padding: space(padding),
        paddingHorizontal: space(paddingHorizontal),
        paddingVertical: space(paddingVertical),
        alignItems: align ? alignItems[align] : undefined,
        justifyContent: justify ? justifyContent[justify] : undefined,
        flex: grow ? 1 : undefined,
        flexWrap: wrap ? 'wrap' : undefined,
        marginTop: overlapHeader ? -radii.xl : undefined,
        ...(contained ? { width: '100%', maxWidth: sizes.contentMaxWidth, alignSelf: 'center' } : null),
      }}
    >
      {children}
    </View>
  );
}
