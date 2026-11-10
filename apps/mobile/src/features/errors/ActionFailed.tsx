import { Text } from '@scaleway-manager/ui';
import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export const ACTION_FAILED = 'Something went wrong. Try again.';

// One muted line under an action that failed. Screen readers hear it when it appears.
// A task's own words replace the usual ones (`message`).
export function ActionFailed({ message = ACTION_FAILED }: { message?: string }) {
  // Android reads the live region itself, so only iOS is told.
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message]);

  return (
    <Text variant="subhead" tone="muted" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}
