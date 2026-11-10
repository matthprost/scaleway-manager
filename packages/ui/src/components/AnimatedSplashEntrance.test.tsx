import { render, screen } from '@testing-library/react-native';
import { getAnimatedStyle as getStyle, useReducedMotion } from 'react-native-reanimated';
import type { getAnimatedStyle as NativeGetAnimatedStyle } from 'react-native-reanimated/lib/typescript/jestUtils/index.native';

import { ThemeProvider } from '../theme';
import { motion } from '../tokens';
import { AnimatedSplashEntrance } from './AnimatedSplashEntrance';
import type { SplashEntranceState } from './AnimatedSplashEntrance';
import { Text } from './Text';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

// TypeScript sees Reanimated's web stub of getAnimatedStyle; Jest runs the native one
const getAnimatedStyle = getStyle as unknown as typeof NativeGetAnimatedStyle;

const { duration } = motion;
// The second block is fully in by then
const BOTH_IN = duration.splashEntranceDelay + duration.splashEntranceStagger + duration.splashEntrance + 20;

function blocks(state: SplashEntranceState) {
  return (
    <ThemeProvider preference="light">
      <AnimatedSplashEntrance state={state} order="first">
        <Text variant="title">Scaleway Manager</Text>
      </AnimatedSplashEntrance>

      <AnimatedSplashEntrance state={state} order="second">
        <Text variant="body">Check on your Scaleway cloud from your phone.</Text>
      </AnimatedSplashEntrance>
    </ThemeProvider>
  );
}

const entrances = () => screen.getAllByTestId('splash-entrance');

describe('AnimatedSplashEntrance', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
    jest.useRealTimers();
  });

  it('shows its content at once when no splash played', async () => {
    await render(blocks('shown'));

    for (const entrance of entrances()) {
      expect(entrance).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }
  });

  it('hides its content under the splash, then fades and rises it in, one block after the other', async () => {
    const { rerender } = await render(blocks('hidden'));
    await jest.advanceTimersByTimeAsync(1000);

    for (const entrance of entrances()) {
      expect(entrance).toHaveAnimatedStyle({ opacity: 0, transform: [{ translateY: 20 }] });
    }

    await rerender(blocks('enter'));
    // Just after the first block starts
    await jest.advanceTimersByTimeAsync(duration.splashEntranceDelay + 50);
    const [first, second] = entrances().map((entrance) => getAnimatedStyle(entrance).opacity as number);

    expect(first).toBeGreaterThan(0);
    expect(second).toBe(0);

    await jest.advanceTimersByTimeAsync(BOTH_IN);

    for (const entrance of entrances()) {
      expect(entrance).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }
  });

  it("keeps coming in when the splash is gone before it's done", async () => {
    const { rerender } = await render(blocks('hidden'));
    await rerender(blocks('enter'));
    await jest.advanceTimersByTimeAsync(duration.splashEntranceDelay + 100);
    await rerender(blocks('shown'));

    const [first] = entrances().map((entrance) => getAnimatedStyle(entrance).opacity as number);

    // No jump to the end
    expect(first).toBeLessThan(1);

    await jest.advanceTimersByTimeAsync(BOTH_IN);

    expect(entrances()[1]).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('with Reduce Motion it shows at once: no wait, no rise', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { rerender } = await render(blocks('hidden'));
    await rerender(blocks('enter'));
    // One frame, no wait
    await jest.advanceTimersByTimeAsync(20);

    for (const entrance of entrances()) {
      expect(entrance).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }
  });
});
