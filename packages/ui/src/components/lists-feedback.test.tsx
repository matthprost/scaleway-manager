import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ComponentProps, ReactNode } from 'react';
import { Dimensions, processColor, StyleSheet } from 'react-native';
import { useReducedMotion, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../theme';
import { contrastRatio, darkColors, lightColors, spacing, typography } from '../tokens';
import type { ThemeColors } from '../tokens';
import { EmptyState } from './EmptyState';
import { HeaderBackground } from './HeaderBackground';
import { ListRow } from './ListRow';
import { Pill } from './Pill';
import { Section } from './Section';
import { Skeleton } from './Skeleton';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
  withRepeat: jest.fn(jest.requireActual('react-native-reanimated').withRepeat),
  withTiming: jest.fn(jest.requireActual('react-native-reanimated').withTiming),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

type PillTone = ComponentProps<typeof Pill>['tone'];

// Each Pill tone's background; the words on every one are white (onBadge).
// It mirrors Pill's own map on purpose, to pin the contract: change both together.
const PILL_BACKGROUNDS = {
  inverse: 'inverseBadge',
  success: 'successBadge',
  warning: 'warningBadge',
  neutral: 'neutralBadge',
  danger: 'dangerBadge',
  // Busy: the same purple as its dot
  brand: 'primaryButton',
} as const satisfies Record<PillTone, keyof ThemeColors>;

// What a finger does before it lifts: Pressable shows its pressed look
const touch = { persist: () => {}, nativeEvent: { timestamp: 0, touches: [], changedTouches: [] } };

function wrap(children: ReactNode, preference: 'light' | 'dark' = 'light') {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider preference={preference}>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('lists and feedback', () => {
  it('switch row calls onValueChange with the new value', async () => {
    const onValueChange = jest.fn();
    await render(
      wrap(
        <ListRow
          title="Notifications"
          trailing={{ type: 'switch', value: false, onValueChange }}
        />,
      ),
    );
    await fireEvent(screen.getByRole('switch'), 'valueChange', true);

    expect(onValueChange).toHaveBeenCalledWith(true);
    // Centred in its row: React Native's own Switch style pins it to the top
    expect(screen.getByRole('switch')).toHaveStyle({ alignSelf: 'center' });
  });

  it('chevron row with onPress is a button', async () => {
    const onPress = jest.fn();
    await render(
      wrap(<ListRow title="Account" trailing={{ type: 'chevron' }} onPress={onPress} />),
    );
    const row = screen.getByRole('button');
    await fireEvent.press(row);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('destructive row uses the danger tone', async () => {
    await render(wrap(<ListRow title="Log out" destructive onPress={jest.fn()} />));

    expect(screen.getByText('Log out')).toHaveStyle({ color: lightColors.alertText });
  });

  it('subtitleTone danger draws only the subtitle in the danger tone (a failed event), in light and dark', async () => {
    const row = (
      <ListRow
        title="Delete snapshot"
        subtitle="Someone else · Instances · Failed"
        subtitleTone="danger"
        trailing={{ type: 'text', text: '18:12' }}
      />
    );
    const { rerender } = await render(wrap(row));

    expect(screen.getByText('Someone else · Instances · Failed')).toHaveStyle({ color: lightColors.alertText });
    expect(screen.getByText('Delete snapshot')).toHaveStyle({ color: lightColors.text });
    expect(screen.getByText('18:12')).toHaveStyle({ color: lightColors.textMuted });
    // Still one phrase for screen readers, words included
    expect(screen.getByLabelText('Delete snapshot, Someone else · Instances · Failed, 18:12')).toBeOnTheScreen();

    await rerender(wrap(row, 'dark'));

    expect(screen.getByText('Someone else · Instances · Failed')).toHaveStyle({ color: darkColors.alertText });
  });

  it('Section loading shows three placeholder rows, each a body line above a subhead line, between dividers', async () => {
    const { fontScale } = Dimensions.get('window');
    await render(wrap(<Section title="Invoices" loading />));
    const skeletons = screen.getAllByTestId('skeleton');
    const heights = skeletons.map((skeleton) => Object.assign({}, ...[skeleton.props.style].flat(Infinity).filter(Boolean)).height);

    expect(screen.getByRole('header', { name: 'Invoices' })).toBeOnTheScreen();
    expect(heights).toEqual(
      [0, 1, 2].flatMap(() => [typography.body.lineHeight * fontScale, typography.subhead.lineHeight * fontScale]),
    );
    // Each placeholder is about a row's height, and the rows are divided like real ones
    expect(screen.getAllByTestId('row-placeholder')).toHaveLength(3);
    expect(screen.getAllByTestId('row-placeholder')[0]).toHaveStyle({ minHeight: 52 });
    expect(screen.getAllByTestId('section-divider')).toHaveLength(2);
  });

  it('Section loading can draw fewer placeholder rows, above the rows already known', async () => {
    await render(
      wrap(
        <Section title="Organization" loading="one">
          <ListRow title="Switch organization" trailing={{ type: 'chevron' }} onPress={jest.fn()} />
        </Section>,
      ),
    );
    const tree = JSON.stringify(screen.toJSON());

    expect(screen.getAllByTestId('row-placeholder')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Switch organization' })).toBeOnTheScreen();
    // The placeholder first, then the known row, divided like real rows
    expect(tree.indexOf('row-placeholder')).toBeLessThan(tree.indexOf('Switch organization'));
    expect(screen.getAllByTestId('section-divider')).toHaveLength(1);
  });

  it('a row that opens something can show its value before the chevron (Project › Production)', async () => {
    const onPress = jest.fn();
    const strokes = () => JSON.stringify(screen.toJSON()).match(/"stroke"/g)?.length ?? 0;
    const { rerender } = await render(wrap(<ListRow title="Project" trailing={{ type: 'text', text: 'Production' }} />));
    const valueOnly = strokes();

    await rerender(wrap(<ListRow title="Project" trailing={{ type: 'chevron', text: 'Production' }} onPress={onPress} />));
    const row = screen.getByRole('button', { name: 'Project, Production' });

    // The value, muted at the end like any value, then the chevron
    expect(screen.getByText('Production')).toHaveStyle({ color: lightColors.textMuted, textAlign: 'right' });
    expect(strokes()).toBeGreaterThan(valueOnly);

    await fireEvent.press(row);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a row that opens something outside the app says so, to the eye and to screen readers', async () => {
    const onPress = jest.fn();
    const strokes = () => JSON.stringify(screen.toJSON()).match(/"stroke"/g)?.length ?? 0;
    const { rerender } = await render(wrap(<ListRow title="Source code on GitHub" onPress={onPress} />));
    const plain = strokes();

    await rerender(wrap(<ListRow title="Source code on GitHub" trailing={{ type: 'external' }} onPress={onPress} />));
    const row = screen.getByRole('button', { name: 'Source code on GitHub' });

    // A mark at the end of the row, and a hint for screen readers
    expect(strokes()).toBeGreaterThan(plain);
    expect(JSON.stringify(screen.toJSON())).toContain(`"stroke":"${lightColors.textMuted}"`);
    expect(row.props.accessibilityHint).toBe('Opens in your browser');

    await fireEvent.press(row);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a row whose tap does something its words do not say has a hint (a run that can be stopped)', async () => {
    const onPress = jest.fn();
    await render(
      wrap(
        <ListRow
          title="7 Nov 12:00"
          subtitle="Running for 12 min"
          trailing={{ type: 'status', label: 'Running…', health: 'busy' }}
          accessibilityHint="Asks if you want to stop this run"
          onPress={onPress}
        />,
      ),
    );
    const row = screen.getByRole('button', { name: '7 Nov 12:00, Running for 12 min, Running…' });

    expect(row.props.accessibilityHint).toBe('Asks if you want to stop this run');

    await fireEvent.press(row);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("a count is heard in the words given for it, and shown as it is (a product's count)", async () => {
    await render(
      wrap(
        <ListRow
          title="Instances"
          subtitle="2 OK · 1 stopped"
          trailing={{ type: 'chevron', text: '3', spokenText: '3 resources' }}
          onPress={jest.fn()}
        />,
      ),
    );

    expect(screen.getByRole('button', { name: 'Instances, 2 OK · 1 stopped, 3 resources' })).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('a subtitle is muted unless it says something went wrong', async () => {
    await render(wrap(<ListRow title="Stop server" subtitle="You · Instances" />));

    expect(screen.getByText('You · Instances')).toHaveStyle({ color: lightColors.textMuted });
  });

  it('Pill shows its label', async () => {
    await render(wrap(<Pill label="Running" tone="success" />));

    expect(screen.getByText('Running')).toBeTruthy();
  });

  it('EmptyState action button is md', async () => {
    await render(
      wrap(
        <EmptyState
          icon="layers"
          title="Nothing here"
          action={{ label: 'Retry', onPress: jest.fn() }}
        />,
      ),
    );

    expect(within(screen.getByRole('button', { name: 'Retry' })).getByTestId('button-pill')).toHaveStyle({
      minHeight: 48,
    });
  });

  it("an EmptyState's action can carry a note right under its button (You're offline), at one fixed gap", async () => {
    const { rerender } = await render(
      wrap(
        <EmptyState
          icon="alert"
          title="Couldn't load your invoices"
          action={{ label: 'Try again', onPress: jest.fn(), disabled: true, note: "You're offline" }}
        />,
      ),
    );
    const action = screen.getByTestId('empty-state-action');

    // The button and its note together, 8 pt apart on every screen
    expect(action).toHaveStyle({ gap: spacing.xs });
    expect(within(action).getByRole('button', { name: 'Try again' })).toBeDisabled();
    expect(within(action).getByText("You're offline")).toHaveStyle({
      color: lightColors.textMuted,
      textAlign: 'center',
      fontSize: typography.caption.fontSize,
    });

    await rerender(
      wrap(
        <EmptyState icon="alert" title="Couldn't load your invoices" action={{ label: 'Try again', onPress: jest.fn() }} />,
      ),
    );

    expect(screen.queryByText("You're offline")).not.toBeOnTheScreen();
  });

  it('EmptyState centres its title and message, even when they wrap', async () => {
    await render(
      wrap(
        <EmptyState
          icon="layers"
          title="Coming soon"
          message="Your resources arrive in the next update, with every server and database."
        />,
      ),
    );

    expect(screen.getByText('Coming soon')).toHaveStyle({ textAlign: 'center' });
    expect(screen.getByText(/Your resources arrive/)).toHaveStyle({ textAlign: 'center' });
  });

  it('a pressable row dims to 80% while pressed', async () => {
    await render(wrap(<ListRow title="Account" trailing={{ type: 'chevron' }} onPress={jest.fn()} />));
    const row = screen.getByRole('button', { name: 'Account' });

    expect(row).toHaveStyle({ opacity: 1 });

    await fireEvent(row, 'responderGrant', touch);

    expect(row).toHaveStyle({ opacity: 0.8 });
  });

  it("a disabled row fades to 50% and doesn't press", async () => {
    const onPress = jest.fn();
    await render(wrap(<ListRow title="Reboot" subtitle="You're offline" onPress={onPress} disabled />));
    const row = screen.getByRole('button', { name: "Reboot, You're offline" });
    await fireEvent(row, 'responderGrant', touch);
    await fireEvent.press(row);

    expect(row).toHaveStyle({ opacity: 0.5 });
    expect(onPress).not.toHaveBeenCalled();
  });

  it('HeaderBackground uses the theme gradient', async () => {
    await render(wrap(<HeaderBackground minHeight={200} />));

    // The jest-expo mock turns colour strings into numbers
    expect(screen.getByTestId('header-gradient').props.colors).toEqual(
      lightColors.headerGradient.map((color) => processColor(color)),
    );
  });

  it('Pill: a long label wraps inside the pill, next to its icon', async () => {
    const label = "You're offline · showing data from 10:42";
    await render(wrap(<Pill tone="inverse" icon="wifi-off" label={label} />));

    // The label may shrink, so it wraps before the pill's edge instead of running past it
    expect(screen.getByText(label).parent).toHaveStyle({ flexShrink: 1 });
  });

  it.each(Object.keys(PILL_BACKGROUNDS) as PillTone[])(
    'Pill %s: white words and icon on a colour dark enough for them, in light and dark',
    async (tone) => {
      for (const [preference, colors] of [
        ['light', lightColors],
        ['dark', darkColors],
      ] as const) {
        const background = colors[PILL_BACKGROUNDS[tone]];
        const { unmount } = await render(wrap(<Pill label="Some status" tone={tone} icon="check" />, preference));

        expect(screen.getByTestId('pill')).toHaveStyle({ backgroundColor: background });
        expect(screen.getByText('Some status')).toHaveStyle({ color: colors.onBadge });
        expect(JSON.stringify(screen.toJSON())).toContain(`"stroke":"${colors.onBadge}"`);
        expect(contrastRatio(colors.onBadge, background)).toBeGreaterThanOrEqual(4.5);

        await unmount();
      }
    },
  );

  it.each(Object.keys(PILL_BACKGROUNDS) as PillTone[])(
    'Pill %s: only the inverse pill has an edge, and every pill keeps the same size',
    async (tone) => {
      await render(wrap(<Pill label="Some status" tone={tone} />, 'dark'));
      const pill = StyleSheet.flatten(screen.getByTestId('pill').props.style);
      const edge = tone === 'inverse' ? 1 : 0;

      expect(pill).toMatchObject({ borderWidth: edge, borderColor: darkColors.inverseBadgeEdge });
      // The edge sits inside the pill: its padding gives the room back
      expect(pill.paddingVertical + pill.borderWidth).toBe(spacing.xxs);
      expect(pill.paddingHorizontal + pill.borderWidth).toBe(spacing.xs);
    },
  );

  describe('Skeleton', () => {
    afterEach(() => {
      jest.mocked(useReducedMotion).mockReturnValue(false);
      jest.mocked(withRepeat).mockClear();
      jest.mocked(withTiming).mockClear();
    });

    it('animates when Reduce Motion is off', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(false);
      await render(wrap(<Skeleton width={100} height={16} />));

      expect(withRepeat).toHaveBeenCalled();
      expect(withTiming).toHaveBeenCalled();
    });

    it('is one line of body text high by default, so screens pass no number', async () => {
      const { fontScale } = Dimensions.get('window');
      await render(wrap(<Skeleton width="100%" />));

      // Grows with the phone's text size, like the line it stands for
      expect(screen.getByTestId('skeleton')).toHaveStyle({
        width: '100%',
        height: typography.body.lineHeight * fontScale,
      });
    });

    it('variant stands for one line of another text style, grown with the text size, so screens pass no number', async () => {
      const { fontScale } = Dimensions.get('window');
      await render(
        wrap(
          <>
            <Skeleton width="100%" variant="display" />

            <Skeleton width="100%" variant="caption" />
          </>,
        ),
      );
      const [amount, note] = screen.getAllByTestId('skeleton');

      expect(amount).toHaveStyle({ height: typography.display.lineHeight * fontScale });
      expect(note).toHaveStyle({ height: typography.caption.lineHeight * fontScale });
    });

    it('tone onBrand is a soft white made for purple, in light and dark', async () => {
      for (const [preference, colors] of [
        ['light', lightColors],
        ['dark', darkColors],
      ] as const) {
        const { unmount } = await render(
          wrap(
            <>
              <Skeleton width={100} tone="onBrand" />

              <Skeleton width={100} />
            </>,
            preference,
          ),
        );
        const [onPurple, onPage] = screen.getAllByTestId('skeleton');

        expect(onPurple).toHaveStyle({ backgroundColor: colors.skeletonOnBrand });
        expect(onPage).toHaveStyle({ backgroundColor: colors.divider });

        await unmount();
      }
    });

    it('does not animate with Reduce Motion', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      await render(wrap(<Skeleton width={100} height={16} />));

      expect(withRepeat).not.toHaveBeenCalled();
      expect(withTiming).not.toHaveBeenCalled();
    });
  });
});
