import { useEffect, useRef } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { accessibilityTextScale } from '../tokens';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Stack } from './Stack';
import { Text } from './Text';
import { NoEdgeEffects } from './NoEdgeEffects';

// Whether a sheet shows. The app builds it with its lock-aware hook (`useSheetVisible(open)`):
// a sheet is its own window above the app, so it must hide itself while the lock screen covers the app.
export type SheetVisibility = {
  // The screen wants the sheet open
  open: boolean;
  // The lock screen covers the app (locked, or still deciding at launch)
  lockCovers: boolean;
};

// A question asked from a sheet, shown as its second step (iOS can't show a sheet above a sheet)
export type SheetConfirm = {
  // Names the resource: "Delete web-prod-1?"
  title: string;
  message: string;
  // The action's verb: "Delete"
  confirmLabel: string;
  // While the action runs: a spinner, and nothing can be pressed or close the sheet
  busy?: boolean;
  // The verb is off, and these words say why under the buttons ("You're offline"); Cancel still works
  disabledReason?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

type SheetProps = {
  visible: SheetVisibility;
  title: string;
  onClose: () => void;
  children: ReactNode;
  confirm?: SheetConfirm | null;
  // A swipe down doesn't close it by itself: it springs back and calls onClose, so the screen can ask first
  holdOpen?: boolean;
};

// Slides up over the screen (a page sheet on iOS), with its title and a close button.
export function Sheet({ visible, title, onClose, children, confirm, holdOpen = false }: SheetProps) {
  const { colors, spacing, sizes } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const heading = useRef<ComponentRef<typeof View>>(null);
  const shown = visible.open && !visible.lockCovers;
  const busy = confirm?.busy === true;
  // iOS: a swipe down only tries to close; the sheet stays and calls onRequestClose
  const swipeCloses = !busy && !holdOpen;
  const shownTitle = confirm ? confirm.title : title;
  const ios = Platform.OS === 'ios';
  // At accessibility text sizes the confirmation's buttons stack, primary first, so no label breaks mid-word
  const stacked = fontScale > accessibilityTextScale;

  // A new step (the confirmation, or back): screen readers go to its title
  useEffect(() => {
    if (shown && heading.current) {
      AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
    }
  }, [shown, shownTitle]);

  const content = (
    <View
      testID="sheet-content"
      accessibilityViewIsModal
      style={{
        flex: 1,
        backgroundColor: colors.background,
        // iOS: the page sheet starts below the status bar; Android: the sheet starts under it
        paddingTop: ios ? spacing.md : insets.top + spacing.xs,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: sizes.contentMaxWidth,
          alignSelf: 'center',
          minHeight: sizes.touchMin,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
        }}
      >
        <View
          ref={heading}
          testID="sheet-title"
          accessible
          accessibilityRole="header"
          accessibilityLabel={shownTitle}
          style={{ flex: 1 }}
        >
          <Text variant="title">{shownTitle}</Text>
        </View>

        <IconButton icon="close" label="Close" edge="end" disabled={busy} onPress={onClose} />
      </View>

      <NoEdgeEffects style={{ flexGrow: 1, flexShrink: 1 }}>
        <ScrollView
          testID="sheet-scroll"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            // At least the sheet's height, so a confirmation's buttons can sit at its bottom
            flexGrow: 1,
            width: '100%',
            maxWidth: sizes.contentMaxWidth,
            alignSelf: 'center',
            padding: spacing.md,
            // Room for the home indicator (iOS) or the navigation bar (Android 15+ draws every window under it)
            paddingBottom: insets.bottom + spacing.md,
          }}
        >
          {confirm ? (
            // The message at the top, the buttons at the bottom. A long message scrolls, the buttons after it
            <View testID="sheet-confirm" style={{ flexGrow: 1 }}>
              <Text variant="body">{confirm.message}</Text>

              <View testID="sheet-confirm-spacer" style={{ flexGrow: 1, minHeight: spacing.lg }} />

              <Stack gap="xs">
                {stacked ? (
                  <Stack gap="xs">
                    <Button
                      label={confirm.confirmLabel}
                      size="md"
                      loading={busy}
                      disabled={confirm.disabledReason !== undefined}
                      onPress={confirm.onConfirm}
                    />

                    <Button label="Cancel" size="md" variant="secondary" disabled={busy} onPress={confirm.onCancel} />
                  </Stack>
                ) : (
                  <Stack direction="row" gap="xs">
                    <Button label="Cancel" size="md" variant="secondary" fill disabled={busy} onPress={confirm.onCancel} />

                    <Button
                      label={confirm.confirmLabel}
                      size="md"
                      fill
                      loading={busy}
                      disabled={confirm.disabledReason !== undefined}
                      onPress={confirm.onConfirm}
                    />
                  </Stack>
                )}

                {confirm.disabledReason === undefined ? null : (
                  <Text variant="caption" tone="muted" align="center">
                    {confirm.disabledReason}
                  </Text>
                )}
              </Stack>
            </View>
          ) : null}

          <View style={{ display: confirm ? 'none' : 'flex' }}>{children}</View>
        </ScrollView>
      </NoEdgeEffects>
    </View>
  );

  // Hidden for the lock, it goes at once: nothing slides down over the lock screen.
  // During a confirmation the first step stays mounted (its state is kept), out of sight.
  // Android: the window is asked to fit the system bars, so it shrinks above the keyboard; if the phone still
  // draws it under the keyboard (Android 15+), the keyboard-avoiding view makes room. iOS moves the content itself.
  return (
    <Modal
      testID="sheet"
      visible={shown}
      presentationStyle="pageSheet"
      animationType={visible.lockCovers ? 'none' : reduceMotion ? 'fade' : 'slide'}
      backdropColor={colors.background}
      allowSwipeDismissal={swipeCloses}
      onRequestClose={() => {
        if (busy) {
          return;
        }

        // Android Back on the question goes back to the content. An iOS swipe has already closed the sheet, unless
        // `holdOpen` kept it (then the screen's onClose decides: it may ask first)
        if (confirm && !ios) {
          confirm.onCancel();

          return;
        }

        onClose();
      }}
      statusBarTranslucent
    >
      {ios ? (
        content
      ) : (
        <KeyboardAvoidingView testID="sheet-keyboard" behavior="padding" style={{ flex: 1 }}>
          {content}
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}
