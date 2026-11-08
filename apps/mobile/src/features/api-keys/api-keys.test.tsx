import { AppError, formatDay } from '@scaleway-manager/core';
import type { ApiKey, BiometricPort } from '@scaleway-manager/core';
import { onlineManager } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { Button } from '@scaleway-manager/ui';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';

import ApiKeys from '../../../app/(tabs)/account/api-keys';
import { renderWithApp } from '../../test-utils/renderWithApp';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { LockProvider } from '../lock/LockProvider';
import { CreateApiKeySheet } from './CreateApiKeySheet';

// Like iOS: a sheet that closes keeps drawing its content while it slides away (out of screen readers' reach),
// so a test can see whether a secret is still in it
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');

  return {
    __esModule: true,
    default: ({ visible, children, onRequestClose, allowSwipeDismissal }: import('react-native').ModalProps) =>
      createElement(
        // A plain host view, with the props the tests look at
        'View',
        {
          testID: 'sheet',
          accessibilityElementsHidden: !visible,
          importantForAccessibility: visible ? 'auto' : 'no-hide-descendants',
          onRequestClose,
          allowSwipeDismissal,
        },
        children,
      ),
  };
});

// 18 November 2026, midday
const NOW = new Date(Date.UTC(2026, 10, 18, 12));

const DAY = 86_400_000;

// The demo's secret for every new key
const SECRET = 'demo-secret-xxxxxxxx';

// The demo's third key
const NEW_ACCESS_KEY = 'SCWDEMO0000000000003';

// What a hidden secret shows
const DOTS = '••••••••••••••••';

let services: Services;
let queryClient: QueryClient;
// The phone's storage
let saved: Map<string, string>;
let now: Date;
const appStateListeners = new Set<(state: AppStateStatus) => void>();

const show = async () => {
  const rendered = await renderWithApp(
    <LockProvider>
      <ApiKeys />
    </LockProvider>,
    { services },
  );
  queryClient = rendered.queryClient;
};

// Shows the screen once the demo's keys are listed
const open = async () => {
  await show();
  await screen.findByText('SCWDEMO00000000000B2');
};

const press = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
};

const type = async (label: string, text: string) => {
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText(label), text);
  });
};

// Fills nothing in: the defaults
const createKey = async () => {
  await press('Create API key');
  await press('Create key');
};

// The question's verb (the sheet's own Close button comes first)
const closeAnyway = async () => {
  const close = screen.getAllByRole('button', { name: 'Close' }).at(-1);
  await act(async () => {
    if (close !== undefined) {
      fireEvent.press(close);
    }
  });
};

// The app's real rules on the demo's data (the Face ID lock runs), with the lock on
const withLockOn = async (authenticate: BiometricPort['authenticate']) => {
  await services.preferences.update({ biometricLock: 'on' });
  services = { ...services, mode: 'real', biometric: { isAvailable: async () => true, authenticate } };
};

// Everything TanStack Query holds: queries and mutations
const cached = () =>
  JSON.stringify([
    queryClient.getQueryCache().getAll().map((query) => query.state),
    queryClient.getMutationCache().getAll().map((mutation) => mutation.state),
  ]);

const goTo = async (state: AppStateStatus) => {
  await act(async () => {
    appStateListeners.forEach((listener) => listener(state));
  });
};

// The demo's data with the real app's rules: the demo itself ignores the network, so offline tests use these
const withRealRules = () => {
  services = { ...services, mode: 'real' };
};

const setOnline = async (online: boolean) => {
  await act(async () => {
    onlineManager.setOnline(online);
  });
};

beforeEach(() => {
  // The demo (no network), on a fixed day, with its own empty phone storage
  saved = new Map<string, string>();
  now = NOW;
  services = createServices('demo', {
    clock: { now: () => now },
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
  appStateListeners.clear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListeners.add(listener);

    return { remove: () => appStateListeners.delete(listener) };
  });
});

afterEach(() => {
  Platform.OS = 'ios';
  jest.restoreAllMocks();
});

test("lists the user's keys", async () => {
  const list = jest.spyOn(services.apiKeys, 'list');
  await open();

  expect(screen.getByRole('header', { name: 'API keys' })).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Scaleway Manager, SCWDEMO00000000000A1, Never expires' }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole('button', {
      name: `Terraform, SCWDEMO00000000000B2, Expires ${formatDay(new Date(NOW.getTime() + 200 * DAY))}`,
    }),
  ).toBeOnTheScreen();
  // The current user's keys, whatever the project
  expect(list.mock.calls).toEqual([['demo-user']]);
});

