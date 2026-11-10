import { render, screen } from '@testing-library/react-native';
import { Text, useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { darkColors, lightColors, palette } from '../tokens';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './useTheme';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn(),
  __esModule: true,
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

const mockedScheme = jest.mocked(useColorScheme);

function Probe() {
  const { scheme, colors } = useTheme();

  return <Text testID="probe">{`${scheme}|${colors.background}`}</Text>;
}

function MotionProbe() {
  const { reduceMotion } = useTheme();

  return <Text testID="motion-probe">{String(reduceMotion)}</Text>;
}

describe('theme', () => {
  afterEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it("gives the phone's Reduce Motion setting, so apps don't need Reanimated", async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { rerender } = await render(
      <ThemeProvider preference="light">
        <MotionProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('motion-probe').props.children).toBe('true');

    jest.mocked(useReducedMotion).mockReturnValue(false);
    await rerender(
      <ThemeProvider preference="light">
        <MotionProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('motion-probe').props.children).toBe('false');
  });

  it('light and dark themes define the same colour keys', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('follows the phone when preference is system', async () => {
    mockedScheme.mockReturnValue('dark');
    await render(
      <ThemeProvider preference="system">
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('probe').props.children).toBe('dark|#0E0C14');
  });

  it('light preference beats a dark phone', async () => {
    mockedScheme.mockReturnValue('dark');
    await render(
      <ThemeProvider preference="light">
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('probe').props.children).toBe('light|#F6F5FA');
  });

  it('splash colours match the native config', () => {
    expect(lightColors.splashBackground).toBe(palette.purple500);
    expect(darkColors.splashBackground).toBe(palette.purple900);
  });
});
