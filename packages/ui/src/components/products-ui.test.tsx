import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../theme';
import { accessibilityTextScale, contrastRatio, darkColors, lightColors, sizes, typography } from '../tokens';
import type { Product, ThemeColors } from '../tokens';
import { ActionGrid } from './ActionGrid';
import { AlertRow } from './AlertRow';
import { DetailHero } from './DetailHero';
import type { Health } from './HealthDot';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { ListRow } from './ListRow';
import { ResourceCard } from './ResourceCard';
import { ScreenHeader } from './ScreenHeader';
import { StatusPill } from './StatusPill';

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

// A phone at a given text size
const withTextSize = (fontScale: number) =>
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 390, height: 844, scale: 3, fontScale });

// The flattened style of a rendered element
const style = (element: unknown) =>
  StyleSheet.flatten((element as { props: { style?: StyleProp<ViewStyle> } }).props.style) ?? {};

// How many icons in the tree are drawn in this colour
const strokes = (color: string) => JSON.stringify(screen.toJSON()).split(`"stroke":"${color}"`).length - 1;

// How many of them are filled with it (the pinned star); every other icon is an outline
const fills = (color: string) => JSON.stringify(screen.toJSON()).split(`"fill":"${color}"`).length - 1;

// Each health's Pill: its background and its words
const HEALTH_PILLS: Record<Health, (colors: ThemeColors) => { background: string; text: string }> = {
  ok: (colors) => ({ background: colors.successBadge, text: colors.onBadge }),
  busy: (colors) => ({ background: colors.primaryButton, text: colors.onBadge }),
  warning: (colors) => ({ background: colors.warningBadge, text: colors.onBadge }),
  error: (colors) => ({ background: colors.dangerBadge, text: colors.onBadge }),
  stopped: (colors) => ({ background: colors.neutralBadge, text: colors.onBadge }),
};

const HEALTH_DOTS: Record<Health, (colors: ThemeColors) => string> = {
  ok: (colors) => colors.success,
  busy: (colors) => colors.primaryButton,
  warning: (colors) => colors.warning,
  error: (colors) => colors.alertText,
  stopped: (colors) => colors.neutral,
};

// The icons of the product actions and notices, one meaning each (bible §8)
const ACTION_ICONS: readonly IconName[] = ['power', 'moon', 'restart', 'backup', 'redeploy', 'replace', 'run', 'stop'];