test('creating a key shows the secret once', async () => {
  await open();
  await press('Create API key');

  expect(screen.getByRole('header', { name: 'Create API key' })).toBeOnTheScreen();

  await type('Description', 'CI deploy key');
  await press('Create key');

  // The same sheet, its second step
  expect(screen.getByRole('header', { name: 'Copy your secret key now' })).toBeOnTheScreen();
  expect(screen.getByText("You won't be able to see it again.")).toBeOnTheScreen();
  expect(screen.getAllByTestId('secret-box').map((box) => within(box).getByText(/./).props.children)).toEqual([
    NEW_ACCESS_KEY,
    SECRET,
  ]);
  // Never cached, not even while it shows: no query or mutation holds the answer
  expect(cached()).not.toContain(SECRET);
  expect(queryClient.getMutationCache().getAll()).toHaveLength(0);

  await press('Done');
  await closeAnyway();

  // Dropped at once: even the sheet sliding away only shows dots
  expect(screen.queryByText(SECRET, { includeHiddenElements: true })).not.toBeOnTheScreen();
  expect(screen.getAllByText(DOTS, { includeHiddenElements: true })).toHaveLength(2);
  // The new key is listed, without its secret
  expect(await screen.findByRole('button', { name: /^CI deploy key, SCWDEMO0000000000003, Expires / })).toBeOnTheScreen();
  expect(cached()).not.toContain(SECRET);
  expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  // Nor saved on the phone
  expect(saved.size).toBeGreaterThan(0);
  expect([...saved.values()].join('\n')).not.toContain(SECRET);

  // Shown once: the next Create starts again with an empty form
  await press('Create API key');

  expect(screen.getByRole('header', { name: 'Create API key' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Description')).toHaveDisplayValue('');
  expect(screen.queryByText(SECRET, { includeHiddenElements: true })).not.toBeOnTheScreen();
});

test('copying the secret uses the clipboard', async () => {
  const copy = jest.spyOn(services.clipboard, 'copy').mockResolvedValue();
  await open();
  await createKey();
  await press('Copy Secret key');

  // As a secret: Android keeps it out of its clipboard preview
  expect(copy).toHaveBeenCalledWith(SECRET, { sensitive: true });
  // Said in place (a toast would sit under the sheet)
  expect(screen.getByRole('button', { name: 'Copied Secret key' })).toBeOnTheScreen();

  await press('Copy Access key');

  expect(copy).toHaveBeenLastCalledWith(NEW_ACCESS_KEY, { sensitive: true });
  expect(screen.getByRole('button', { name: 'Copied Access key' })).toBeOnTheScreen();
});

test('90 days is the default expiry', async () => {
  const create = jest.spyOn(services.apiKeys, 'create');
  await open();
  await press('Create API key');

  expect(screen.getByRole('button', { name: '90 days' })).toBeSelected();
  for (const other of ['30 days', '1 year', 'Never']) {
    expect(screen.getByRole('button', { name: other })).not.toBeSelected();
  }
  expect(screen.getByText('Default project: Production')).toBeOnTheScreen();

  await press('Create key');

  expect(create).toHaveBeenCalledWith({
    userId: 'demo-user',
    description: '',
    defaultProjectId: 'demo-prod',
    expiry: '90d',
  });

  await press('Done');
  await closeAnyway();

  // Without a description, the list says so
  expect(
    await screen.findByRole('button', {
      name: `No description, ${NEW_ACCESS_KEY}, Expires ${formatDay(new Date(NOW.getTime() + 90 * DAY))}`,
    }),
  ).toBeOnTheScreen();
});

test("keys that can't be deleted have no delete button", async () => {
  await open();
  await press(/^Scaleway Manager, /);

  expect(screen.getByRole('header', { name: 'Scaleway Manager' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Access key, SCWDEMO00000000000A1')).toBeOnTheScreen();
  expect(screen.getByLabelText(`Created, ${formatDay(new Date('2026-01-10T09:00:00.000Z'))}`)).toBeOnTheScreen();
  expect(screen.getByLabelText('Expires, Never')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeOnTheScreen();
  // It says why
  expect(screen.getByText("Scaleway doesn't allow deleting this key.")).toBeOnTheScreen();

  await press('Close');
  await press(/^Terraform, /);

  expect(screen.getByRole('button', { name: 'Delete key' })).toBeEnabled();
  expect(screen.queryByText("Scaleway doesn't allow deleting this key.")).not.toBeOnTheScreen();
});

test('creating is disabled offline', async () => {
  withRealRules();
  await open();
  await setOnline(false);

  expect(screen.getByRole('button', { name: 'Create API key' })).toBeDisabled();
  expect(screen.getByText("You're offline")).toBeOnTheScreen();

  await setOnline(true);
  await press('Create API key');
  await setOnline(false);

  // Gone offline with the form open
  expect(screen.getByRole('button', { name: 'Create key' })).toBeDisabled();
  expect(screen.getAllByText("You're offline")).toHaveLength(2);
});

test("the access key can be copied from a key's sheet, as a plain value", async () => {
  const copy = jest.spyOn(services.clipboard, 'copy').mockResolvedValue();
  await open();
  await press(/^Terraform, /);
  await press('Copy Access key');

  expect(copy).toHaveBeenCalledWith('SCWDEMO00000000000B2', { sensitive: false });
  expect(screen.getByRole('button', { name: 'Copied Access key' })).toBeOnTheScreen();
});

test('deleting asks first, then the key is gone', async () => {
  const remove = jest.spyOn(services.apiKeys, 'remove');
  await open();
  await press(/^Terraform, /);
  await press('Delete key');

  // The question names the key
  expect(screen.getByRole('header', { name: 'Delete Terraform?' })).toBeOnTheScreen();
  expect(screen.getByText('Anything using it will stop working right away.')).toBeOnTheScreen();

  // Cancel goes back to the key
  await press('Cancel');

  expect(screen.getByRole('header', { name: 'Terraform' })).toBeOnTheScreen();
  expect(remove).not.toHaveBeenCalled();

  await press('Delete key');
  await press('Delete');

  expect(remove).toHaveBeenCalledWith('SCWDEMO00000000000B2');
  expect(screen.queryByRole('header', { name: 'Terraform' })).not.toBeOnTheScreen();
  expect(screen.queryByText('SCWDEMO00000000000B2')).not.toBeOnTheScreen();
  expect(screen.getByText('SCWDEMO00000000000A1')).toBeOnTheScreen();
  // The sheet is closed, then the toast says it's done, as for SSH keys
  expect(screen.getByText('API key deleted')).toBeOnTheScreen();
});

test('a key without a description is named by its access key in the question', async () => {
  const [, terraform] = await services.apiKeys.list('demo-user');
  if (terraform === undefined) {
    throw new Error('The demo has a Terraform key');
  }
  jest.spyOn(services.apiKeys, 'list').mockResolvedValue([{ ...terraform, description: '' }]);
  await show();
  await screen.findByText('SCWDEMO00000000000B2');
  await press(/^No description, /);
  await press('Delete key');

  expect(screen.getByRole('header', { name: 'Delete SCWDEMO00000000000B2?' })).toBeOnTheScreen();
});

test('deleting is disabled offline', async () => {
  withRealRules();
  await open();
  await press(/^Terraform, /);
  await press('Delete key');
  await setOnline(false);

  // The question goes away, and the row says why
  expect(screen.queryByRole('header', { name: 'Delete Terraform?' })).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: "Delete key, You're offline" })).toBeDisabled();
});

test("a delete that fails says so under the button, and the key stays", async () => {
  jest.spyOn(services.apiKeys, 'remove').mockRejectedValue(new AppError('forbidden', 'Insufficient permissions', 403));
  await open();
  await press(/^Terraform, /);
  await press('Delete key');
  await press('Delete');

  // Back to the key, in plain words
  expect(screen.getByRole('header', { name: 'Terraform' })).toBeOnTheScreen();
  expect(screen.getByText("You don't have access to this in this organization.")).toBeOnTheScreen();
  expect(screen.queryByText('Insufficient permissions')).not.toBeOnTheScreen();
});

test("Scaleway's reason shows under Create key when it refuses a key; other failures in plain words", async () => {
  const create = jest
    .spyOn(services.apiKeys, 'create')
    .mockRejectedValueOnce(
      new AppError('unknown', 'invalid argument(s)', 400, 'Your organization requires API keys to expire.'),
    )
    // A refusal with no words of Scaleway's: never "Request failed with status 409"
    .mockRejectedValueOnce(new AppError('unknown', 'Request failed with status 409', 409))
    .mockRejectedValueOnce(new AppError('server', 'Request failed with status 502', 502))
    .mockRejectedValueOnce(new AppError('unauthorized', 'Session expired', 401));
  await open();
  await press('Create API key');
  await press('Never');

  expect(screen.getByRole('button', { name: 'Never' })).toBeSelected();

  await press('Create key');

  expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ expiry: 'never' }));
  expect(screen.getByText('Your organization requires API keys to expire.')).toBeOnTheScreen();
  // Still the form, to pick another expiry
  expect(screen.getByRole('header', { name: 'Create API key' })).toBeOnTheScreen();

  await press('Create key');

  expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();
  expect(screen.queryByText('Request failed with status 409')).not.toBeOnTheScreen();

  await press('Create key');

  expect(screen.getByText("Scaleway isn't responding right now. Try again in a moment.")).toBeOnTheScreen();
  expect(screen.queryByText('Request failed with status 502')).not.toBeOnTheScreen();

  // The session ended: no line, the app goes back to Welcome
  await press('Create key');

  expect(screen.queryByText("Scaleway isn't responding right now. Try again in a moment.")).not.toBeOnTheScreen();
  expect(screen.queryByText('Something went wrong. Try again.')).not.toBeOnTheScreen();
  expect(screen.queryByText('Session expired')).not.toBeOnTheScreen();
});

test('the secret is hidden while the app is in the app switcher or the background', async () => {
  await open();
  await createKey();

  for (const away of ['inactive', 'background'] as const) {
    await goTo(away);

    // The phone's snapshot of the app shows dots, and nothing can be copied
    expect(screen.queryByText(SECRET, { includeHiddenElements: true })).not.toBeOnTheScreen();
    expect(screen.getAllByTestId('secret-box').map((box) => within(box).getByText(DOTS))).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Copy Secret key' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy Access key' })).toBeDisabled();
  }

  await goTo('active');

  expect(screen.getByText(SECRET)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Copy Secret key' })).toBeEnabled();
});

