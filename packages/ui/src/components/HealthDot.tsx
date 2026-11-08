import { useWindowDimensions, View } from 'react-native';

import { useTheme } from '../theme';
import type { TypographyVariant } from '../tokens';

// How a resource is doing. Same members as core's Health; ui can't import core.
export type Health = 'ok' | 'busy' | 'warning' | 'error' | 'stopped';

type DotProps = {
  color: string;
  // Centres the dot on the first line of this text variant, next to it
  line?: TypographyVariant;
  testID: string;
};

// A small round dot. Private: always drawn next to its words (bible rule 11).
export function Dot({ color, line, testID }: DotProps) {
  const { radii, sizes, typography } = useTheme();
  const { fontScale } = useWindowDimensions();
  const dot = (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: sizes.dot, height: sizes.dot, borderRadius: radii.pill, backgroundColor: color }}
    />
  );

  if (!line) {
    return dot;
  }

  return (
    <View
      testID={`${testID}-line`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: typography[line].lineHeight * fontScale, justifyContent: 'center' }}
    >
      {dot}
    </View>
  );
}

type HealthDotProps = {
  health: Health;
  line?: TypographyVariant;
};

// The dot of a status. Private to ui: its users draw the status word next to it.
export function HealthDot({ health, line }: HealthDotProps) {
  const { colors } = useTheme();
  const color = {
    ok: colors.success,
    // The same purple as its Pill
    busy: colors.primaryButton,
    warning: colors.warning,
    error: colors.alertText,
    stopped: colors.neutral,
  }[health];

  return <Dot color={color} line={line} testID="health-dot" />;
}