describe('products UI', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Icon', () => {
    it.each(ACTION_ICONS)('%s is an outline icon in its tone', async (name) => {
      await render(wrap(<Icon name={name} tone="brand" />));

      expect(strokes(lightColors.brand)).toBe(1);
    });
  });

  describe('StatusPill', () => {
    it.each(Object.keys(HEALTH_PILLS) as Health[])('StatusPill shows the health as its Pill tone: %s', async (health) => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(wrap(<StatusPill label="Some status" health={health} />, preference));
        const { background, text } = HEALTH_PILLS[health](colors);

        expect(screen.getByTestId('pill')).toHaveStyle({ backgroundColor: background });
        expect(screen.getByText('Some status')).toHaveStyle({ color: text });
        expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5);

        await unmount();
      }
    });

    it('a ResourceCard shows its status with the same StatusPill', async () => {
      await render(
        wrap(
          <ResourceCard
            product="instances"
            title="web-prod-1"
            subtitle="Instance · Ubuntu"
            meta="fr-par-1"
            statusLabel="Rebooting"
            health="busy"
            onPress={jest.fn()}
          />,
        ),
      );

      expect(screen.getByTestId('pill')).toHaveStyle({ backgroundColor: lightColors.primaryButton });
      // The shared product tile
      expect(screen.getByTestId('product-tile')).toHaveStyle({
        width: sizes.productTile,
        height: sizes.productTile,
        backgroundColor: lightColors.products.instances.tile,
      });
    });
  });

  describe('ListRow, for products and resources', () => {
    it("a product row shows the product's tile instead of an icon, in light and dark", async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(
          wrap(
            <ListRow
              title="Kubernetes"
              product="kubernetes"
              subtitle="2 OK"
              trailing={{ type: 'chevron', text: '2' }}
              onPress={jest.fn()}
            />,
            preference,
          ),
        );
        const { tile, icon } = colors.products.kubernetes;

        expect(screen.getByTestId('product-tile')).toHaveStyle({
          width: sizes.productTile,
          height: sizes.productTile,
          backgroundColor: tile,
        });
        expect(strokes(icon)).toBe(1);
        expect(contrastRatio(icon, tile)).toBeGreaterThanOrEqual(3);
        // The count is the chevron's value: "Kubernetes, 2 OK, 2"
        expect(screen.getByRole('button', { name: 'Kubernetes, 2 OK, 2' })).toBeOnTheScreen();

        await unmount();
      }
    });

    it('a product ui does not know yet gets a neutral tile in a row too', async () => {
      await render(wrap(<ListRow title="Object storage" product={'object-storage' as Product} />));

      expect(screen.getByTestId('product-tile')).toHaveStyle({ backgroundColor: lightColors.background });
      expect(strokes(lightColors.textMuted)).toBe(1);
    });

    it.each(Object.keys(HEALTH_DOTS) as Health[])(
      'subtitleHealth puts the %s dot in front of the subtitle words, on their first line',
      async (health) => {
        const { fontScale } = Dimensions.get('window');

        for (const [preference, colors] of themes) {
          const { unmount } = await render(
            wrap(<ListRow title="Instances" subtitle="1 failing · 2 OK" subtitleHealth={health} />, preference),
          );

          expect(screen.getByTestId('health-dot', { includeHiddenElements: true })).toHaveStyle({
            backgroundColor: HEALTH_DOTS[health](colors),
          });
          expect(screen.getByTestId('health-dot-line', { includeHiddenElements: true })).toHaveStyle({
            height: typography.subhead.lineHeight * fontScale,
          });
          // The words carry the meaning; the dot only repeats it
          expect(screen.getByLabelText('Instances, 1 failing · 2 OK')).toBeOnTheScreen();

          await unmount();
        }
      },
    );

    it('never draws the dot without its words', async () => {
      await render(wrap(<ListRow title="Instances" subtitleHealth="error" />));

      expect(screen.queryByTestId('health-dot', { includeHiddenElements: true })).not.toBeOnTheScreen();
    });

    it.each(Object.keys(HEALTH_PILLS) as Health[])('a status row shows its status as a %s Pill', async (health) => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(
          wrap(
            <ListRow title="pool-default" subtitle="3 × DEV1-M" trailing={{ type: 'status', label: 'Ready', health }} />,
            preference,
          ),
        );

        expect(screen.getByTestId('pill')).toHaveStyle({ backgroundColor: HEALTH_PILLS[health](colors).background });
        expect(screen.getByLabelText('pool-default, 3 × DEV1-M, Ready')).toBeOnTheScreen();

        await unmount();
      }
    });

    it('a status row that opens something adds the chevron after its Pill', async () => {
      const onPress = jest.fn();
      const row = (press?: () => void) =>
        wrap(
          <ListRow title="web-prod-1" trailing={{ type: 'status', label: 'Running', health: 'ok' }} onPress={press} />,
        );
      const { rerender } = await render(row());

      expect(strokes(lightColors.textMuted)).toBe(0);
      expect(screen.queryByRole('button')).not.toBeOnTheScreen();

      await rerender(row(onPress));

      expect(strokes(lightColors.textMuted)).toBe(1);

      await fireEvent.press(screen.getByRole('button', { name: 'web-prod-1, Running' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('ListRow status shows a star when pinned, and says Pinned', async () => {
      const row = (pinned: boolean) =>
        wrap(
          <ListRow
            title="web-prod-1"
            subtitle="DEV1-S · fr-par-1"
            trailing={{ type: 'status', label: 'Running', health: 'ok', pinned }}
            onPress={jest.fn()}
          />,
          'dark',
        );
      const { rerender } = await render(row(false));
      const withoutStar = strokes(darkColors.brand);

      expect(screen.queryByTestId('row-pinned', { includeHiddenElements: true })).not.toBeOnTheScreen();
      expect(fills(darkColors.brand)).toBe(0);

      await rerender(row(true));

      // The filled star in brand, before the Pill
      expect(screen.getByTestId('row-pinned', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(strokes(darkColors.brand)).toBe(withoutStar + 1);
      expect(fills(darkColors.brand)).toBe(1);
      expect(screen.getByRole('button', { name: 'web-prod-1, DEV1-S · fr-par-1, Running, Pinned' })).toBeOnTheScreen();
    });
  });

  describe('ScreenHeader', () => {
    it('an on/off action (the pin) is a filled brand star, selected, when on; an outline muted one when off', async () => {
      // As a resource's screen draws it
      const header = (selected?: boolean) =>
        wrap(
          <ScreenHeader
            title="web-prod-1"
            onBack={jest.fn()}
            action={{
              icon: selected ? 'star-filled' : 'star',
              label: selected ? 'Unpin from Home' : 'Pin to Home',
              onPress: jest.fn(),
              selected,
            }}
          />,
        );
      const { rerender } = await render(header(true));
      const on = screen.getByRole('button', { name: 'Unpin from Home' });

      expect(on.props.accessibilityState).toMatchObject({ selected: true });
      // Back and the star, both brand; only the star is filled
      expect(strokes(lightColors.brand)).toBe(2);
      expect(fills(lightColors.brand)).toBe(1);

      await rerender(header(false));
      const off = screen.getByRole('button', { name: 'Pin to Home' });

      expect(off.props.accessibilityState).toMatchObject({ selected: false });
      expect(strokes(lightColors.brand)).toBe(1);
      expect(strokes(lightColors.textMuted)).toBe(1);
      expect(fills(lightColors.brand)).toBe(0);
      expect(fills(lightColors.textMuted)).toBe(0);
      expect(contrastRatio(lightColors.textMuted, lightColors.background)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(darkColors.textMuted, darkColors.background)).toBeGreaterThanOrEqual(3);

      // A plain action has no on/off state
      await rerender(header(undefined));

      expect(screen.getByRole('button', { name: 'Pin to Home' }).props.accessibilityState.selected).toBeUndefined();
      expect(strokes(lightColors.brand)).toBe(2);
    });
  });

  describe('AlertRow', () => {
    it('info: a soft purple note with the info icon, read as "Note, …"', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(
          wrap(
            <AlertRow
              title="Upgrade available"
              detail="A newer Kubernetes version is available. Upgrade from the Scaleway console."
              tone="info"
            />,
            preference,
          ),
        );

        expect(screen.getByTestId('alert-row')).toHaveStyle({ backgroundColor: colors.infoBackground });
        expect(screen.getByText('Upgrade available')).toHaveStyle({ color: colors.text });
        expect(
          screen.getByText('A newer Kubernetes version is available. Upgrade from the Scaleway console.'),
        ).toHaveStyle({ color: colors.textMuted });
        expect(strokes(colors.brand)).toBe(1);
        expect(
          screen.getByLabelText(
            'Note, Upgrade available, A newer Kubernetes version is available. Upgrade from the Scaleway console.',
          ),
        ).toBeOnTheScreen();
        expect(contrastRatio(colors.text, colors.infoBackground)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.textMuted, colors.infoBackground)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.brand, colors.infoBackground)).toBeGreaterThanOrEqual(3);

        await unmount();
      }
    });
  });

  it("a status row's Pill takes at most half the row, so the title keeps its room", async () => {
    await render(
      wrap(<ListRow title="Node 1" trailing={{ type: 'status', label: 'Needs a node pool', health: 'warning' }} />),
    );

    expect(within(screen.getByTestId('row-status')).getByTestId('pill')).toBeOnTheScreen();
    expect(screen.getByTestId('row-status')).toHaveStyle({ maxWidth: '50%', flexShrink: 1 });
  });
  describe('DetailHero', () => {
    it('DetailHero shows the product tile, the subtitle and the status Pill, read as one phrase', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(
          wrap(
            <DetailHero product="databases" subtitle="PostgreSQL 16 · fr-par" statusLabel="Ready" health="ok" />,
            preference,
          ),
        );

        // A bigger tile than a row's, in the product's colours
        expect(screen.getByTestId('product-tile')).toHaveStyle({
          width: sizes.productTileLarge,
          height: sizes.productTileLarge,
          backgroundColor: colors.products.databases.tile,
        });
        expect(strokes(colors.products.databases.icon)).toBe(1);
        expect(screen.getByText('PostgreSQL 16 · fr-par')).toHaveStyle({
          color: colors.textMuted,
          fontSize: typography.body.fontSize,
        });
        expect(screen.getByTestId('pill')).toHaveStyle({ backgroundColor: colors.successBadge });
        expect(screen.getByLabelText('PostgreSQL 16 · fr-par, Ready')).toBeOnTheScreen();
        // The name stays in the ScreenHeader: the hero doesn't repeat it
        expect(screen.queryByRole('header')).not.toBeOnTheScreen();
        expect(screen.queryByText('Pinned')).not.toBeOnTheScreen();

        await unmount();
      }
    });

    it('DetailHero says Pinned in words when pinned, after the filled star', async () => {
      await render(
        wrap(
          <DetailHero product="instances" subtitle="DEV1-S · fr-par-1" statusLabel="Running" health="ok" pinned />,
          'dark',
        ),
      );

      expect(screen.getByText('Pinned')).toHaveStyle({ color: darkColors.textMuted });
      expect(strokes(darkColors.brand)).toBe(1);
      expect(fills(darkColors.brand)).toBe(1);
      expect(screen.getByLabelText('DEV1-S · fr-par-1, Running, Pinned')).toBeOnTheScreen();
    });
  });

  describe('ActionGrid', () => {
    // Five actions, so the last row has one
    const ACTIONS = [
      { key: 'poweroff', label: 'Power off', icon: 'power' },
      { key: 'standby', label: 'Standby', icon: 'moon' },
      { key: 'reboot', label: 'Reboot', icon: 'restart' },
      { key: 'backup', label: 'Back up', icon: 'backup' },
      { key: 'run', label: 'Run now', icon: 'run' },
    ] as const;

    const buttons = () => screen.getAllByRole('button');

    it('ActionGrid buttons share size md, in rows of two with no align', async () => {
      withTextSize(1);
      await render(wrap(<ActionGrid actions={ACTIONS} onPress={jest.fn()} />));
      const all = buttons();
      const rows = [all[0], all[2], all[4]].map((button) => (button as { parent: unknown }).parent);

      expect(all.map((button) => button.props.accessibilityLabel)).toEqual([
        'Power off',
        'Standby',
        'Reboot',
        'Back up',
        'Run now',
      ]);

      for (const button of all) {
        // size md: the same 48 pt pill, a minimum, so a row's two grow together at large text sizes
        expect(within(button).getByTestId('button-pill')).toHaveStyle({ minHeight: sizes.buttonMd, flexGrow: 1 });
        // They share their row equally: the same width
        expect(button).toHaveStyle({ flex: 1 });
      }

      for (const row of rows) {
        // A row of only buttons with no align: it stretches both to the taller one
        expect(style(row)).toMatchObject({ flexDirection: 'row' });
        expect(style(row).alignItems).toBeUndefined();
      }

      expect((all[1] as { parent: unknown }).parent).toBe(rows[0]);
      expect((all[3] as { parent: unknown }).parent).toBe(rows[1]);
      // An odd last button keeps half the width: an empty slot fills the other half
      expect(within(rows[2] as never).getByTestId('action-grid-spacer', { includeHiddenElements: true })).toHaveStyle({
        flex: 1,
      });
    });

    it('ActionGrid buttons are secondary (one primary per screen), each with its icon', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(wrap(<ActionGrid actions={ACTIONS} onPress={jest.fn()} />, preference));

        for (const button of buttons()) {
          expect(within(button).getByTestId('button-pill')).toHaveStyle({ backgroundColor: colors.surface });
        }

        expect(screen.getByText('Power off')).toHaveStyle({ color: colors.brand });
        expect(strokes(colors.brand)).toBe(ACTIONS.length);

        await unmount();
      }
    });

    it("ActionGrid calls onPress with the tapped action's key", async () => {
      const onPress = jest.fn();
      await render(wrap(<ActionGrid actions={ACTIONS} onPress={onPress} />));

      await fireEvent.press(screen.getByRole('button', { name: 'Reboot' }));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith('reboot');
    });

    it('ActionGrid shows the disabled reason', async () => {
      const onPress = jest.fn();
      await render(wrap(<ActionGrid actions={ACTIONS} onPress={onPress} disabledReason="You're offline" />));

      // Every button is off, and one caption under the grid says why
      for (const button of buttons()) {
        expect(button.props.accessibilityState).toMatchObject({ disabled: true });
        expect(button).toHaveStyle({ opacity: 0.5 });

        await fireEvent.press(button);
      }

      expect(onPress).not.toHaveBeenCalled();
      expect(screen.getAllByText("You're offline")).toHaveLength(1);
      expect(screen.getByText("You're offline")).toHaveStyle({
        color: lightColors.textMuted,
        fontSize: typography.caption.fontSize,
        textAlign: 'center',
      });
    });

    it('an action can be off on its own, without a caption', async () => {
      const onPress = jest.fn();
      await render(
        wrap(
          <ActionGrid
            actions={[
              { key: 'start', label: 'Start', icon: 'power', disabled: true },
              { key: 'reboot', label: 'Reboot', icon: 'restart' },
            ]}
            onPress={onPress}
          />,
        ),
      );

      await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Reboot' }));

      expect(screen.getByRole('button', { name: 'Start' }).props.accessibilityState).toMatchObject({ disabled: true });
      expect(onPress.mock.calls).toEqual([['reboot']]);
    });

    it('a note says why some buttons are off, and turns none off itself', async () => {
      const onPress = jest.fn();
      await render(
        wrap(
          <ActionGrid
            actions={[
              { key: 'poweron', label: 'Power on', icon: 'power' },
              { key: 'reboot', label: 'Reboot', icon: 'restart', disabled: true },
            ]}
            onPress={onPress}
            note="The server is stopped"
          />,
        ),
      );

      // The same caption as a disabled reason: once, centred, muted, under the grid
      expect(screen.getByText('The server is stopped')).toHaveStyle({
        color: lightColors.textMuted,
        fontSize: typography.caption.fontSize,
        textAlign: 'center',
      });
      expect(screen.getByRole('button', { name: 'Reboot' }).props.accessibilityState).toMatchObject({ disabled: true });

      await fireEvent.press(screen.getByRole('button', { name: 'Power on' }));

      expect(onPress.mock.calls).toEqual([['poweron']]);
    });

    it('offline, the disabled reason is said instead of the note: one caption', async () => {
      await render(
        wrap(
          <ActionGrid
            actions={[
              { key: 'poweron', label: 'Power on', icon: 'power' },
              { key: 'reboot', label: 'Reboot', icon: 'restart', disabled: true },
            ]}
            onPress={jest.fn()}
            disabledReason="You're offline"
            note="The server is stopped"
          />,
        ),
      );

      expect(screen.getByText("You're offline")).toBeOnTheScreen();
      expect(screen.queryByText('The server is stopped')).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Power on' }).props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    it('while an action runs, its button spins and every button waits', async () => {
      const onPress = jest.fn();
      await render(wrap(<ActionGrid actions={ACTIONS} onPress={onPress} busyKey="reboot" />));
      const running = screen.getByRole('button', { name: 'Reboot' });

      expect(running.props.accessibilityState).toMatchObject({ busy: true });
      expect(within(running).getByTestId('button-spinner')).toBeOnTheScreen();
      // Waiting isn't unavailable: the others are off but say no reason
      expect(screen.queryByText("You're offline")).not.toBeOnTheScreen();

      for (const button of buttons()) {
        expect(button.props.accessibilityState).toMatchObject({ disabled: true });

        await fireEvent.press(button);
      }

      expect(onPress).not.toHaveBeenCalled();
    });

    it('ActionGrid puts one button per row at accessibility text sizes', async () => {
      // iOS's largest normal size is 1.353 in React Native, Android's 130%: still two per row
      for (const normal of [1.3, 1.353]) {
        withTextSize(normal);
        const { unmount } = await render(wrap(<ActionGrid actions={ACTIONS} onPress={jest.fn()} />));

        expect(style((buttons()[0] as { parent: unknown }).parent)).toMatchObject({ flexDirection: 'row' });

        await unmount();
      }

      // AX1 is 1.786, Android's 150%: one per row, so "Power off" never breaks mid-word
      for (const accessibility of [accessibilityTextScale + 0.1, 1.786]) {
        withTextSize(accessibility);
        const { unmount } = await render(wrap(<ActionGrid actions={ACTIONS} onPress={jest.fn()} />));
        const all = buttons();
        const column = (all[0] as { parent: unknown }).parent;

        expect(style(column).flexDirection).toBe('column');

        for (const button of all) {
          expect((button as { parent: unknown }).parent).toBe(column);
          // Each already fills the width: no flex, which would stretch it in height
          expect(style(button).flex).toBeUndefined();
          expect(within(button).getByTestId('button-pill')).toHaveStyle({ minHeight: sizes.buttonMd });
        }

        expect(screen.queryByTestId('action-grid-spacer', { includeHiddenElements: true })).not.toBeOnTheScreen();

        await unmount();
      }
    });
  });
});
