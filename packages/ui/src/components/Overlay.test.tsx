import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../theme';
import { darkColors, lightColors } from '../tokens';
import { Overlay } from './Overlay';
import { Text } from './Text';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const wrap = (visible: boolean, preference: 'light' | 'dark' = 'light', dimmed?: boolean, announcement?: string) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <ThemeProvider preference={preference}>
      <Overlay visible={visible} dimmed={dimmed} announcement={announcement}>
        <Text variant="body">Inside</Text>
      </Overlay>
    </ThemeProvider>
  </SafeAreaProvider>
);

describe('Overlay', () => {
  it('shows nothing when it is not visible', async () => {
    await render(wrap(false));

    expect(screen.queryByText('Inside')).not.toBeOnTheScreen();
  });

  it('covers the screen and hides what is behind it from screen readers', async () => {
    await render(wrap(true));

    expect(screen.getByText('Inside')).toBeOnTheScreen();
    expect(screen.getByTestId('overlay')).toHaveStyle({ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 });
    expect(screen.getByTestId('overlay').props.accessibilityViewIsModal).toBe(true);
  });

  it('dims the screen with the scrim colour in light and dark', async () => {
    const { rerender } = await render(wrap(true, 'light'));

    expect(screen.getByTestId('overlay')).toHaveStyle({ backgroundColor: lightColors.scrim });

    await rerender(wrap(true, 'dark'));

    expect(screen.getByTestId('overlay')).toHaveStyle({ backgroundColor: darkColors.scrim });
  });

  it('with dimmed off it paints the page colour', async () => {
    const { rerender } = await render(wrap(true, 'light', false));

    expect(screen.getByTestId('overlay')).toHaveStyle({ backgroundColor: lightColors.background });

    await rerender(wrap(true, 'dark', false));

    expect(screen.getByTestId('overlay')).toHaveStyle({ backgroundColor: darkColors.background });
  });

  it('announces itself on iOS when it appears', async () => {
    Platform.OS = 'ios';
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const { rerender } = await render(wrap(false, 'light', false, 'Locked'));

    expect(announce).not.toHaveBeenCalled();

    await rerender(wrap(true, 'light', false, 'Locked'));

    expect(announce).toHaveBeenCalledWith('Locked');
    announce.mockRestore();
  });

  it('is a live region on Android and does not call announce', async () => {
    Platform.OS = 'android';
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await render(wrap(true, 'light', false, 'Locked'));

    expect(screen.getByTestId('overlay').props.accessibilityLiveRegion).toBe('polite');
    expect(announce).not.toHaveBeenCalled();
    announce.mockRestore();
    Platform.OS = 'ios';
  });
});
