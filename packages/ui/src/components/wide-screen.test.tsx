import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../theme';
import { sizes } from '../tokens';
import { Button } from './Button';
import { Card } from './Card';
import { HeaderBackground } from './HeaderBackground';
import { Overlay } from './Overlay';
import { Screen } from './Screen';
import { Stack } from './Stack';
import { Text } from './Text';

// An iPad in portrait
const ipad = {
  frame: { x: 0, y: 0, width: 1024, height: 1366 },
  insets: { top: 24, left: 0, right: 0, bottom: 20 },
};

function wrap(children: ReactNode) {
  return (
    <SafeAreaProvider initialMetrics={ipad}>
      <ThemeProvider preference="light">{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

// Centred at 560 on a wide screen
const capped = { width: '100%', maxWidth: sizes.contentMaxWidth, alignSelf: 'center' } as const;

const maxWidthOf = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style).maxWidth;

describe('wide screens (iPad, 1024 wide)', () => {
  it('Screen centres padded content at 560', async () => {
    await render(
      wrap(
        <Screen>
          <Text variant="body">Account</Text>
        </Screen>,
      ),
    );

    expect(screen.getByTestId('screen-content')).toHaveStyle(capped);
  });

  it('Screen lets full-bleed content reach both edges', async () => {
    await render(
      wrap(
        <Screen topInset="none" padded={false}>
          <Text variant="body">Home</Text>
        </Screen>,
      ),
    );

    expect(screen.getByTestId('screen-content')).toHaveStyle({ width: '100%' });
    expect(maxWidthOf('screen-content')).toBeUndefined();
  });

  it('HeaderBackground reaches both edges and centres its content at 560', async () => {
    // The Home recipe
    await render(
      wrap(
        <Screen topInset="none" padded={false}>
          <HeaderBackground minHeight={371} insetTop>
            <Text variant="title">€84.60</Text>
          </HeaderBackground>
        </Screen>,
      ),
    );

    expect(maxWidthOf('header-gradient')).toBeUndefined();
    expect(screen.getByTestId('header-content')).toHaveStyle(capped);
  });

  it('Stack contained centres content under a full-bleed header at 560', async () => {
    await render(
      wrap(
        <>
          <Stack paddingHorizontal="md" overlapHeader contained>
            <Card raised>
              <Text variant="body">By product</Text>
            </Card>
          </Stack>

          <Stack>
            <Text variant="body">Not contained</Text>
          </Stack>
        </>,
      ),
    );
    const stack = (text: string) => screen.getByText(text).parent?.parent;

    expect(stack('By product')).toHaveStyle({ ...capped, paddingHorizontal: 16, marginTop: -28 });
    expect(StyleSheet.flatten(screen.getByText('Not contained').parent?.props.style).maxWidth).toBeUndefined();
  });

  it("lock screen: the purple reaches both edges and the Unlock button doesn't stretch", async () => {
    await render(
      wrap(
        <Overlay visible dimmed={false} announcement="Scaleway Manager is locked">
          <HeaderBackground fill insetTop insetBottom>
            <Stack grow justify="between" padding="lg">
              <Text variant="title" tone="onBrand">
                Scaleway Manager is locked
              </Text>

              <Button label="Unlock" size="md" variant="onBrand" onPress={jest.fn()} />
            </Stack>
          </HeaderBackground>
        </Overlay>,
      ),
    );

    // The overlay and the purple fill the whole screen
    expect(screen.getByTestId('overlay-content')).toHaveStyle({ flex: 1 });
    expect(maxWidthOf('overlay-content')).toBeUndefined();
    expect(maxWidthOf('header-gradient')).toBeUndefined();
    // The title and the button are centred at 560
    expect(screen.getByTestId('header-content')).toHaveStyle(capped);
  });

  it("Welcome's dots keep their phone size and spacing on an iPad", async () => {
    await render(
      wrap(
        <HeaderBackground fill dots>
          <Text variant="title">Scaleway Manager</Text>
        </HeaderBackground>,
      ),
    );

    const strongest = String(
      screen.getAllByTestId('header-dots-step', { includeHiddenElements: true }).at(-1)?.props.d,
    );
    const xs = [...strongest.matchAll(/M([\d.]+),([\d.]+)a/g)].map((match) => Number(match[1]));

    // Radius 1.5, and neighbours 20 pt apart (the left edge of one dot to the next)
    expect(strongest).toContain('a1.5,1.5 0 1,0 3,0');
    expect(xs.slice(1).some((x, index) => Math.abs(x - (xs[index] ?? 0) - 20) < 0.001)).toBe(true);
  });

  it('a dimmed Overlay centres its card at 560', async () => {
    await render(
      wrap(
        <Overlay visible announcement="Use Face ID to unlock?">
          <Card>
            <Text variant="headline">Use Face ID to unlock?</Text>
          </Card>
        </Overlay>,
      ),
    );

    expect(screen.getByTestId('overlay-content')).toHaveStyle({ width: '100%', maxWidth: sizes.contentMaxWidth });
  });
});
