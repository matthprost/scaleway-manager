import type { ReactNode } from 'react';
import { View } from 'react-native';

type ScreenReaderShieldProps = {
  hidden: boolean;
  children: ReactNode;
};

// While `hidden`, screen readers can't reach anything inside (iOS and Android).
export function ScreenReaderShield({ hidden, children }: ScreenReaderShieldProps) {
  return (
    <View
      testID="screen-reader-shield"
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={hidden}
      style={{ flexGrow: 1 }}
    >
      {children}
    </View>
  );
}