test('a key created after its sheet was closed never shows its secret', async () => {
  let answer = () => {};
  const create = services.apiKeys.create;
  jest.spyOn(services.apiKeys, 'create').mockImplementation(
    (input) =>
      new Promise((resolve) => {
        answer = () => resolve(create(input));
      }),
  );
  await open();
  await press('Create API key');
  // A quick second tap would create a second key, and lose its secret
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Create key' }));
    fireEvent.press(screen.getByRole('button', { name: 'Create key' }));
  });

  expect(services.apiKeys.create).toHaveBeenCalledTimes(1);

  await press('Close');
  await act(async () => {
    answer();
  });

  // Nobody is looking any more: the answer is dropped, and the key is listed so it can be deleted
  expect(screen.queryByText(SECRET, { includeHiddenElements: true })).not.toBeOnTheScreen();
  expect(await screen.findByRole('button', { name: new RegExp(`^No description, ${NEW_ACCESS_KEY}, `) })).toBeOnTheScreen();

  await press('Create API key');

  expect(screen.getByRole('header', { name: 'Create API key' })).toBeOnTheScreen();
});

test("without access to API keys, the screen says so calmly", async () => {
  jest.spyOn(services.apiKeys, 'list').mockRejectedValue(new AppError('forbidden', 'Forbidden', 403));
  await show();

  expect(await screen.findByText("API keys aren't available")).toBeOnTheScreen();
  expect(screen.getByText("You don't have access to API keys in this organization.")).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
});

