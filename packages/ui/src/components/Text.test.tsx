import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from '../theme';
import { Text } from './Text';

test('passes accessibilityLiveRegion to the native text', async () => {
  await render(
    <ThemeProvider preference="light">
      <Text variant="body" accessibilityLiveRegion="polite">
        Hello
      </Text>
    </ThemeProvider>,
  );

  expect(screen.getByText('Hello').props.accessibilityLiveRegion).toBe('polite');
});

test('align center centres every line, start leaves the natural alignment', async () => {
  await render(
    <ThemeProvider preference="light">
      <Text variant="body" align="center">
        Centred
      </Text>

      <Text variant="body" align="start">
        Start
      </Text>

      <Text variant="body">Default</Text>
    </ThemeProvider>,
  );

  expect(screen.getByText('Centred')).toHaveStyle({ textAlign: 'center' });
  expect(StyleSheet.flatten(screen.getByText('Start').props.style).textAlign).toBeUndefined();
  expect(StyleSheet.flatten(screen.getByText('Default').props.style).textAlign).toBeUndefined();
});

test('bold draws the variant in bold, without changing its size', async () => {
  await render(
    <ThemeProvider preference="light">
      <Text variant="caption" bold>
        Nov
      </Text>

      <Text variant="caption">Oct</Text>
    </ThemeProvider>,
  );

  expect(screen.getByText('Nov')).toHaveStyle({ fontWeight: '700', fontSize: 11 });
  expect(screen.getByText('Oct')).toHaveStyle({ fontWeight: '500' });
});

test('shrinkToFit keeps one line and shrinks it only when it does not fit', async () => {
  await render(
    <ThemeProvider preference="light">
      <Text variant="caption" shrinkToFit>
        ≈ €149.29 by month end
      </Text>

      <Text variant="caption">Spent in November so far</Text>
    </ThemeProvider>,
  );

  expect(screen.getByText('≈ €149.29 by month end').props).toMatchObject({ numberOfLines: 1, adjustsFontSizeToFit: true });
  expect(screen.getByText('Spent in November so far').props.adjustsFontSizeToFit).toBeFalsy();
});
