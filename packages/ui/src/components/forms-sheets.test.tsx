import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Dimensions, Platform, StyleSheet } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { useReducedMotion, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { noticeLayout } from '../layout/noticeLayout';
import { tabBarLayout } from '../layout/tabBarLayout';
import { ThemeProvider } from '../theme';
import {
  accessibilityTextScale,
  contrastRatio,
  darkColors,
  lightColors,
  motion,
  radii,
  sizes,
  spacing,
  typography,
} from '../tokens';
import { ConfirmSheet } from './ConfirmSheet';
import { EmptyState } from './EmptyState';
import { HeaderBackground } from './HeaderBackground';
import { ListRow } from './ListRow';
import { Screen } from './Screen';
import { ScreenHeader } from './ScreenHeader';
import { SecretBox } from './SecretBox';
import { Sheet } from './Sheet';
import type { SheetVisibility } from './Sheet';
import { Text } from './Text';
import { TextField } from './TextField';
import { Toast } from './Toast';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
  withTiming: jest.fn(jest.requireActual('react-native-reanimated').withTiming),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const themes = [
  ['light', lightColors],
  ['dark', darkColors],
] as const;

function wrap(children: ReactNode, preference: 'light' | 'dark' = 'light') {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider preference={preference}>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

// A sheet the app wants open, while the lock doesn't cover the app
const OPEN: SheetVisibility = { open: true, lockCovers: false };

// A phone at a given text size
const withTextSize = (fontScale: number) =>
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 390, height: 844, scale: 3, fontScale });

// The flattened style of a rendered element
const style = (element: { props: { style?: unknown } }): TextStyle =>
  StyleSheet.flatten(element.props.style as StyleProp<TextStyle>) ?? {};

// The toast's animated pill, also while it is hidden from screen readers
const toast = () => screen.getByTestId('toast', { includeHiddenElements: true });

// How many icons in the tree are drawn in this colour
const strokes = (color: string) => JSON.stringify(screen.toJSON()).split(`"stroke":"${color}"`).length - 1;

function confirmSheet(overrides: Partial<Parameters<typeof ConfirmSheet>[0]> = {}) {
  return (
    <ConfirmSheet
      visible={OPEN}
      title="Delete web-prod-1?"
      message="Servers created after this won't accept this key."
      confirmLabel="Delete"
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
      {...overrides}
    />
  );
}