test('a list that fails to load can be tried again', async () => {
  jest.spyOn(services.apiKeys, 'list').mockRejectedValueOnce(new AppError('server', 'Bad gateway', 502));
  await show();

  expect(await screen.findByText("Couldn't load your API keys")).toBeOnTheScreen();

  await press('Try again');

  expect(await screen.findByText('SCWDEMO00000000000B2')).toBeOnTheScreen();
});

test('closing the secret before copying it asks first', async () => {
  await open();
  await createKey();

  // A swipe down only tries: the sheet stays, and asks
  expect(screen.getByTestId('sheet').props.allowSwipeDismissal).toBe(false);

  await act(async () => {
    fireEvent(screen.getByTestId('sheet'), 'requestClose');
  });

  expect(screen.getByRole('header', { name: 'Close without copying?' })).toBeOnTheScreen();
  expect(screen.getByText("You won't see this secret again.")).toBeOnTheScreen();

  // Cancel goes back to the secret
  await press('Cancel');

  expect(screen.getByText(SECRET)).toBeOnTheScreen();

  // Done and the Close button ask too
  for (const way of ['Done', 'Close']) {
    await press(way);

    expect(screen.getByRole('header', { name: 'Close without copying?' })).toBeOnTheScreen();

    await press('Cancel');
  }

  await press('Done');
  await closeAnyway();

  expect(screen.queryByText(SECRET, { includeHiddenElements: true })).not.toBeOnTheScreen();
  expect(screen.queryByRole('header', { name: 'Copy your secret key now' })).not.toBeOnTheScreen();
});

