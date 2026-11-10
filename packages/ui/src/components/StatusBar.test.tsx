import { render } from '@testing-library/react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import { ThemeProvider } from '../theme';
import { StatusBar } from './StatusBar';

jest.mock('expo-status-bar', () => ({ StatusBar: jest.fn(() => null) }));

const wrap = (onBrand: boolean, preference: 'light' | 'dark') => (
  <ThemeProvider preference={preference}>
    <StatusBar onBrand={onBrand} />
  </ThemeProvider>
);

// The style the last render asked expo-status-bar for
const lastStyle = () => jest.mocked(ExpoStatusBar).mock.lastCall?.[0].style;

describe('StatusBar', () => {
  it('is light on purple, in light and dark mode', async () => {
    const { rerender } = await render(wrap(true, 'light'));

    expect(lastStyle()).toBe('light');

    await rerender(wrap(true, 'dark'));

    expect(lastStyle()).toBe('light');
  });

  it('follows the theme off purple: dark in light mode, light in dark mode', async () => {
    const { rerender } = await render(wrap(false, 'light'));

    expect(lastStyle()).toBe('dark');

    await rerender(wrap(false, 'dark'));

    expect(lastStyle()).toBe('light');
  });
});
