import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../theme';
import { darkColors, lightColors } from '../tokens';
import type { Product } from '../tokens';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { Screen } from './Screen';
import { Stack } from './Stack';
import { Text } from './Text';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrap(children: ReactNode, preference: 'light' | 'dark' = 'light') {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider preference={preference}>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

// What a finger does before it lifts: Pressable shows its pressed look
const touch = { persist: () => {}, nativeEvent: { timestamp: 0, touches: [], changedTouches: [] } };

// Three times the normal text size, where a label makes its pill taller than the minimum
const largeText = () =>
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 3 });

describe('primitives', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Button pills are at least 48 / 36 high and can grow with large text', async () => {
    await render(
      wrap(
        <>
          <Button label="Medium" size="md" onPress={jest.fn()} />
          <Button label="Small" size="sm" onPress={jest.fn()} />
        </>,
      ),
    );
    const medium = within(screen.getByRole('button', { name: 'Medium' })).getByTestId('button-pill');
    const small = within(screen.getByRole('button', { name: 'Small' })).getByTestId('button-pill');

    // The visible pill; the touch box around it is at least 44
    expect(medium).toHaveStyle({ minHeight: 48, paddingVertical: 4 });
    expect(small).toHaveStyle({ minHeight: 36, paddingVertical: 4 });
    // No fixed height, so a label at the largest text size never spills out
    expect(StyleSheet.flatten(medium.props.style).height).toBeUndefined();
    expect(StyleSheet.flatten(small.props.style).height).toBeUndefined();
  });

  it('a pressable Card dims to 80% while pressed', async () => {
    await render(
      wrap(
        <Card onPress={jest.fn()}>
          <Text variant="body">Inside</Text>
        </Card>,
      ),
    );
    const card = screen.getByRole('button');

    expect(card).toHaveStyle({ opacity: 1 });

    await fireEvent(card, 'responderGrant', touch);

    expect(card).toHaveStyle({ opacity: 0.8 });
  });

  it("a disabled Card fades to 50% and doesn't press", async () => {
    const onPress = jest.fn();
    await render(
      wrap(
        <Card onPress={onPress} disabled>
          <Text variant="body">Inside</Text>
        </Card>,
      ),
    );
    const card = screen.getByRole('button');
    await fireEvent.press(card);

    expect(card).toHaveStyle({ opacity: 0.5 });
    expect(card.props.accessibilityState.disabled).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("disabled Button doesn't press", async () => {
    const onPress = jest.fn();
    await render(wrap(<Button label="Go" size="md" disabled onPress={onPress} />));
    const button = screen.getByRole('button', { name: 'Go' });
    await fireEvent.press(button);

    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("loading Button shows a spinner and doesn't press", async () => {
    const onPress = jest.fn();
    await render(wrap(<Button label="Go" size="md" loading onPress={onPress} />));
    await fireEvent.press(screen.getByRole('button', { name: 'Go' }));

    expect(screen.getByTestId('button-spinner')).toBeOnTheScreen();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('a loading Button keeps its size at a large text size: the label keeps its room and the spinner sits over it', async () => {
    largeText();
    const button = (loading: boolean) => wrap(<Button label="Log in with Scaleway" size="md" loading={loading} onPress={jest.fn()} />);
    const { rerender } = await render(button(false));

    expect(screen.getByText('Log in with Scaleway')).toBeVisible();

    await rerender(button(true));

    // Still laid out, so the pill keeps the height the label gave it; just not shown
    expect(screen.getByText('Log in with Scaleway')).toBeOnTheScreen();
    expect(screen.getByText('Log in with Scaleway')).not.toBeVisible();
    expect(screen.getByTestId('button-spinner')).toHaveStyle(StyleSheet.absoluteFill);
  });

  it('a label that wraps is centred line by line', async () => {
    await render(wrap(<Button label="Log in with Scaleway" size="md" onPress={jest.fn()} />));

    expect(screen.getByText('Log in with Scaleway')).toHaveStyle({ textAlign: 'center' });
  });

  it('side-by-side buttons stay the same height when a long label wraps at a large text size', async () => {
    largeText();
    const long = 'Reboot web-prod-1 and its two volumes';
    await render(
      wrap(
        <Stack direction="row" gap="xs">
          <Button label="Cancel" size="sm" variant="secondary" fill onPress={jest.fn()} />

          <Button label={long} size="sm" fill onPress={jest.fn()} />
        </Stack>,
      ),
    );
    const row = StyleSheet.flatten(screen.getByRole('button', { name: 'Cancel' }).parent?.props.style);

    // The row stretches both touch boxes to the taller one (stretch is the default)
    expect(row.alignItems ?? 'stretch').toBe('stretch');

    for (const name of ['Cancel', long]) {
      const box = screen.getByRole('button', { name });

      // Each pill fills its box, kept 36 inside the 44 box by the same padding: equal pills, whatever wraps
      expect(StyleSheet.flatten(box.props.style).alignSelf).toBeUndefined();
      expect(box).toHaveStyle({ minHeight: 44, paddingVertical: 4, flexShrink: 1 });
      expect(within(box).getByTestId('button-pill')).toHaveStyle({ flexGrow: 1, minHeight: 36 });
    }
  });

  it('a lone button hugs its label: its pill never grows into the free space around it', async () => {
    await render(wrap(<Button label="Add SSH key" size="md" onPress={jest.fn()} />));

    expect(StyleSheet.flatten(within(screen.getByRole('button', { name: 'Add SSH key' })).getByTestId('button-pill').props.style).flexGrow).toBeUndefined();
  });

  it('loading spinner uses the label colour on secondary buttons', async () => {
    await render(
      wrap(<Button label="Go" size="md" variant="secondary" loading onPress={jest.fn()} />),
    );

    expect(screen.getByTestId('button-spinner').props.color).toBe(lightColors.brand);
  });

  it("muted Text uses the theme's muted colour in dark mode", async () => {
    await render(
      wrap(
        <Text variant="body" tone="muted">
          Hello
        </Text>,
        'dark',
      ),
    );

    expect(screen.getByText('Hello')).toHaveStyle({ color: darkColors.textMuted });
  });

  it('Text supports the onBadge tone', async () => {
    await render(
      wrap(
        <Text variant="body" tone="onBadge">
          Hello
        </Text>,
      ),
    );

    expect(screen.getByText('Hello')).toHaveStyle({ color: lightColors.onBadge });
  });

  it('Card with onPress is a button', async () => {
    await render(
      wrap(
        <Card onPress={jest.fn()}>
          <Text variant="body">Inside</Text>
        </Card>,
      ),
    );

    expect(screen.getByRole('button')).toBeOnTheScreen();
  });

  it('Card with onPress can say one phrase for the whole card', async () => {
    await render(
      wrap(
        <Card onPress={jest.fn()} accessibilityLabel="web-prod-1, Running, Pinned">
          <Text variant="body">web-prod-1</Text>
        </Card>,
      ),
    );

    expect(screen.getByRole('button', { name: 'web-prod-1, Running, Pinned' })).toBeOnTheScreen();
  });

  it('Card grow fills the height its parent gives it, pressable or not', async () => {
    await render(
      wrap(
        <>
          <Card grow>
            <Text variant="body">Plain</Text>
          </Card>

          <Card grow onPress={jest.fn()}>
            <Text variant="body">Pressable</Text>
          </Card>

          <Card>
            <Text variant="body">Default</Text>
          </Card>
        </>,
      ),
    );

    expect(screen.getByText('Plain').parent).toHaveStyle({ flexGrow: 1 });
    expect(screen.getByRole('button')).toHaveStyle({ flexGrow: 1 });
    expect(StyleSheet.flatten(screen.getByText('Default').parent?.props.style).flexGrow).toBeUndefined();
  });

  it("Icon can take a product's colour", async () => {
    await render(
      wrap(
        <>
          <Icon name="server" product="instances" />

          <Icon name="cube" product="kubernetes" />
        </>,
        'dark',
      ),
    );
    const json = JSON.stringify(screen.toJSON());

    expect(json).toContain(`"stroke":"${darkColors.products.instances.icon}"`);
    expect(json).toContain(`"stroke":"${darkColors.products.kubernetes.icon}"`);
  });

  it('Icon has the appearance, About and outside-the-app icons (Account)', async () => {
    await render(
      wrap(
        <>
          <Icon name="appearance" tone="muted" />

          <Icon name="info" tone="muted" />

          <Icon name="external" tone="muted" />
        </>,
      ),
    );

    expect(JSON.stringify(screen.toJSON()).match(new RegExp(`"stroke":"${lightColors.textMuted}"`, 'g'))).toHaveLength(3);
  });

  it('Icon star-filled is the outline star filled in its tone, at the same size; other icons stay outlines', async () => {
    await render(
      wrap(
        <>
          <Icon name="star-filled" size="sm" tone="brand" />

          <Icon name="star" size="sm" tone="brand" />
        </>,
        'dark',
      ),
    );
    const [filled, outline] = (screen.toJSON() as { children: { props: Record<string, unknown> }[] }).children;

    expect(filled?.props).toMatchObject({ fill: darkColors.brand, stroke: darkColors.brand, width: 16, height: 16, strokeWidth: 1.9 });
    expect(outline?.props).toMatchObject({ fill: 'none', stroke: darkColors.brand, width: 16, height: 16, strokeWidth: 1.9 });
  });

  it('Icon falls back to its tone for a product it has no colour for', async () => {
    await render(wrap(<Icon name="layers" product={'object-storage' as Product} tone="muted" />));

    expect(JSON.stringify(screen.toJSON())).toContain(`"stroke":"${lightColors.textMuted}"`);
  });

  it('Button can put its icon after the label', async () => {
    const order = () => {
      const json = JSON.stringify(screen.toJSON());

      return json.indexOf('"children":["See all"]') < json.indexOf('"stroke"') ? 'label first' : 'icon first';
    };
    const { rerender } = await render(
      wrap(<Button label="See all" icon="chevron-right" size="sm" variant="ghost" onPress={jest.fn()} />),
    );

    expect(order()).toBe('icon first');

    await rerender(
      wrap(<Button label="See all" icon="chevron-right" iconPosition="end" size="sm" variant="ghost" onPress={jest.fn()} />),
    );

    expect(order()).toBe('label first');
    expect(screen.getByRole('button', { name: 'See all' })).toBeOnTheScreen();
  });

  it('Icon and Screen render', async () => {
    await render(
      wrap(
        <Screen>
          <Icon name="home" />
        </Screen>,
      ),
    );

    expect(screen.toJSON()).not.toBeNull();
  });
});
