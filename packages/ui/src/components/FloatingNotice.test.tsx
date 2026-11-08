import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../theme';
import { FloatingNotice } from './FloatingNotice';
import { Text } from './Text';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

const wrap = (announcement?: string) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <ThemeProvider preference="light">
      <FloatingNotice announcement={announcement}>
        <Text variant="body">Hello</Text>
      </FloatingNotice>
    </ThemeProvider>
  </SafeAreaProvider>
);

afterEach(() => {
  Platform.OS = 'ios';
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('FloatingNotice', () => {
  it('sits below the status bar', async () => {
    await render(wrap());

    expect(screen.getByTestId('floating-notice')).toHaveStyle({ position: 'absolute', top: 59 + 4 });
  });

  it('lets touches pass through', async () => {
    await render(wrap());

    expect(screen.getByTestId('floating-notice').props.pointerEvents).toBe('box-none');
  });

  it('announces its message', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const view = await render(wrap('Back online'));

    expect(announce).toHaveBeenCalledWith('Back online');

    await view.rerender(wrap('Back online'));

    expect(announce).toHaveBeenCalledTimes(1);

    await view.rerender(wrap('You\'re offline'));

    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('keeps a long notice off the screen edges', async () => {
    await render(wrap());

    expect(screen.getByTestId('floating-notice')).toHaveStyle({ paddingHorizontal: 16 });
  });

  it('stays centred on a wide screen', async () => {
    await render(wrap());

    expect(screen.getByTestId('floating-notice')).toHaveStyle({ left: 0, right: 0, alignItems: 'center' });
    expect(screen.getByTestId('floating-notice-content')).toHaveStyle({ maxWidth: 560 });
  });

  it('does not announce on Android, where the live region speaks', async () => {
    Platform.OS = 'android';
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await render(wrap('Back online'));

    expect(announce).not.toHaveBeenCalled();
  });
});