test('once the secret is copied, the sheet closes without asking', async () => {
  jest.spyOn(services.clipboard, 'copy').mockResolvedValue();
  await open();
  await createKey();
  await press('Copy Secret key');

  expect(screen.getByTestId('sheet').props.allowSwipeDismissal).toBe(true);

  await press('Done');

  expect(screen.queryByRole('header', { name: 'Close without copying?' })).not.toBeOnTheScreen();
  expect(screen.queryByText(SECRET, { includeHiddenElements: true })).not.toBeOnTheScreen();
});

test('while the secret is on screen, Android keeps it out of screenshots; it is let go once the step closes', async () => {
  jest.spyOn(services.clipboard, 'copy').mockResolvedValue();
  const protect = jest.spyOn(services.screenPrivacy, 'protect');
  const allow = jest.spyOn(services.screenPrivacy, 'allow');
  await open();
  protect.mockClear();
  allow.mockClear();
  await createKey();

  expect(protect).toHaveBeenCalledTimes(1);
  expect(allow).not.toHaveBeenCalled();

  await press('Copy Secret key');
  await press('Done');

  expect(allow).toHaveBeenCalledTimes(1);
});

test('with the Face ID lock on, the screen stays private after the secret goes', async () => {
  await withLockOn(async () => true);
  jest.spyOn(services.clipboard, 'copy').mockResolvedValue();
  const protect = jest.spyOn(services.screenPrivacy, 'protect');
  const allow = jest.spyOn(services.screenPrivacy, 'allow');
  await open();
  await createKey();

  expect(screen.getByText(SECRET)).toBeOnTheScreen();
  expect(protect).toHaveBeenCalled();

  allow.mockClear();
  await press('Copy Secret key');
  await press('Done');

  // The lock keeps the screen private
  expect(screen.queryByText(SECRET, { includeHiddenElements: true })).not.toBeOnTheScreen();
  expect(allow).not.toHaveBeenCalled();
});

test('the new secret hides while the app is locked, and is back after unlocking', async () => {
  let unlock: (unlocked: boolean) => void = () => {};
  const authenticate = jest
    .fn<Promise<boolean>, [string]>()
    .mockResolvedValueOnce(true)
    .mockImplementation(
      () =>
        new Promise((resolve) => {
          unlock = resolve;
        }),
    );
  await withLockOn(authenticate);
  await open();
  await createKey();

  expect(screen.getByText(SECRET)).toBeOnTheScreen();

  // Five minutes in the background: the lock covers the app, and the sheet (its own window) goes too
  await goTo('background');
  now = new Date(NOW.getTime() + 5 * 60_000);
  await goTo('active');

  expect(authenticate).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('header', { name: 'Copy your secret key now' })).not.toBeOnTheScreen();
  expect(screen.queryByText(SECRET)).not.toBeOnTheScreen();

  await act(async () => {
    unlock(true);
  });

  // Kept by the sheet's screen while it was hidden: still there to copy
  expect(screen.getByRole('header', { name: 'Copy your secret key now' })).toBeOnTheScreen();
  expect(screen.getByText(SECRET)).toBeOnTheScreen();
});

