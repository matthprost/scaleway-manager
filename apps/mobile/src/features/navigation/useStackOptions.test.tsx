import { render, screen } from '@testing-library/react-native';
import { Text, ThemeProvider } from '@scaleway-manager/ui';

import { useStackOptions } from './useStackOptions';

// Shows the options as text, so the test can read them back
function Probe() {
  return (
    <Text variant="caption">
      {JSON.stringify(useStackOptions())}
    </Text>
  );
}

test('no native header, and iOS never draws its own band at the screen edges', async () => {
  await render(
    <ThemeProvider preference="dark">
      <Probe />
    </ThemeProvider>,
  );
  const options = JSON.parse(String(screen.getByText(/headerShown/).props.children)) as Record<string, unknown>;

  expect(options.headerShown).toBe(false);
  // iOS 27 shows the "automatic" edge effect as an opaque band with a line under the status bar
  expect(options.scrollEdgeEffects).toEqual({ top: 'hidden', bottom: 'hidden', left: 'hidden', right: 'hidden' });
});
