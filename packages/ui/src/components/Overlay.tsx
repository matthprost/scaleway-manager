import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';

import { useTheme } from '../theme';

type OverlayProps = {
  visible: boolean;
  children: ReactNode;
  // true: dims the screen and centres the content (a prompt). false: the page colour; the content fills the screen (lock).
  dimmed?: boolean;
  // Read aloud by screen readers when it appears
  announcement?: string;
};

// Covers the whole screen, above everything, and blocks touches to what is behind.
export function Overlay({ visible, children, dimmed = true, announcement }: OverlayProps) {
  const { colors, spacing, sizes } = useTheme();

  useEffect(() => {
    // Android reads the live region itself, so only iOS is told.
    if (visible && announcement && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [visible, announcement]);

  if (!visible) {
    return null;
  }

  return (
    <View
      testID="overlay"
      accessibilityViewIsModal
      accessibilityLiveRegion={announcement ? 'polite' : undefined}
      onStartShouldSetResponder={() => true}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        elevation: 20,
        backgroundColor: dimmed ? colors.scrim : colors.background,
        justifyContent: dimmed ? 'center' : undefined,
        alignItems: dimmed ? 'center' : undefined,
        padding: dimmed ? spacing.lg : 0,
      }}
    >
      <View testID="overlay-content" style={dimmed ? { width: '100%', maxWidth: sizes.contentMaxWidth } : { flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
