import { formatDay, formatTime } from '@scaleway-manager/core';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';

import { renderWithApp } from '../../../test-utils/renderWithApp';
import { createServices } from '../../../wiring/services';
import type { Services } from '../../../wiring/services';
import { LockProvider } from '../../lock/LockProvider';
import { ServerlessDetail } from './ServerlessDetail';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));

const NOW = new Date('2026-11-07T12:00:00Z');
const URL = 'https://frontend-acme.functions.fnc.fr-par.scw.cloud';

// The demo (signed in, no network), with its own empty phone storage. Its clock is the fake system clock.
const demo = (): Services => {
  const saved = new Map<string, string>();

  return createServices('demo', {
    kv: {
      getItem: async (key) => saved.get(key) ?? null,
      setItem: async (key, value) => {
        saved.set(key, value);
      },
      removeItem: async (key) => {
        saved.delete(key);
      },
    },
  });
};

let services = demo();

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  services = demo();
  onlineManager.setOnline(true);
  jest.mocked(WebBrowser.openBrowserAsync).mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  onlineManager.setOnline(true);
});

// Let the queries finish inside act
const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

const open = async (product: 'containers' | 'functions', id: string) => {
  await renderWithApp(
    <LockProvider>
      <ServerlessDetail product={product} locality="fr-par" id={id} />
    </LockProvider>,
    { services },
  );
  await settle();
};

// The demo's ready container, and its function whose last deployment failed
const openContainer = () => open('containers', 'demo-frontend');
const openFailedFunction = () => open('functions', 'demo-resize-images');

const press = async (name: string) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
  await settle();
};

const sheet = () => within(screen.getByTestId('sheet-content'));

test('failed function shows its error', async () => {
  await openFailedFunction();

  expect(screen.getByLabelText('Serverless function · fr-par, Error')).toBeOnTheScreen();
  expect(screen.getByLabelText('Alert, Last deployment failed, Build failed: missing handler')).toBeOnTheScreen();
});

test('a working container has no notice', async () => {
  await openContainer();

  expect(screen.getByLabelText('Serverless container · fr-par, Ready')).toBeOnTheScreen();
  expect(screen.queryByText('Last deployment failed')).not.toBeOnTheScreen();
});

test('redeploy asks first', async () => {
  const redeploy = jest.spyOn(services.serverless, 'redeploy');
  await openContainer();
  await press('Redeploy');

  expect(sheet().getByText('Redeploy frontend?')).toBeOnTheScreen();
  expect(
    sheet().getByText('Scaleway rebuilds and restarts it. It may be unavailable for a few seconds.'),
  ).toBeOnTheScreen();
  expect(redeploy).not.toHaveBeenCalled();

  // Two taps in the same frame send it once
  await act(async () => {
    const confirm = sheet().getByRole('button', { name: 'Redeploy' });
    fireEvent.press(confirm);
    fireEvent.press(confirm);
  });
  await settle();

  expect(redeploy).toHaveBeenCalledTimes(1);
  expect(redeploy).toHaveBeenCalledWith('fr-par', 'container', 'demo-frontend');
  expect(screen.getByText('Redeploy requested')).toBeOnTheScreen();
  // Scaleway deploys it again, and the screen follows until it's ready
  expect(screen.getByLabelText('Serverless container · fr-par, Deploying…')).toBeOnTheScreen();

  await act(async () => {
    await jest.advanceTimersByTimeAsync(9_000);
  });

  expect(screen.getByLabelText('Serverless container · fr-par, Ready')).toBeOnTheScreen();
});

test('cancelling the redeploy sends nothing', async () => {
  const redeploy = jest.spyOn(services.serverless, 'redeploy');
  await openContainer();
  await press('Redeploy');
  await act(async () => {
    fireEvent.press(sheet().getByRole('button', { name: 'Cancel' }));
  });
  await settle();

  expect(redeploy).not.toHaveBeenCalled();
  expect(screen.queryByText('Redeploy requested')).not.toBeOnTheScreen();
});

test('offline, Redeploy is off and says why', async () => {
  services = { ...demo(), mode: 'real' };
  const redeploy = jest.spyOn(services.serverless, 'redeploy');
  await openContainer();
  await act(async () => {
    onlineManager.setOnline(false);
  });

  expect(screen.getByRole('button', { name: 'Redeploy' })).toBeDisabled();
  expect(screen.getByText("You're offline")).toBeOnTheScreen();
  expect(redeploy).not.toHaveBeenCalled();
});

test('a container that is deploying keeps Redeploy, turned off, and says why', async () => {
  const app = await demo().serverless.get('fr-par', 'container', 'demo-frontend');
  jest.spyOn(services.serverless, 'get').mockResolvedValue({ ...app, status: 'updating' });
  await openContainer();

  expect(screen.getByRole('button', { name: 'Redeploy' })).toBeDisabled();
  expect(screen.getByText('Wait until the container is ready')).toBeOnTheScreen();
});

test("a locked function keeps Redeploy, turned off, and says it can't run now", async () => {
  const app = await demo().serverless.get('fr-par', 'function', 'demo-resize-images');
  jest.spyOn(services.serverless, 'get').mockResolvedValue({ ...app, status: 'locked' });
  await openFailedFunction();

  expect(screen.getByRole('button', { name: 'Redeploy' })).toBeDisabled();
  expect(screen.getByText('Not available right now')).toBeOnTheScreen();
});

test('open in browser uses the domain', async () => {
  await openContainer();

  expect(screen.getByLabelText(`URL, ${URL}`)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Copy URL' })).toBeOnTheScreen();

  await press('Open in browser');

  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(URL);
});

test("a browser that can't open says so", async () => {
  jest.mocked(WebBrowser.openBrowserAsync).mockRejectedValueOnce(new Error('No browser'));
  await openContainer();
  await press('Open in browser');

  expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();
});

test('a container shows its image and when it was updated', async () => {
  const updated = new Date(NOW.getTime() - 3 * 86_400_000);
  await openContainer();

  expect(screen.getByLabelText('Image, rg.fr-par.scw.cloud/acme/frontend:latest')).toBeOnTheScreen();
  expect(screen.getByLabelText(`Updated, ${formatDay(updated)} · ${formatTime(updated)}`)).toBeOnTheScreen();
});

test('a function with no URL shows its runtime, and no URL rows', async () => {
  await openFailedFunction();

  expect(screen.getByLabelText('Runtime, python313')).toBeOnTheScreen();
  expect(screen.queryByText('URL')).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Open in browser' })).not.toBeOnTheScreen();
});
