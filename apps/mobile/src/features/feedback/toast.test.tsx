import { Button } from '@scaleway-manager/ui';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { renderWithApp } from '../../test-utils/renderWithApp';
import { createServices } from '../../wiring/services';
import { useToast } from './useToast';

function AddKey({ message }: { message: string }) {
  const toast = useToast();

  return <Button label={`Show ${message}`} size="md" onPress={() => toast(message)} />;
}

// Hidden, the toast is out of screen readers' reach, so queries must look at hidden elements too.
const hidden = { includeHiddenElements: true };

const toast = () => screen.getByTestId('toast', hidden);

const press = async (name: string) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
};

const wait = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('useToast shows the message for 2 seconds, and keeps it while it fades out', async () => {
  await renderWithApp(<AddKey message="SSH key added" />, { services: createServices('demo') });

  // One toast, hidden until something succeeds
  expect(screen.getAllByTestId('toast', hidden)).toHaveLength(1);
  expect(toast().props.accessibilityElementsHidden).toBe(true);

  await press('Show SSH key added');

  expect(toast().props.accessibilityElementsHidden).toBe(false);
  expect(screen.getByText('SSH key added')).toBeOnTheScreen();

  await wait(1999);

  expect(toast().props.accessibilityElementsHidden).toBe(false);

  await wait(1);

  expect(toast().props.accessibilityElementsHidden).toBe(true);
  expect(screen.getByText('SSH key added', hidden)).toBeOnTheScreen();
});

test('a new message replaces the one showing and gets its own 2 seconds', async () => {
  await renderWithApp(
    <>
      <AddKey message="SSH key added" />

      <AddKey message="SSH key deleted" />
    </>,
    { services: createServices('demo') },
  );

  await press('Show SSH key added');
  await wait(1500);
  await press('Show SSH key deleted');

  expect(screen.queryByText('SSH key added')).not.toBeOnTheScreen();
  expect(screen.getByText('SSH key deleted')).toBeOnTheScreen();

  await wait(1999);

  expect(toast().props.accessibilityElementsHidden).toBe(false);

  await wait(1);

  expect(toast().props.accessibilityElementsHidden).toBe(true);
});