test('a key past its date says it has expired', async () => {
  const expired: ApiKey = {
    accessKey: 'SCWOLDKEY00000000001',
    description: 'Old CI',
    createdAt: '2025-01-10T09:00:00.000Z',
    expiresAt: '2026-02-03T12:00:00.000Z',
    defaultProjectId: 'demo-prod',
    deletable: true,
  };
  const list = services.apiKeys.list;
  jest.spyOn(services.apiKeys, 'list').mockImplementation(async (userId) => [...(await list(userId)), expired]);
  await open();

  const date = formatDay(new Date('2026-02-03T12:00:00.000Z'));

  expect(screen.getByRole('button', { name: `Old CI, SCWOLDKEY00000000001, Expired ${date}` })).toBeOnTheScreen();

  await press(/^Old CI, /);

  expect(screen.getByLabelText(`Expired, ${date}`)).toBeOnTheScreen();
});

test("offline, an empty list says You're offline once, under its own button", async () => {
  withRealRules();
  jest.spyOn(services.apiKeys, 'list').mockResolvedValue([]);
  await show();

  expect(await screen.findByText('No API keys')).toBeOnTheScreen();

  await setOnline(false);

  const actions = screen.getAllByRole('button', { name: 'Create API key' });

  expect(actions).toHaveLength(2);
  for (const action of actions) {
    expect(action).toBeDisabled();
  }
  expect(screen.getAllByText("You're offline")).toHaveLength(1);
});

test('a quick second tap on Delete deletes once', async () => {
  const remove = jest.spyOn(services.apiKeys, 'remove').mockReturnValue(new Promise(() => {}));
  await open();
  await press(/^Terraform, /);
  await press('Delete key');
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
  });

  expect(remove).toHaveBeenCalledTimes(1);
});

test('a second close on the question means yes', async () => {
  await open();
  await createKey();
  await press('Close');

  expect(screen.getByRole('header', { name: 'Close without copying?' })).toBeOnTheScreen();

  // The sheet's own Close button, again
  await act(async () => {
    const [cross] = screen.getAllByRole('button', { name: 'Close' });
    if (cross !== undefined) {
      fireEvent.press(cross);
    }
  });

  expect(screen.queryByRole('header', { name: 'Close without copying?' })).not.toBeOnTheScreen();
  expect(screen.queryByText(SECRET, { includeHiddenElements: true })).not.toBeOnTheScreen();
});

test('on Android, Back on the close question goes back to the secret', async () => {
  Platform.OS = 'android';
  await open();
  await createKey();
  // Back asks
  await act(async () => {
    fireEvent(screen.getByTestId('sheet'), 'requestClose');
  });

  expect(screen.getByRole('header', { name: 'Close without copying?' })).toBeOnTheScreen();

  // Back again leaves the question, as on every question
  await act(async () => {
    fireEvent(screen.getByTestId('sheet'), 'requestClose');
  });

  expect(screen.getByRole('header', { name: 'Copy your secret key now' })).toBeOnTheScreen();
  expect(screen.getByText(SECRET)).toBeOnTheScreen();
});

test('the secret is dropped however the sheet is closed, even when the screen closes it', async () => {
  function ScreenClosingTheSheet() {
    const [open, setOpen] = useState(true);

    return (
      <>
        <Button label="The screen closes it" size="sm" onPress={() => setOpen(false)} />

        <CreateApiKeySheet visible={open} onClose={() => setOpen(false)} create={services.apiKeys.create} />
      </>
    );
  }
  await renderWithApp(
    <LockProvider>
      <ScreenClosingTheSheet />
    </LockProvider>,
    { services },
  );
  await screen.findByText('Default project: Production');
  await press('Create key');

  expect(screen.getByText(SECRET)).toBeOnTheScreen();

  await press('The screen closes it');

  // Even the sheet sliding away only shows dots
  expect(screen.queryByText(SECRET, { includeHiddenElements: true })).not.toBeOnTheScreen();
  expect(screen.getAllByText(DOTS, { includeHiddenElements: true })).toHaveLength(2);
});

test("offline, a list that couldn't load says You're offline once, under Try again", async () => {
  withRealRules();
  jest.spyOn(services.apiKeys, 'list').mockRejectedValue(new AppError('server', 'Bad gateway', 502));
  await show();

  expect(await screen.findByText("Couldn't load your API keys")).toBeOnTheScreen();

  await setOnline(false);

  expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Create API key' })).toBeDisabled();
  expect(screen.getAllByText("You're offline")).toHaveLength(1);
});
