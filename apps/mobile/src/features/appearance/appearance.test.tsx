import { DEFAULT_PREFERENCES } from '@scaleway-manager/core';
import type { Preferences } from '@scaleway-manager/core';
import { Button, Text, useTheme } from '@scaleway-manager/ui';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { renderWithApp } from '../../test-utils/renderWithApp';
import { createServices } from '../../wiring/services';
import { AppearanceProvider, useSetAppearance } from './AppearanceProvider';

// What the theme is, and a way to pick dark, as Account's sheet does
function Probe() {
  const { scheme } = useTheme();
  const setAppearance = useSetAppearance();

  return (
    <>
      <Text variant="body">{`Theme ${scheme}`}</Text>

      <Button label="Dark" size="md" onPress={() => setAppearance('dark')} />
    </>
  );
}

test('the saved appearance is read once at launch and applied', async () => {
  const services = createServices('demo');
  await services.preferences.update({ appearance: 'dark' });
  const read = jest.spyOn(services.preferences, 'read');
  await renderWithApp(
    <AppearanceProvider>
      <Probe />
    </AppearanceProvider>,
    { services },
  );

  expect(await screen.findByText('Theme dark')).toBeOnTheScreen();
  expect(read).toHaveBeenCalledTimes(1);
});

test('a choice made before the saved one is read wins over that late read', async () => {
  const services = createServices('demo');
  let answer: (saved: Preferences) => void = () => {};
  jest.spyOn(services.preferences, 'read').mockReturnValue(
    new Promise((resolve) => {
      answer = resolve;
    }),
  );
  await renderWithApp(
    <AppearanceProvider>
      <Probe />
    </AppearanceProvider>,
    { services },
  );

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Dark' }));
  });

  expect(screen.getByText('Theme dark')).toBeOnTheScreen();

  // The launch read answers late, with what was saved before the pick
  await act(async () => {
    answer({ ...DEFAULT_PREFERENCES, appearance: 'light' });
  });

  expect(screen.getByText('Theme dark')).toBeOnTheScreen();
});
