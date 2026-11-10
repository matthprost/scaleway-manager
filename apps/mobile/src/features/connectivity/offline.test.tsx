import { lightColors } from '@scaleway-manager/ui';
import { onlineManager } from '@tanstack/react-query';
import { act, screen } from '@testing-library/react-native';

import { createServices } from '../../wiring/services';
import { renderWithApp } from '../../test-utils/renderWithApp';
import { OfflineIndicator } from './OfflineIndicator';

afterEach(() => {
  jest.useRealTimers();
});

test('shows the last update time when offline', async () => {
  const { queryClient } = await renderWithApp(<OfflineIndicator />, { online: false });

  await act(async () => {
    queryClient.setQueryData(['x'], 1, { updatedAt: new Date(2026, 10, 5, 10, 42).getTime() });
  });

  expect(screen.getByText("You're offline · showing data from 10:42")).toBeOnTheScreen();
});

test('shows only "You\'re offline" when there is no data yet', async () => {
  await renderWithApp(<OfflineIndicator />, { online: false });

  expect(screen.getByText("You're offline")).toBeOnTheScreen();
  // White words on the dark notice pill
  expect(screen.getByTestId('pill')).toHaveStyle({ backgroundColor: lightColors.inverseBadge });
  expect(screen.getByText("You're offline")).toHaveStyle({ color: lightColors.onBadge });
});

test('shows Back online for 2 seconds after reconnecting', async () => {
  // Render and subscribe with real timers; only the 2 seconds are faked.
  await renderWithApp(<OfflineIndicator />, { online: false });
  await act(async () => {});
  jest.useFakeTimers();

  await act(async () => {
    onlineManager.setOnline(true);
  });

  expect(screen.getByText('Back online')).toBeOnTheScreen();
  // White words on the darker green
  expect(screen.getByTestId('pill')).toHaveStyle({ backgroundColor: lightColors.successBadge });
  expect(screen.getByText('Back online')).toHaveStyle({ color: lightColors.onBadge });

  await act(async () => {
    jest.advanceTimersByTime(1999);
  });

  expect(screen.getByText('Back online')).toBeOnTheScreen();

  await act(async () => {
    jest.advanceTimersByTime(1);
  });

  expect(screen.queryByText('Back online')).toBeNull();
  expect(screen.queryByText(/You're offline/)).toBeNull();
});

test('shows nothing in demo mode', async () => {
  await renderWithApp(<OfflineIndicator />, { online: false, services: createServices('demo') });

  expect(screen.queryByText(/You're offline/)).toBeNull();
});
