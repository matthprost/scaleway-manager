import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { ThemeProvider } from '../theme';
import { lightColors, typography } from '../tokens';
import { SpendingSummary, spendingSummaryHeight } from './SpendingSummary';

function wrap(children: ReactNode) {
  return <ThemeProvider preference="light">{children}</ThemeProvider>;
}

// The phone's text size, read when the summary first draws
const atTextSize = (fontScale: number) =>
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 390, height: 844, scale: 3, fontScale });

const style = (element: { props: { style?: unknown } }): TextStyle =>
  StyleSheet.flatten(element.props.style as StyleProp<TextStyle>) ?? {};

const NOVEMBER = {
  label: 'Spent in November so far',
  amount: '€84.60',
  comparison: { title: 'October', value: '€141.20' },
  scope: 'All projects in Acme',
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SpendingSummary', () => {
  it('shows the label, the big amount with its comparison at the end of its row, then who it covers', async () => {
    atTextSize(1);
    await render(wrap(<SpendingSummary {...NOVEMBER} />));

    expect(screen.getByText('Spent in November so far')).toHaveStyle({ ...typography.subhead, color: lightColors.onBrand });
    expect(screen.getByText('€84.60')).toHaveStyle({ fontSize: typography.display.fontSize, color: lightColors.onBrand });
    expect(screen.getByText('October')).toHaveStyle({ fontSize: typography.caption.fontSize, textAlign: 'right' });
    expect(screen.getByText('€141.20')).toHaveStyle({ fontSize: typography.headline.fontSize, textAlign: 'right' });
    expect(screen.getByText('All projects in Acme')).toHaveStyle({ fontSize: typography.caption.fontSize });
    // Side by side, lined up at the bottom; when the line is full (a big amount at a large text size) the
    // comparison drops under the amount instead of running off the screen
    expect(screen.getByTestId('spending-figures')).toHaveStyle({
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    });
  });

  it('keeps the amount on one line: it shrinks just enough instead of breaking in the middle', async () => {
    atTextSize(3.5);
    await render(wrap(<SpendingSummary {...NOVEMBER} amount="€12,345.67" />));
    const amount = screen.getByText('€12,345.67');

    expect(amount.props.numberOfLines).toBe(1);
    expect(amount.props.adjustsFontSizeToFit).toBe(true);
  });

  it('puts the comparison under the amount at accessibility text sizes', async () => {
    atTextSize(2);
    await render(wrap(<SpendingSummary {...NOVEMBER} />));

    expect(screen.getByTestId('spending-figures')).toHaveStyle({ flexDirection: 'column', alignItems: 'flex-start' });
    expect(style(screen.getByText('October')).textAlign).toBeUndefined();
  });

  it('says a sign in words to screen readers', async () => {
    atTextSize(1);
    await render(
      wrap(
        <SpendingSummary
          {...NOVEMBER}
          comparison={{ title: 'vs August', value: '—', valueLabel: 'Nothing to compare' }}
        />,
      ),
    );

    expect(screen.getByText('—').props.accessibilityLabel).toBe('Nothing to compare');
  });

  it('while loading, draws placeholders in the shapes of the amount, its comparison and the last line', async () => {
    for (const fontScale of [1, 2]) {
      const mock = atTextSize(fontScale);
      const { unmount } = await render(
        wrap(<SpendingSummary label="Spent in November so far" amount={null} comparison={null} scope={null} />),
      );
      const [amount, title, value, scope] = screen.getAllByTestId('skeleton');

      // The label is known before the amounts
      expect(screen.getByText('Spent in November so far')).toBeOnTheScreen();
      expect(amount).toHaveStyle({ height: typography.display.lineHeight * fontScale });
      expect(title).toHaveStyle({ height: typography.caption.lineHeight * fontScale });
      expect(value).toHaveStyle({ height: typography.headline.lineHeight * fontScale });
      expect(scope).toHaveStyle({ height: typography.caption.lineHeight * fontScale });
      // The same layout as the amounts it stands for, so nothing jumps when they arrive
      expect(screen.getByTestId('spending-figures')).toHaveStyle({ flexDirection: fontScale > 1.4 ? 'column' : 'row' });

      await unmount();
      mock.mockRestore();
    }
  });

  it('spendingSummaryHeight counts its lines at the text size', () => {
    // The label, the amount (its comparison is shorter beside it), the last line
    expect(spendingSummaryHeight(1)).toBe(18 + 40 + 14);
    // At accessibility sizes the comparison's two lines go under the amount
    expect(spendingSummaryHeight(2)).toBe((18 + 40 + 14 + 22 + 14) * 2);
  });
});