describe('forms and sheets', () => {
  beforeEach(() => {
    // React Native's test double keeps its calls from one test to the next
    jest.mocked(AccessibilityInfo.announceForAccessibility).mockClear();
    jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
    jest.mocked(withTiming).mockClear();
    Platform.OS = 'ios';
  });

  describe('Sheet', () => {
    it('is a page sheet that slides up, or fades with Reduce Motion', async () => {
      const sheet = () =>
        wrap(
          <Sheet visible={OPEN} title="Appearance" onClose={jest.fn()}>
            <Text variant="body">Follow phone</Text>
          </Sheet>,
        );
      const { rerender } = await render(sheet());

      expect(screen.getByTestId('sheet').props.presentationStyle).toBe('pageSheet');
      expect(screen.getByTestId('sheet').props.animationType).toBe('slide');

      jest.mocked(useReducedMotion).mockReturnValue(true);
      await rerender(sheet());

      expect(screen.getByTestId('sheet').props.animationType).toBe('fade');
    });

    it('has a title for screen readers and a labelled close button; a swipe down or Back closes it too', async () => {
      const onClose = jest.fn();
      await render(
        wrap(
          <Sheet visible={OPEN} title="Organization and project" onClose={onClose}>
            <Text variant="body">Production</Text>
          </Sheet>,
        ),
      );

      expect(screen.getByRole('header', { name: 'Organization and project' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Close' })).toHaveStyle({ width: sizes.touchMin, height: sizes.touchMin });

      await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('sheet').props.allowSwipeDismissal).toBe(true);

      // iOS: swiped down; Android: the Back button
      await fireEvent(screen.getByTestId('sheet'), 'requestClose');

      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('a sheet held open springs back from a swipe down and lets its screen decide (onClose), so it can ask first', async () => {
      const onClose = jest.fn();
      await render(
        wrap(
          <Sheet visible={OPEN} title="Copy your secret key now" onClose={onClose} holdOpen>
            <Text variant="body">A secret</Text>
          </Sheet>,
        ),
      );

      // iOS: the swipe only tries to close; the sheet stays and tells the screen
      expect(screen.getByTestId('sheet').props.allowSwipeDismissal).toBe(false);

      await fireEvent(screen.getByTestId('sheet'), 'requestClose');

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.getByText('A secret')).toBeOnTheScreen();
    });

    it('an open sheet hides when the app locks, and comes back once unlocked', async () => {
      const sheet = (lockCovers: boolean) =>
        wrap(
          <Sheet visible={{ open: true, lockCovers }} title="Copy your secret key now" onClose={jest.fn()}>
            <Text variant="body">secret-value</Text>
          </Sheet>,
        );
      const { rerender } = await render(sheet(false));

      expect(screen.getByText('secret-value')).toBeOnTheScreen();

      await rerender(sheet(true));

      expect(screen.queryByTestId('sheet')).not.toBeOnTheScreen();
      expect(screen.queryByText('secret-value')).not.toBeOnTheScreen();

      await rerender(sheet(false));

      expect(screen.getByText('secret-value')).toBeOnTheScreen();
    });

    it('draws nothing while the app wants it closed', async () => {
      await render(
        wrap(
          <Sheet visible={{ open: false, lockCovers: false }} title="Appearance" onClose={jest.fn()}>
            <Text variant="body">Follow phone</Text>
          </Sheet>,
        ),
      );

      expect(screen.queryByTestId('sheet')).not.toBeOnTheScreen();
    });

    it('a confirmation asked from a sheet is a second step inside the same sheet', async () => {
      const onCancel = jest.fn();
      const onConfirm = jest.fn();
      await render(
        wrap(
          <Sheet
            visible={OPEN}
            title="Organization and project"
            onClose={jest.fn()}
            confirm={{
              title: 'Log in again?',
              message: "You'll be signed out. Then log in on Scaleway's page and pick the organization you want.",
              confirmLabel: 'Log in again',
              onConfirm,
              onCancel,
            }}
          >
            <Text variant="body">Production</Text>
          </Sheet>,
        ),
      );

      // One sheet only: iOS can't show a sheet on top of a sheet
      expect(screen.getAllByTestId('sheet')).toHaveLength(1);
      expect(screen.getByRole('header', { name: 'Log in again?' })).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: 'Organization and project' })).not.toBeOnTheScreen();
      expect(screen.getByText("You'll be signed out. Then log in on Scaleway's page and pick the organization you want.")).toBeOnTheScreen();
      // The first step stays (keeping its state) but can't be seen or reached
      expect(screen.queryByText('Production')).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Log in again' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('moves screen readers to its title when it changes step, and keeps them inside the sheet', async () => {
      const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
      const sheet = (confirming: boolean) =>
        wrap(
          <Sheet
            visible={OPEN}
            title="web-prod-1"
            onClose={jest.fn()}
            confirm={
              confirming
                ? { title: 'Delete web-prod-1?', message: 'It goes away.', confirmLabel: 'Delete', onConfirm: jest.fn(), onCancel: jest.fn() }
                : null
            }
          >
            <Text variant="body">Details</Text>
          </Sheet>,
        );
      const { rerender } = await render(sheet(false));
      focus.mockClear();

      await rerender(sheet(true));

      expect(focus).toHaveBeenCalledTimes(1);
      expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus');
      expect(screen.getByTestId('sheet-content').props.accessibilityViewIsModal).toBe(true);
    });

    it('on iOS, a page sheet below the status bar that leaves room for the home indicator', async () => {
      await render(
        wrap(
          <Sheet visible={OPEN} title="Add SSH key" onClose={jest.fn()}>
            <Text variant="body">Form</Text>
          </Sheet>,
        ),
      );

      expect(screen.getByTestId('sheet-content')).toHaveStyle({ paddingTop: spacing.md });
      expect(style({ props: { style: screen.getByTestId('sheet-scroll').props.contentContainerStyle } }).paddingBottom).toBe(
        metrics.insets.bottom + spacing.md,
      );
      // iOS moves the content above the keyboard itself
      expect(screen.getByTestId('sheet-scroll').props.automaticallyAdjustKeyboardInsets).toBe(true);
      expect(screen.queryByTestId('sheet-keyboard')).not.toBeOnTheScreen();
    });

    it('on Android, fills the screen under the status bar but keeps the navigation bar, so the keyboard never covers it', async () => {
      Platform.OS = 'android';
      await render(
        wrap(
          <Sheet visible={OPEN} title="Add SSH key" onClose={jest.fn()}>
            <Text variant="body">Form</Text>
          </Sheet>,
        ),
      );

      expect(screen.getByTestId('sheet').props.statusBarTranslucent).toBe(true);
      // An edge-to-edge window wouldn't shrink above the keyboard
      expect(screen.getByTestId('sheet').props.navigationBarTranslucent).toBeUndefined();
      expect(screen.getByTestId('sheet-content')).toHaveStyle({ paddingTop: metrics.insets.top + spacing.xs });
      // Room for the navigation bar (Android 15+ draws every window under it), keyboard up or down
      expect(style({ props: { style: screen.getByTestId('sheet-scroll').props.contentContainerStyle } }).paddingBottom).toBe(
        metrics.insets.bottom + spacing.md,
      );
      // And if Android still draws it under the keyboard, the sheet makes room for it
      expect(screen.getByTestId('sheet-keyboard')).toBeOnTheScreen();
    });

    it('Back on Android leaves the question for the content; an iOS swipe closes the whole sheet', async () => {
      const sheet = () => {
        const onClose = jest.fn();
        const onCancel = jest.fn();

        return {
          onClose,
          onCancel,
          element: wrap(
            <Sheet
              visible={OPEN}
              title="web-prod-key"
              onClose={onClose}
              confirm={{ title: 'Delete web-prod-key?', message: 'Gone.', confirmLabel: 'Delete', onConfirm: jest.fn(), onCancel }}
            >
              <Text variant="body">Details</Text>
            </Sheet>,
          ),
        };
      };

      Platform.OS = 'android';
      const android = sheet();
      const { unmount } = await render(android.element);
      await fireEvent(screen.getByTestId('sheet'), 'requestClose');

      expect(android.onCancel).toHaveBeenCalledTimes(1);
      expect(android.onClose).not.toHaveBeenCalled();

      await unmount();
      Platform.OS = 'ios';
      const ios = sheet();
      await render(ios.element);
      await fireEvent(screen.getByTestId('sheet'), 'requestClose');

      expect(ios.onClose).toHaveBeenCalledTimes(1);
      expect(ios.onCancel).not.toHaveBeenCalled();
    });

    it("its Close button sits on the content's edge, still 44 pt to tap", async () => {
      await render(
        wrap(
          <Sheet visible={OPEN} title="Appearance" onClose={jest.fn()}>
            <Text variant="body">Follow phone</Text>
          </Sheet>,
        ),
      );

      expect(screen.getByRole('button', { name: 'Close' })).toHaveStyle({
        width: sizes.touchMin,
        height: sizes.touchMin,
        alignItems: 'flex-end',
      });
    });

    it('uses the page colour in light and dark', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(
          wrap(
            <Sheet visible={OPEN} title="Appearance" onClose={jest.fn()}>
              <Text variant="body">Follow phone</Text>
            </Sheet>,
            preference,
          ),
        );

        expect(screen.getByTestId('sheet').props.backdropColor).toBe(colors.background);
        expect(screen.getByTestId('sheet-content')).toHaveStyle({ backgroundColor: colors.background });

        await unmount();
      }
    });
  });

  describe('ConfirmSheet', () => {
    it('ConfirmSheet buttons share the same height', async () => {
      withTextSize(1);
      await render(wrap(confirmSheet()));
      const cancel = screen.getByRole('button', { name: 'Cancel' });
      const confirm = screen.getByRole('button', { name: 'Delete' });
      const row = style(cancel.parent as never);

      expect(screen.getByRole('header', { name: 'Delete web-prod-1?' })).toBeOnTheScreen();
      // Side by side, Cancel first, in a row with no align: it stretches both to the taller one
      expect(row.flexDirection).toBe('row');
      expect(row.alignItems).toBeUndefined();
      expect(confirm.parent).toBe(cancel.parent);
      // Both size md: the same 48 pt pill (a minimum, so both grow together at large text sizes)
      expect(within(cancel).getByTestId('button-pill')).toHaveStyle({ minHeight: sizes.buttonMd, flexGrow: 1 });
      expect(within(confirm).getByTestId('button-pill')).toHaveStyle({ minHeight: sizes.buttonMd, flexGrow: 1 });
      // They share the row equally, so they end on the content's edge
      expect(cancel).toHaveStyle({ flex: 1 });
      expect(confirm).toHaveStyle({ flex: 1 });
    });

    it('ConfirmSheet keeps its question at the top and its buttons at the bottom, clear of the home indicator', async () => {
      withTextSize(1);
      await render(wrap(confirmSheet()));
      const body = screen.getByTestId('sheet-confirm');
      const [message, spacer, actions] = body.children as (typeof body)[];
      const cancel = screen.getByRole('button', { name: 'Cancel' });
      const confirm = screen.getByRole('button', { name: 'Delete' });

      // The scroll's content is at least as tall as the sheet, and the question fills it
      expect(style({ props: { style: screen.getByTestId('sheet-scroll').props.contentContainerStyle } })).toMatchObject({
        flexGrow: 1,
        paddingBottom: metrics.insets.bottom + spacing.md,
      });
      expect(body).toHaveStyle({ flexGrow: 1 });
      // The message, then a spacer that takes the free room, then the buttons
      expect(body.children).toHaveLength(3);
      expect(message).toHaveTextContent('Servers created after this won\'t accept this key.');
      expect(spacer).toBe(screen.getByTestId('sheet-confirm-spacer'));
      expect(spacer).toHaveStyle({ flexGrow: 1, minHeight: spacing.lg });
      // Still one row, Cancel then the verb, laid out in the flow (nothing floats over the message)
      expect(within(actions as never).getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
        'Cancel',
        'Delete',
      ]);
      expect(style(cancel.parent as never)).toMatchObject({ flexDirection: 'row' });
      expect(confirm.parent).toBe(cancel.parent);
      expect(style(actions as never).position).toBeUndefined();
    });

    it('ConfirmSheet with a long message: it scrolls, and the buttons follow it, never over it', async () => {
      // The largest text size, and a message far taller than the sheet
      withTextSize(3.1);
      const message = 'It will be unavailable for a minute or two, and every request sent to it meanwhile fails. '.repeat(12).trim();
      await render(wrap(confirmSheet({ message })));
      const scroll = screen.getByTestId('sheet-scroll');
      const body = screen.getByTestId('sheet-confirm');

      // The message is never cut, and everything sits inside the scroll, in order
      expect(screen.getByText(message).props.numberOfLines).toBeUndefined();
      expect(within(scroll).getByTestId('sheet-confirm')).toBe(body);
      expect(within(body).getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
        'Delete',
        'Cancel',
      ]);
      expect((body.children as (typeof body)[]).at(-1)).toBe(screen.getByRole('button', { name: 'Delete' }).parent?.parent);
      // No free room left: the spacer keeps its minimum, so the buttons come 20 pt after the message
      expect(screen.getByTestId('sheet-confirm-spacer')).toHaveStyle({ minHeight: spacing.lg });
    });

    it('ConfirmSheet stacks its buttons at accessibility text sizes, primary first', async () => {
      // iOS's largest normal size (xxxLarge) is 1.353 in React Native, Android's largest normal 130%
      for (const normal of [1.3, 1.353]) {
        withTextSize(normal);
        const { unmount } = await render(wrap(confirmSheet()));

        expect(style(screen.getByRole('button', { name: 'Cancel' }).parent as never).flexDirection).toBe('row');

        await unmount();
      }

      // iOS's first accessibility size (AX1) is 1.786, Android's 150%
      for (const accessibility of [1.5, 1.786]) {
        withTextSize(accessibility);
        const { unmount } = await render(wrap(confirmSheet()));
        const buttons = screen.getAllByRole('button').filter((button) => button.props.accessibilityLabel !== 'Close');

        expect(buttons.map((button) => button.props.accessibilityLabel)).toEqual(['Delete', 'Cancel']);
        expect(style(buttons[0]?.parent as never).flexDirection).toBe('column');
        // Stacked, each already fills the width: no flex, which would stretch it in height
        expect(style(buttons[0] as never).flex).toBeUndefined();

        await unmount();
      }

      expect(accessibilityTextScale).toBeGreaterThan(1.353);
      expect(accessibilityTextScale).toBeLessThan(1.5);
    });

    it('ConfirmSheet disables both buttons while busy', async () => {
      // Side by side, and stacked at an accessibility text size
      for (const fontScale of [1, accessibilityTextScale + 0.3]) {
        withTextSize(fontScale);
        const onConfirm = jest.fn();
        const onCancel = jest.fn();
        const { unmount } = await render(wrap(confirmSheet({ busy: true, onConfirm, onCancel })));
        const confirm = screen.getByRole('button', { name: 'Delete' });
        const cancel = screen.getByRole('button', { name: 'Cancel' });

        expect(confirm.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
        expect(within(confirm).getByTestId('button-spinner')).toBeOnTheScreen();
        expect(cancel.props.accessibilityState).toMatchObject({ disabled: true });
        // Nothing closes it while the action runs: no Close, no swipe, no Back
        expect(screen.getByRole('button', { name: 'Close' }).props.accessibilityState).toMatchObject({ disabled: true });
        expect(screen.getByTestId('sheet').props.allowSwipeDismissal).toBe(false);

        await fireEvent.press(confirm);
        await fireEvent.press(cancel);
        await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
        await fireEvent(screen.getByTestId('sheet'), 'requestClose');

        expect(onConfirm).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();

        await unmount();
      }
    });

    it('ConfirmSheet turns its verb off and says why under the buttons (offline)', async () => {
      // Side by side, and stacked at an accessibility text size
      for (const fontScale of [1, accessibilityTextScale + 0.3]) {
        withTextSize(fontScale);
        const onConfirm = jest.fn();
        const onCancel = jest.fn();
        const { unmount } = await render(
          wrap(confirmSheet({ disabledReason: "You're offline", onConfirm, onCancel })),
        );
        const confirm = screen.getByRole('button', { name: 'Delete' });

        expect(confirm).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
        // Once, centred, after the buttons
        const caption = screen.getByText("You're offline");
        expect(caption).toHaveStyle({ textAlign: 'center' });
        expect(caption.parent).toBe(confirm.parent?.parent);

        await fireEvent.press(confirm);
        await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

        expect(onConfirm).not.toHaveBeenCalled();
        expect(onCancel).toHaveBeenCalled();

        await unmount();
      }
    });

    it('ConfirmSheet hides while the lock covers the app', async () => {
      await render(wrap(confirmSheet({ visible: { open: true, lockCovers: true } })));

      expect(screen.queryByText('Delete web-prod-1?')).not.toBeOnTheScreen();
    });
  });

  describe('TextField', () => {
    it('TextField shows its error', async () => {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      const field = (error?: string) =>
        wrap(<TextField label="Public key" value="hello" onChangeText={jest.fn()} error={error} />);
      const { rerender } = await render(field());

      expect(announce).not.toHaveBeenCalled();

      await rerender(field('Paste your public key.'));

      // Below the field, in the danger tone, and read out when it appears
      expect(screen.getByText('Paste your public key.')).toHaveStyle({ color: lightColors.alertText });
      expect(screen.getByText('Paste your public key.').props.accessibilityLiveRegion).toBe('polite');
      expect(announce).toHaveBeenCalledWith('Paste your public key.');
      expect(screen.getByTestId('text-field-box')).toHaveStyle({ borderColor: lightColors.alertText });
      // Heard again whenever someone comes back to the field
      expect(screen.getByLabelText('Public key').props.accessibilityHint).toBe('Paste your public key.');
    });

    it('TextField on Android: its live region reads the error (no second announcement), and no underline', async () => {
      Platform.OS = 'android';
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      await render(wrap(<TextField label="Public key" value="" onChangeText={jest.fn()} error="Paste your public key." />));

      expect(screen.getByText('Paste your public key.').props.accessibilityLiveRegion).toBe('polite');
      expect(announce).not.toHaveBeenCalled();
      // Android's own text field underline would show inside the box
      expect(screen.getByLabelText('Public key').props.underlineColorAndroid).toBe('transparent');
    });

    it('TextField can be disabled while a form is sent', async () => {
      await render(wrap(<TextField label="Name" value="My laptop" onChangeText={jest.fn()} disabled />));
      const input = screen.getByLabelText('Name');

      expect(input.props.editable).toBe(false);
      expect(input.props.accessibilityState).toMatchObject({ disabled: true });
      expect(screen.getByTestId('text-field')).toHaveStyle({ opacity: 0.5 });
    });

    it('TextField puts its label above the field and names the field with it', async () => {
      const onChangeText = jest.fn();
      await render(wrap(<TextField label="Name" value="" placeholder="My laptop" onChangeText={onChangeText} maxLength={64} />));
      const input = screen.getByLabelText('Name');

      // Shown above the field; screen readers hear it as the field's name instead, once
      expect(screen.getByText('Name', { includeHiddenElements: true })).toHaveStyle({ color: lightColors.textMuted });
      expect(screen.queryByText('Name')).not.toBeOnTheScreen();
      expect(input.props.placeholder).toBe('My laptop');
      expect(input.props.placeholderTextColor).toBe(lightColors.textMuted);
      expect(input.props.autoCapitalize).toBe('sentences');
      expect(input.props.maxLength).toBe(64);
      expect(input.props.multiline).toBe(false);

      await fireEvent.changeText(input, 'Work laptop');

      expect(onChangeText).toHaveBeenCalledWith('Work laptop');
    });

    it('TextField monospace and multiline: a taller box in the monospace font, without autocorrect', async () => {
      const { fontScale } = Dimensions.get('window');
      await render(
        wrap(
          <TextField label="Public key" value="" onChangeText={jest.fn()} multiline monospace autoCapitalize="none" />,
        ),
      );
      const input = screen.getByLabelText('Public key');

      // Four lines of text, grown with the text size, plus its padding
      expect(input).toHaveStyle({
        fontFamily: 'Menlo',
        minHeight: 4 * typography.body.lineHeight * fontScale + 2 * spacing.sm,
      });
      expect(input.props.multiline).toBe(true);
      expect(input.props.autoCorrect).toBe(false);
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('TextField tells the form when the person leaves it, so its check can wait until then', async () => {
      const onBlur = jest.fn();
      await render(wrap(<TextField label="Public key" value="" onChangeText={jest.fn()} onBlur={onBlur} />));

      await fireEvent(screen.getByLabelText('Public key'), 'focus');

      expect(onBlur).not.toHaveBeenCalled();
      expect(screen.getByTestId('text-field-box')).toHaveStyle({ borderColor: lightColors.brand });

      await fireEvent(screen.getByLabelText('Public key'), 'blur');

      expect(onBlur).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('text-field-box')).toHaveStyle({ borderColor: lightColors.fieldBorder });
    });

    it('TextField shows a brand border while focused, in light and dark', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(wrap(<TextField label="Name" value="" onChangeText={jest.fn()} />, preference));

        // At rest its border shows where to type: at least 3:1 against the field and the page around it
        expect(screen.getByTestId('text-field-box')).toHaveStyle({ backgroundColor: colors.surface, borderColor: colors.fieldBorder });
        expect(contrastRatio(colors.fieldBorder, colors.surface)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(colors.fieldBorder, colors.background)).toBeGreaterThanOrEqual(3);

        await fireEvent(screen.getByLabelText('Name'), 'focus');

        expect(screen.getByTestId('text-field-box')).toHaveStyle({ borderColor: colors.brand });
        expect(contrastRatio(colors.brand, colors.surface)).toBeGreaterThanOrEqual(3);

        await unmount();
      }
    });
  });

  describe('ListRow, for values, choices and work in progress', () => {
    it('ListRow copy button is labelled', async () => {
      let copied = () => {};
      const onCopy = jest.fn(() => new Promise<void>((resolve) => (copied = resolve)));
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      const row = (text: string) => wrap(<ListRow title="Fingerprint" trailing={{ type: 'text', text, onCopy }} />);
      const { rerender } = await render(row('SHA256:abc123'));
      const copy = screen.getByRole('button', { name: 'Copy Fingerprint' });

      // The value is one phrase, in the monospace font; the copy button is its own control, 44 pt to tap,
      // its icon on the row's end edge like a chevron
      expect(screen.getByLabelText('Fingerprint, SHA256:abc123')).toBeOnTheScreen();
      expect(screen.getByText('SHA256:abc123')).toHaveStyle({ fontFamily: 'Menlo' });
      expect(copy).toHaveStyle({ width: sizes.touchMin, height: sizes.touchMin, alignItems: 'flex-end' });
      expect(strokes(lightColors.brand)).toBe(1);

      await fireEvent.press(copy);

      // Not a secret. Nothing is said before the clipboard has it
      expect(onCopy).toHaveBeenCalledWith('SHA256:abc123', { sensitive: false });
      expect(announce).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Copy Fingerprint' })).toBeOnTheScreen();

      copied();

      // Confirmed in place (no toast can show above a sheet)
      expect(await screen.findByRole('button', { name: 'Copied Fingerprint' })).toBeOnTheScreen();
      expect(announce).toHaveBeenCalledWith('Copied');

      // Another value: nothing copied yet
      await rerender(row('SHA256:def456'));

      expect(screen.getByRole('button', { name: 'Copy Fingerprint' })).toBeOnTheScreen();
    });

    it('rows that share a title name their copy buttons apart with copyLabel', async () => {
      const onCopy = jest.fn(async () => {});
      await render(
        wrap(
          <>
            {['51.15.12.34', '51.15.12.35'].map((ip) => (
              <ListRow
                key={ip}
                title="Public IPv4"
                trailing={{ type: 'text', text: ip, onCopy, copyLabel: `Public IPv4 ${ip}` }}
              />
            ))}
          </>,
        ),
      );

      // The row still reads as its title and value; the button starts with the visible words
      expect(screen.getByLabelText('Public IPv4, 51.15.12.35')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Copy Public IPv4 51.15.12.35' }));

      expect(onCopy).toHaveBeenCalledWith('51.15.12.35', { sensitive: false });
      expect(await screen.findByRole('button', { name: 'Copied Public IPv4 51.15.12.35' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Copy Public IPv4 51.15.12.34' })).toBeOnTheScreen();
    });

    it('a copy that fails leaves the button saying Copy, and says nothing', async () => {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      const onCopy = jest.fn(() => Promise.reject(new Error('clipboard')));
      await render(
        wrap(
          <>
            <ListRow title="Fingerprint" trailing={{ type: 'text', text: 'SHA256:abc123', onCopy }} />

            <SecretBox label="Secret key" value="secret-value" onCopy={onCopy} />
          </>,
        ),
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Copy Fingerprint' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Copy Secret key' }));
      // Let the rejected copies settle
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onCopy).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('button', { name: 'Copy Fingerprint' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Copy Secret key' })).toBeOnTheScreen();
      expect(announce).not.toHaveBeenCalled();
    });

    it("a disabled copy row disables its button, faded once (not twice)", async () => {
      const onCopy = jest.fn();
      await render(
        wrap(<ListRow title="Access key" trailing={{ type: 'text', text: 'SCWXXXXXXXXXXXXXXXXX', onCopy }} disabled />),
      );
      const copy = screen.getByRole('button', { name: 'Copy Access key' });
      await fireEvent.press(copy);

      expect(copy.props.accessibilityState).toMatchObject({ disabled: true });
      expect(copy).toHaveStyle({ opacity: 0.5 });
      expect(screen.getByLabelText('Access key, SCWXXXXXXXXXXXXXXXXX')).toHaveStyle({ opacity: 0.5 });
      expect(style(copy.parent as never).opacity).toBeUndefined();
      expect(onCopy).not.toHaveBeenCalled();
    });

    it('a choice row without onPress still shows and says which one is picked', async () => {
      await render(wrap(<ListRow title="Dark" trailing={{ type: 'check', selected: true }} />));

      expect(screen.getByLabelText('Dark').props.accessibilityState).toMatchObject({ selected: true });
      expect(strokes(lightColors.brand)).toBe(1);
    });

    it('ListRow check marks the selected option', async () => {
      const onPress = jest.fn();
      await render(
        wrap(
          <>
            <ListRow title="Production" trailing={{ type: 'check', selected: true }} onPress={jest.fn()} />

            <ListRow title="Staging" subtitle="Tests and previews" trailing={{ type: 'check', selected: false }} onPress={onPress} />
          </>,
        ),
      );

      expect(screen.getByRole('button', { name: 'Production' }).props.accessibilityState).toMatchObject({ selected: true });
      expect(screen.getByRole('button', { name: 'Staging, Tests and previews' }).props.accessibilityState).toMatchObject({
        selected: false,
      });
      // One mark, in brand, on the picked row only
      expect(strokes(lightColors.brand)).toBe(1);

      await fireEvent.press(screen.getByRole('button', { name: 'Staging, Tests and previews' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('ListRow loading shows a spinner instead of its trailing item and ignores presses', async () => {
      const onPress = jest.fn();
      await render(
        wrap(<ListRow title="November 2026" trailing={{ type: 'text', text: '€84.60' }} onPress={onPress} loading />),
      );
      const row = screen.getByRole('button', { name: 'November 2026, €84.60' });

      expect(within(row).getByTestId('row-spinner').props.color).toBe(lightColors.textMuted);
      expect(within(row).queryByText('€84.60')).not.toBeOnTheScreen();
      expect(row.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
      // Busy, not unavailable: it keeps its full colour
      expect(row).toHaveStyle({ opacity: 1 });

      await fireEvent.press(row);

      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('SecretBox', () => {
    it('SecretBox copies its value as a secret and says Copied', async () => {
      let copied = () => {};
      const onCopy = jest.fn(() => new Promise<void>((resolve) => (copied = resolve)));
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      await render(wrap(<SecretBox label="Secret key" value="11111111-2222-3333-4444-555555555555" onCopy={onCopy} />));
      const copy = screen.getByRole('button', { name: 'Copy Secret key' });

      expect(screen.getByText('11111111-2222-3333-4444-555555555555')).toHaveStyle({ fontFamily: 'Menlo' });
      expect(screen.getByTestId('secret-box')).toHaveStyle({ backgroundColor: lightColors.highlightBackground });
      expect(within(copy).getByTestId('button-pill')).toHaveStyle({ minHeight: sizes.buttonSm });

      await fireEvent.press(copy);

      // The app passes this flag on to the clipboard, which hides a secret from Android's preview
      expect(onCopy).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555', { sensitive: true });
      expect(screen.queryByText('Copied')).not.toBeOnTheScreen();

      copied();

      expect(await screen.findByRole('button', { name: 'Copied Secret key' })).toBeOnTheScreen();
      expect(screen.getByText('Copied')).toBeOnTheScreen();
      expect(announce).toHaveBeenCalledWith('Copied');
    });

    it('SecretBox says Copy again for a new value', async () => {
      const box = (value: string) => wrap(<SecretBox label="Secret key" value={value} onCopy={jest.fn()} />);
      const { rerender } = await render(box('first-secret'));
      await fireEvent.press(screen.getByRole('button', { name: 'Copy Secret key' }));

      expect(await screen.findByText('Copied')).toBeOnTheScreen();

      await rerender(box('second-secret'));

      expect(screen.getByRole('button', { name: 'Copy Secret key' })).toBeOnTheScreen();
    });

    it("SecretBox hidden shows dots in place of the secret and can't copy (the app switcher)", async () => {
      const onCopy = jest.fn();
      const box = (hidden: boolean) =>
        wrap(<SecretBox label="Secret key" value="11111111-2222-3333-4444-555555555555" onCopy={onCopy} hidden={hidden} />);
      const { rerender } = await render(box(true));
      const copy = screen.getByRole('button', { name: 'Copy Secret key' });

      expect(screen.queryByText(/1111/)).not.toBeOnTheScreen();
      expect(within(screen.getByTestId('secret-box')).getByText('••••••••••••••••')).toBeOnTheScreen();
      expect(copy).toBeDisabled();

      await fireEvent.press(copy);

      expect(onCopy).not.toHaveBeenCalled();

      await rerender(box(false));

      expect(screen.getByText('11111111-2222-3333-4444-555555555555')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Copy Secret key' })).toBeEnabled();
    });

    it("SecretBox never reads the secret aloud: screen readers hear it's hidden, and to use Copy", async () => {
      const box = (hidden: boolean) =>
        wrap(<SecretBox label="Secret key" value="11111111-2222-3333-4444-555555555555" onCopy={jest.fn()} hidden={hidden} />);
      const { rerender } = await render(box(false));

      // One element, named without the value: the characters inside are never read one by one
      expect(screen.getByTestId('secret-box').props.accessible).toBe(true);
      expect(screen.getByLabelText('Hidden. Use Copy to paste it.')).toBe(screen.getByTestId('secret-box'));
      expect(screen.queryByLabelText(/1111/)).not.toBeOnTheScreen();

      await rerender(box(true));

      // Dots aren't read out either
      expect(screen.getByLabelText('Hidden')).toBe(screen.getByTestId('secret-box'));
    });

    it('SecretBox text is readable on its highlight, in light and dark', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(
          wrap(<SecretBox label="Access key" value="SCWABCDEFGHIJKLMNOPQ" onCopy={jest.fn()} />, preference),
        );

        expect(screen.getByText('SCWABCDEFGHIJKLMNOPQ')).toHaveStyle({ color: colors.text });
        expect(screen.getByTestId('secret-box')).toHaveStyle({ backgroundColor: colors.highlightBackground });
        expect(contrastRatio(colors.text, colors.highlightBackground)).toBeGreaterThanOrEqual(4.5);

        await unmount();
      }
    });
  });

  describe('Toast', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('Toast is hidden when not visible', async () => {
      await render(wrap(<Toast message="SSH key added" visible={false} />));

      // Out of sight and out of reach of screen readers
      expect(screen.queryByText('SSH key added')).not.toBeOnTheScreen();
      expect(toast()).toHaveAnimatedStyle({ opacity: 0 });
    });

    it('Toast fades and rises in above the tab bar, is announced, then fades out', async () => {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      const sample = (visible: boolean) => wrap(<Toast message="SSH key added" visible={visible} />);
      const { rerender } = await render(sample(false));

      expect(screen.getByTestId('toast-holder')).toHaveStyle({
        position: 'absolute',
        bottom: tabBarLayout(metrics.insets.bottom).clearance,
      });
      expect(screen.getByTestId('toast-holder').props.pointerEvents).toBe('none');
      expect(toast()).toHaveAnimatedStyle({ transform: [{ translateY: motion.distance.toastRise }] });

      await rerender(sample(true));
      await jest.advanceTimersByTimeAsync(motion.duration.base + 50);

      expect(screen.getByText('SSH key added')).toBeOnTheScreen();
      expect(toast()).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
      expect(announce).toHaveBeenCalledWith('SSH key added');

      await rerender(sample(false));
      await jest.advanceTimersByTimeAsync(motion.duration.base + 50);

      expect(toast()).toHaveAnimatedStyle({ opacity: 0 });
      expect(screen.queryByText('SSH key added')).not.toBeOnTheScreen();
    });

    it('Toast is read out on Android too, also the same message twice in a row', async () => {
      Platform.OS = 'android';
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      const sample = (visible: boolean) => wrap(<Toast message="SSH key added" visible={visible} />);
      const { rerender } = await render(sample(false));
      await rerender(sample(true));
      await rerender(sample(false));
      await rerender(sample(true));

      // Android only re-reads a live region when its words change, so the toast is announced instead
      expect(announce.mock.calls).toEqual([['SSH key added'], ['SSH key added']]);
      expect(toast().props.accessibilityLiveRegion).toBeUndefined();
    });

    it('Toast with Reduce Motion is a plain fade of at most 250 ms', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      const { rerender } = await render(wrap(<Toast message="Copied" visible={false} />));
      await rerender(wrap(<Toast message="Copied" visible />));
      await jest.advanceTimersByTimeAsync(20);

      // No rise: it fades where it stands
      expect(toast()).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });

      await jest.advanceTimersByTimeAsync(motion.duration.base);

      expect(toast()).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });

      for (const [, config] of jest.mocked(withTiming).mock.calls) {
        expect(config?.duration ?? 0).toBeLessThanOrEqual(motion.duration.base);
      }
    });
  });

  describe('ScreenHeader', () => {
    it('ScreenHeader back button is labelled', async () => {
      const onBack = jest.fn();
      await render(wrap(<ScreenHeader title="SSH keys" onBack={onBack} />));
      const back = screen.getByRole('button', { name: 'Back' });

      // The chevron sits on the content's start edge; its touch box is still 44 × 44
      expect(back).toHaveStyle({ width: sizes.touchMin, height: sizes.touchMin, alignItems: 'flex-start' });
      expect(screen.getByRole('header', { name: 'SSH keys' })).toHaveStyle({ fontSize: typography.title.fontSize });

      await fireEvent.press(back);

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('ScreenHeader action is a labelled icon button that can be disabled; no back without onBack', async () => {
      const onPress = jest.fn();
      const header = (disabled: boolean) =>
        wrap(<ScreenHeader title="API keys" action={{ icon: 'plus', label: 'Create API key', onPress, disabled }} />);
      const { rerender } = await render(header(false));

      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
      // Its icon sits on the content's end edge
      expect(screen.getByRole('button', { name: 'Create API key' })).toHaveStyle({ alignItems: 'flex-end' });

      await fireEvent.press(screen.getByRole('button', { name: 'Create API key' }));

      expect(onPress).toHaveBeenCalledTimes(1);

      await rerender(header(true));
      const action = screen.getByRole('button', { name: 'Create API key' });
      await fireEvent.press(action);

      expect(action.props.accessibilityState).toMatchObject({ disabled: true });
      expect(action).toHaveStyle({ opacity: 0.5 });
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('ScreenHeader, wrapped', () => {
    it('ScreenHeader keeps Back and the action next to the first line of a long title', async () => {
      for (const fontScale of [1, 3]) {
        withTextSize(fontScale);
        const { unmount } = await render(wrap(<ScreenHeader title="Organization and project settings" onBack={jest.fn()} />));

        // No gap: the chevron's box already leaves room before the title
        expect(screen.getByTestId('screen-header')).toHaveStyle({ alignItems: 'flex-start', gap: 0 });
        // The first line is centred on the 44 pt buttons, until the line itself is taller
        expect(screen.getByTestId('screen-header-title')).toHaveStyle({
          paddingVertical: Math.max(0, (sizes.touchMin - typography.title.lineHeight * fontScale) / 2),
        });

        await unmount();
      }
    });
  });

  describe('Screen rows (a long list that scrolls with the screen)', () => {
    const SERVERS = ['web-1', 'web-2', 'web-3'];

    it('Screen rows look like a Section: the title above one card, a divider between rows', async () => {
      await render(
        wrap(
          <Screen
            topInset="belowNotice"
            rows={{
              title: 'Production',
              data: SERVERS,
              rowKey: (name) => name,
              renderRow: (name) => <ListRow title={name} />,
            }}
          >
            <Text variant="title">Instances</Text>
          </Screen>,
        ),
      );
      const pieces = screen.getAllByTestId('rows-card');

      expect(screen.getByText('Instances')).toBeOnTheScreen();
      // Read in its own case, shown in capitals, as a header
      expect(screen.getByRole('header', { name: 'Production' })).toHaveTextContent('PRODUCTION');
      expect(SERVERS.map((name) => screen.getByLabelText(name))).toHaveLength(3);
      expect(screen.getAllByTestId('section-divider')).toHaveLength(2);
      // One card in three pieces: rounded at its top and bottom, padded like a Card
      expect(pieces[0]).toHaveStyle({
        backgroundColor: lightColors.surface,
        borderTopLeftRadius: radii.lg,
        borderTopRightRadius: radii.lg,
        paddingTop: spacing.md,
        paddingHorizontal: spacing.md,
      });
      expect(pieces[1]).toHaveStyle({ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, paddingTop: 0 });
      expect(pieces[2]).toHaveStyle({ borderBottomLeftRadius: radii.lg, paddingBottom: spacing.md });
    });

    it('Screen rows with nothing in them draw no title and no card', async () => {
      await render(
        wrap(
          <Screen<string>
            rows={{ title: 'Production', data: [], rowKey: (name) => name, renderRow: (name) => <ListRow title={name} /> }}
          >
            <Text variant="title">Instances</Text>
          </Screen>,
        ),
      );

      expect(screen.getByText('Instances')).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: 'Production' })).not.toBeOnTheScreen();
      expect(screen.queryByTestId('rows-card')).not.toBeOnTheScreen();
      expect(screen.getByTestId('rows-top')).toHaveStyle({ paddingBottom: 0 });
    });

    it('Screen rows draw only the rows near the screen', async () => {
      const many = Array.from({ length: 300 }, (_, index) => `server-${index}`);
      await render(
        wrap(
          <Screen rows={{ data: many, rowKey: (name) => name, renderRow: (name) => <ListRow title={name} /> }}>
            <Text variant="title">Instances</Text>
          </Screen>,
        ),
      );
      const drawn = screen.getAllByLabelText(/^server-\d+$/).length;

      expect(screen.getByLabelText('server-0')).toBeOnTheScreen();
      expect(drawn).toBeLessThan(many.length);
    });

    it('Screen rows keep pull to refresh and the room for the pill and the tab bar', async () => {
      const onRefresh = jest.fn();
      const { fontScale } = Dimensions.get('window');
      await render(
        wrap(
          <Screen
            topInset="belowNotice"
            onRefresh={onRefresh}
            rows={{ data: SERVERS, rowKey: (name) => name, renderRow: (name) => <ListRow title={name} /> }}
          >
            <Text variant="title">Instances</Text>
          </Screen>,
        ),
      );
      const list = screen.getByTestId('screen-scroll');

      list.props.refreshControl.props.onRefresh();

      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(list.props.refreshControl.props.progressViewOffset).toBe(
        noticeLayout(metrics.insets.top, fontScale).clearance,
      );
      expect(screen.getByTestId('rows-top')).toHaveStyle({
        paddingTop: noticeLayout(metrics.insets.top, fontScale).clearance,
      });
      expect(screen.getByTestId('rows-bottom')).toHaveStyle({ height: tabBarLayout(metrics.insets.bottom).clearance });
    });

    it("Screen rows on a screen that doesn't scroll (a sample) don't scroll either", async () => {
      await render(
        wrap(
          <Screen
            scroll={false}
            rows={{ data: SERVERS, rowKey: (name) => name, renderRow: (name) => <ListRow title={name} /> }}
          >
            <Text variant="title">Instances</Text>
          </Screen>,
        ),
      );

      expect(screen.getByTestId('screen-scroll').props.scrollEnabled).toBe(false);
    });
  });

  describe('Screen additions', () => {
    it('Screen can be pulled to refresh', async () => {
      const onRefresh = jest.fn();
      await render(
        wrap(
          <Screen topInset="belowNotice" onRefresh={onRefresh} refreshing>
            <Text variant="body">Activity</Text>
          </Screen>,
        ),
      );
      const control = screen.getByTestId('screen-scroll').props.refreshControl;
      const { fontScale } = Dimensions.get('window');

      expect(control.props.refreshing).toBe(true);
      expect(control.props.tintColor).toBe(lightColors.brand);
      // Both platforms start it below the status bar and the offline pill
      expect(control.props.progressViewOffset).toBe(noticeLayout(metrics.insets.top, fontScale).clearance);

      control.props.onRefresh();

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('Screen pull to refresh without room for the pill starts just below the status bar', async () => {
      await render(
        wrap(
          <Screen withTabBar={false} onRefresh={jest.fn()}>
            <Text variant="body">Settings</Text>
          </Screen>,
        ),
      );

      expect(screen.getByTestId('screen-scroll').props.refreshControl.props.progressViewOffset).toBe(metrics.insets.top);
    });

    it('Screen pull to refresh on a purple header: a white spinner, below the offline pill', async () => {
      const { fontScale } = Dimensions.get('window');
      await render(
        wrap(
          <Screen topInset="none" padded={false} onRefresh={jest.fn()}>
            <HeaderBackground minHeight={290} insetTop />
          </Screen>,
        ),
      );
      const control = screen.getByTestId('screen-scroll').props.refreshControl;

      expect(control.props.refreshing).toBe(false);
      expect(control.props.tintColor).toBe(lightColors.onBrand);
      expect(control.props.progressViewOffset).toBe(noticeLayout(metrics.insets.top, fontScale).clearance);
      // Android's disc: a brand arrow on the card colour
      expect(control.props.colors).toEqual([lightColors.brand]);
      expect(control.props.progressBackgroundColor).toBe(lightColors.surface);
    });

    it('Screen says when its header leaves the status bar, so the status bar can follow', async () => {
      const onHeaderUnderStatusBar = jest.fn();
      await render(
        wrap(
          <Screen topInset="none" padded={false} onHeaderUnderStatusBar={onHeaderUnderStatusBar}>
            <HeaderBackground minHeight={290} insetTop />

            <Text variant="body">Cards</Text>
          </Screen>,
        ),
      );
      const scrollTo = (y: number) =>
        fireEvent.scroll(screen.getByTestId('screen-scroll'), { nativeEvent: { contentOffset: { x: 0, y } } });
      // The header's bottom edge crosses the middle of the status bar
      const edge = 290 - metrics.insets.top / 2;

      await fireEvent(screen.getByTestId('header-gradient'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 290 } },
      });
      await scrollTo(edge - 1);

      expect(onHeaderUnderStatusBar.mock.calls).toEqual([[true]]);

      await scrollTo(edge + 1);
      await scrollTo(edge + 200);

      expect(onHeaderUnderStatusBar.mock.calls).toEqual([[true], [false]]);

      // Pulled down past the top (iOS bounce): purple again
      await scrollTo(-40);

      expect(onHeaderUnderStatusBar.mock.calls).toEqual([[true], [false], [true]]);
    });
  });

  it('EmptyState action can be disabled (offline)', async () => {
    const onPress = jest.fn();
    await render(
      wrap(<EmptyState icon="key" title="No SSH keys in this project" action={{ label: 'Add SSH key', onPress, disabled: true }} />),
    );
    const action = screen.getByRole('button', { name: 'Add SSH key' });
    await fireEvent.press(action);

    expect(action.props.accessibilityState).toMatchObject({ disabled: true });
    expect(onPress).not.toHaveBeenCalled();
  });

  it('Text can use the monospace font and align its lines to the end', async () => {
    await render(
      wrap(
        <>
          <Text variant="body" mono>
            SCWABCDEFGHIJKLMNOPQ
          </Text>

          <Text variant="body" align="end">
            +19%
          </Text>
        </>,
      ),
    );

    expect(screen.getByText('SCWABCDEFGHIJKLMNOPQ')).toHaveStyle({ fontFamily: 'Menlo', fontSize: typography.body.fontSize });
    expect(screen.getByText('+19%')).toHaveStyle({ textAlign: 'right' });
  });
});
