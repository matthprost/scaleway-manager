import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { noticeLayout } from '../layout/noticeLayout';
import { useTheme } from '../theme';

type FloatingNoticeProps = {
  children: ReactNode;
  // Read aloud by screen readers when it changes
  announcement?: string;
};

// Holds a notice at the top, centred under the status bar, above screens.
export function FloatingNotice({ children, announcement }: FloatingNoticeProps) {
  const { spacing, sizes } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();

  useEffect(() => {
    // Android reads the live region itself, so only iOS is told.
    if (announcement && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [announcement]);

  return (
    <View
      testID="floating-notice"
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: noticeLayout(insets.top, fontScale).top,
        left: 0,
        right: 0,
        // A long notice never touches the screen edges
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        zIndex: 10,
        elevation: 10,
      }}
    >
      <View testID="floating-notice-content" pointerEvents="box-none" style={{ maxWidth: sizes.contentMaxWidth, alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
}
