import { AppError } from '@scaleway-manager/core';
import type { SshKey } from '@scaleway-manager/core';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen } from '@testing-library/react-native';

import SshKeys from '../../../app/(tabs)/account/ssh-keys';
import { renderWithApp } from '../../test-utils/renderWithApp';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { LockProvider } from '../lock/LockProvider';

// Noon on 18 November 2026: a key added now is dated 18 Nov 2026
const NOW = new Date(Date.UTC(2026, 10, 18, 12));

const VALID_KEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl you@example.com';

const INVALID_MESSAGE =
  "This doesn't look like a public SSH key. It should start with ssh-ed25519, ssh-rsa or ecdsa-sha2.";

const EMPTY_MESSAGE = 'Paste your public key.';

const DELETE_MESSAGE = "Servers created after this won't accept this key. Servers that already have it keep it.";

const DISABLED_MEANS = "New servers won't get this key. Servers that already have it keep it.";

// The demo's first Production key, as its row reads it
const LAPTOP_ROW = 'matthias-laptop, SHA256:q3Xk7d1v0nYb2mZpW…, 12 Mar 2026';

const LAPTOP_FINGERPRINT = 'SHA256:q3Xk7d1v0nYb2mZpW9eHcT4uLrA8sFjG5oVtNi6KxQw';

// The demo (no network), on a fixed day, with its own empty phone storage
const demo = (): Services => {
  const saved = new Map<string, string>();

  return createServices('demo', {
    clock: { now: () => NOW },
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

// The demo's data with the real app's rules: the demo itself ignores the network, so offline tests use these
const realRules = (): Services => ({ ...demo(), mode: 'real' });

// The demo's Staging project, which has no SSH keys
const staging = async (services: Services = demo()): Promise<Services> => {
  await services.preferences.update({ projectIdByOrg: { 'demo-org': 'demo-staging' } });

  return services;
};

const open = async (services: Services = demo()) => {
  await renderWithApp(
    <LockProvider>
      <SshKeys />
    </LockProvider>,
    { services },
  );
};

// Offline once the keys are on the phone (offline, nothing is asked: what's saved shows)
const goOffline = async () => {
  await act(async () => {
    onlineManager.setOnline(false);
  });
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

const addButton = () => screen.getByRole('button', { name: 'Add key' });

// Waits for the list, then opens a key's sheet from its row
const openKey = async (row: string) => {
  await screen.findByRole('button', { name: row });
  await press(row);
};

afterEach(() => {
  jest.restoreAllMocks();
  onlineManager.setOnline(true);
});

test("lists the project's keys", async () => {
  const services = demo();
  const list = jest.spyOn(services.sshKeys, 'list');
  await open(services);

  expect(screen.getByRole('header', { name: 'SSH keys' })).toBeOnTheScreen();
  expect(await screen.findByRole('button', { name: LAPTOP_ROW })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'ci-deploy, SHA256:Hy2Rb8LwPz5cJt0eU…, 1 Jul 2026' })).toBeOnTheScreen();
  // The selected project's keys, under its name
  expect(list).toHaveBeenCalledWith('demo-prod');
  expect(screen.getByRole('header', { name: 'Production' })).toBeOnTheScreen();
  expect(screen.queryByText('Disabled', { exact: false })).not.toBeOnTheScreen();
});

test('a project with no keys says so, and offers to add one', async () => {
  await open(await staging());

  expect(await screen.findByText('No SSH keys in this project')).toBeOnTheScreen();

  // The header's action, then the empty state's: both add a key
  const [, emptyStateAction] = screen.getAllByRole('button', { name: 'Add SSH key' });

  if (emptyStateAction === undefined) {
    throw new Error('The empty state offers no Add SSH key');
  }

  await act(async () => {
    fireEvent.press(emptyStateAction);
  });

  expect(screen.getByRole('header', { name: 'Add SSH key' })).toBeOnTheScreen();
});

test('a disabled key says so, and can still be deleted', async () => {
  const services = demo();
  const disabled: SshKey = {
    id: 'old',
    name: 'old-desktop',
    fingerprint: 'SHA256:Zz9Yy8Xx7Ww6Vv5Uu4Tt3Ss2Rr1Qq0',
    createdAt: '2025-02-03T09:00:00.000Z',
    projectId: 'demo-prod',
    disabled: true,
  };
  jest.spyOn(services.sshKeys, 'list').mockResolvedValue([disabled]);
  await open(services);

  await openKey('old-desktop, SHA256:Zz9Yy8Xx7Ww6Vv5Uu… · Disabled, 3 Feb 2025');

  // The sheet says it too, and what it means
  expect(screen.getByLabelText('Status, Disabled')).toBeOnTheScreen();
  expect(screen.getByText(DISABLED_MEANS)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Delete key' })).toBeEnabled();


});

test('Add key stays disabled until the key is valid', async () => {
  await open();
  await screen.findByRole('button', { name: LAPTOP_ROW });
  await press('Add SSH key');

  expect(screen.getByRole('header', { name: 'Add SSH key' })).toBeOnTheScreen();
  expect(addButton()).toBeDisabled();

  await type('Name', 'work-laptop');

  expect(addButton()).toBeDisabled();

  await type('Public key', 'ssh-ed25519 not a key');

  expect(addButton()).toBeDisabled();

  await type('Public key', VALID_KEY);

  expect(addButton()).toBeEnabled();

  // The name can't be blank either
  await type('Name', '   ');

  expect(addButton()).toBeDisabled();
});

test('shows the invalid-key message', async () => {
  await open();
  await screen.findByRole('button', { name: LAPTOP_ROW });
  await press('Add SSH key');

  // Nothing to complain about before anything is pasted, even after passing through the field
  await fireEvent(screen.getByLabelText('Public key'), 'focus');
  await fireEvent(screen.getByLabelText('Public key'), 'blur');

  expect(screen.queryByText(INVALID_MESSAGE)).not.toBeOnTheScreen();
  expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeOnTheScreen();

  // Typed one character at a time: nothing yet, it isn't finished
  for (const typed of ['s', 'ss', 'ssh']) {
    await type('Public key', typed);
  }

  expect(screen.queryByText(INVALID_MESSAGE)).not.toBeOnTheScreen();

  // Leaving the field checks it
  await act(async () => {
    fireEvent(screen.getByLabelText('Public key'), 'blur');
  });

  expect(screen.getByText(INVALID_MESSAGE)).toBeOnTheScreen();

  // Typing again hides it until the field is left again
  await type('Public key', 'ssh-');

  expect(screen.queryByText(INVALID_MESSAGE)).not.toBeOnTheScreen();

  // A paste is finished: checked at once
  await type('Public key', 'BEGIN PRIVATE KEY');

  expect(screen.getByText(INVALID_MESSAGE)).toBeOnTheScreen();

  await type('Public key', VALID_KEY);

  expect(screen.queryByText(INVALID_MESSAGE)).not.toBeOnTheScreen();

  // Emptied again: it asks for the key
  await type('Public key', '');

  expect(screen.getByText(EMPTY_MESSAGE)).toBeOnTheScreen();
});

test('adding a key shows it in the list', async () => {
  const services = demo();
  const create = jest.spyOn(services.sshKeys, 'create');
  await open(services);
  await screen.findByRole('button', { name: LAPTOP_ROW });
  await press('Add SSH key');
  await type('Name', ' work-laptop ');
  await type('Public key', `${VALID_KEY}\n`);
  await press('Add key');

  // Sent to the selected project, without stray spaces
  expect(create).toHaveBeenCalledWith({ name: 'work-laptop', publicKey: VALID_KEY, projectId: 'demo-prod' });
  // The sheet is closed, then the toast says it's done
  expect(screen.queryByRole('header', { name: 'Add SSH key' })).not.toBeOnTheScreen();
  expect(screen.getByText('SSH key added')).toBeOnTheScreen();
  expect(
    await screen.findByRole('button', { name: 'work-laptop, SHA256:demoxxxxxxxxxxxxx…, 18 Nov 2026' }),
  ).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: LAPTOP_ROW })).toBeOnTheScreen();

  // Opened again, the form starts empty
  await press('Add SSH key');

  expect(screen.getByLabelText('Name')).toHaveDisplayValue('');
  expect(screen.getByLabelText('Public key')).toHaveDisplayValue('');
});

test('while the key is sent, the form waits', async () => {
  const services = demo();
  let finish: (key: SshKey) => void = () => {};
  jest.spyOn(services.sshKeys, 'create').mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await open(services);
  await screen.findByRole('button', { name: LAPTOP_ROW });
  await press('Add SSH key');
  await type('Name', 'work-laptop');
  await type('Public key', VALID_KEY);
  await press('Add key');

  expect(addButton()).toBeBusy();
  expect(screen.getByLabelText('Name')).toBeDisabled();
  expect(screen.getByLabelText('Public key')).toBeDisabled();

  await act(async () => {
    finish({
      id: 'new',
      name: 'work-laptop',
      fingerprint: 'SHA256:new',
      createdAt: NOW.toISOString(),
      projectId: 'demo-prod',
      disabled: false,
    });
  });

  expect(screen.queryByRole('header', { name: 'Add SSH key' })).not.toBeOnTheScreen();
  expect(screen.getByText('SSH key added')).toBeOnTheScreen();
});

test("a key Scaleway won't add keeps the form open and says why under the button", async () => {
  const services = demo();
  jest.spyOn(services.sshKeys, 'create').mockRejectedValue(new AppError('server', 'internal error', 500));
  await open(services);
  await screen.findByRole('button', { name: LAPTOP_ROW });
  await press('Add SSH key');
  await type('Name', 'work-laptop');
  await type('Public key', VALID_KEY);
  await press('Add key');

  // Plain words, never Scaleway's technical message
  expect(screen.getByText("Scaleway isn't responding right now. Try again in a moment.")).toBeOnTheScreen();
  expect(screen.queryByText('internal error')).not.toBeOnTheScreen();
  expect(screen.getByLabelText('Name')).toHaveDisplayValue('work-laptop');
  expect(addButton()).toBeEnabled();
  expect(screen.queryByText('SSH key added')).not.toBeOnTheScreen();
});

test('deleting asks first', async () => {
  const services = demo();
  const remove = jest.spyOn(services.sshKeys, 'remove');
  await open(services);
  await openKey(LAPTOP_ROW);

  // The key's sheet: its name, fingerprint and date, then Delete key
  expect(screen.getByRole('header', { name: 'matthias-laptop' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Name, matthias-laptop')).toBeOnTheScreen();
  expect(screen.getByLabelText(`Fingerprint, ${LAPTOP_FINGERPRINT}`)).toBeOnTheScreen();
  expect(screen.getByLabelText('Added, 12 Mar 2026')).toBeOnTheScreen();
  expect(screen.queryByLabelText(/^Status, /)).not.toBeOnTheScreen();

  await press('Delete key');

  expect(screen.getByRole('header', { name: 'Delete matthias-laptop?' })).toBeOnTheScreen();
  expect(screen.getByText(DELETE_MESSAGE)).toBeOnTheScreen();
  expect(remove).not.toHaveBeenCalled();

  // Cancel goes back to the key, still there
  await press('Cancel');

  expect(screen.getByRole('header', { name: 'matthias-laptop' })).toBeOnTheScreen();
  expect(remove).not.toHaveBeenCalled();

  await press('Delete key');
  await press('Delete');

  expect(remove).toHaveBeenCalledWith('demo-ssh-1');
  expect(screen.queryByRole('header', { name: 'matthias-laptop' })).not.toBeOnTheScreen();
  expect(screen.getByText('SSH key deleted')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: LAPTOP_ROW })).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /^ci-deploy, / })).toBeOnTheScreen();
});

test("a key that can't be deleted goes back to the key and says why", async () => {
  const services = demo();
  jest.spyOn(services.sshKeys, 'remove').mockRejectedValue(new AppError('forbidden', 'denied', 403));
  await open(services);
  await openKey(LAPTOP_ROW);
  await press('Delete key');
  await press('Delete');

  expect(screen.getByRole('header', { name: 'matthias-laptop' })).toBeOnTheScreen();
  expect(screen.getByText("You don't have access to this in this organization.")).toBeOnTheScreen();
  expect(screen.queryByText('SSH key deleted')).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: LAPTOP_ROW })).toBeOnTheScreen();

  // Asked again, the old reason goes
  await press('Delete key');
  await press('Cancel');

  expect(screen.queryByText("You don't have access to this in this organization.")).not.toBeOnTheScreen();
});

test('the fingerprint copies as plain text, and the button says Copied', async () => {
  const services = demo();
  const copy = jest.fn(async () => {});
  await open({ ...services, clipboard: { copy } });
  await openKey(LAPTOP_ROW);
  await press('Copy Fingerprint');

  expect(copy).toHaveBeenCalledWith(LAPTOP_FINGERPRINT, { sensitive: false });
  expect(screen.getByRole('button', { name: 'Copied Fingerprint' })).toBeOnTheScreen();
  // Confirmed in place: no toast under the sheet
  expect(screen.queryByText('Copied')).not.toBeOnTheScreen();
});

test('in the demo, adding a key works offline: the demo ignores the network', async () => {
  await renderWithApp(
    <LockProvider>
      <SshKeys />
    </LockProvider>,
    { services: demo(), online: false },
  );
  await screen.findByRole('button', { name: LAPTOP_ROW });

  expect(screen.queryByText("You're offline")).not.toBeOnTheScreen();

  await press('Add SSH key');
  await type('Name', 'work-laptop');
  await type('Public key', VALID_KEY);
  await press('Add key');

  expect(screen.getByText('SSH key added')).toBeOnTheScreen();
  expect(
    await screen.findByRole('button', { name: 'work-laptop, SHA256:demoxxxxxxxxxxxxx…, 18 Nov 2026' }),
  ).toBeOnTheScreen();
});

test('adding is disabled offline', async () => {
  await open(await staging(realRules()));

  expect(await screen.findByText('No SSH keys in this project')).toBeOnTheScreen();

  await goOffline();

  // The header's action and the empty state's; the note once, under the empty state's
  const actions = screen.getAllByRole('button', { name: 'Add SSH key' });

  expect(actions).toHaveLength(2);
  for (const action of actions) {
    expect(action).toBeDisabled();
  }
  expect(screen.getAllByText("You're offline")).toHaveLength(1);
});

test('going offline with the form open turns Add key off, and says why', async () => {
  await open(realRules());
  await screen.findByRole('button', { name: LAPTOP_ROW });
  await press('Add SSH key');
  await type('Name', 'work-laptop');
  await type('Public key', VALID_KEY);

  expect(addButton()).toBeEnabled();

  await goOffline();

  expect(addButton()).toBeDisabled();
  // Under the button, and under the screen's header
  expect(screen.getAllByText("You're offline")).toHaveLength(2);
});

test('deleting is turned off while offline, and says why', async () => {
  const services = realRules();
  const remove = jest.spyOn(services.sshKeys, 'remove');
  await open(services);
  await openKey(LAPTOP_ROW);
  await press('Delete key');

  expect(screen.getByRole('header', { name: 'Delete matthias-laptop?' })).toBeOnTheScreen();

  // Offline, the question goes away, back to the key
  await goOffline();

  expect(screen.queryByRole('header', { name: 'Delete matthias-laptop?' })).not.toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'matthias-laptop' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: "Delete key, You're offline" })).toBeDisabled();

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: "Delete key, You're offline" }));
  });

  expect(screen.queryByRole('header', { name: 'Delete matthias-laptop?' })).not.toBeOnTheScreen();
  expect(remove).not.toHaveBeenCalled();
});

test('no access to SSH keys shows the calm message', async () => {
  const services = demo();
  jest.spyOn(services.sshKeys, 'list').mockRejectedValue(new AppError('forbidden', 'denied', 403));
  await open(services);

  expect(await screen.findByText("SSH keys aren't available")).toBeOnTheScreen();
  expect(screen.getByText("You don't have access to SSH keys in this project.")).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
});

test("keys that can't be loaded offer Try again", async () => {
  const services = demo();
  jest.spyOn(services.sshKeys, 'list').mockRejectedValueOnce(new AppError('server', 'internal error', 500));
  await open(services);

  expect(await screen.findByText("Couldn't load your SSH keys")).toBeOnTheScreen();

  await press('Try again');

  expect(await screen.findByRole('button', { name: LAPTOP_ROW })).toBeOnTheScreen();
});

test('a quick second tap on Add key sends the key once', async () => {
  const services = demo();
  const create = jest.spyOn(services.sshKeys, 'create').mockReturnValue(new Promise(() => {}));
  await open(services);
  await screen.findByRole('button', { name: LAPTOP_ROW });
  await press('Add SSH key');
  await type('Name', 'work-laptop');
  await type('Public key', VALID_KEY);
  await act(async () => {
    fireEvent.press(addButton());
    fireEvent.press(addButton());
  });

  expect(create).toHaveBeenCalledTimes(1);
});

test('a key added after its sheet was closed closes nothing and says nothing', async () => {
  const services = demo();
  const create = services.sshKeys.create;
  let finish = () => {};
  jest.spyOn(services.sshKeys, 'create').mockImplementation(
    (input) =>
      new Promise((resolve) => {
        finish = () => resolve(create(input));
      }),
  );
  await open(services);
  await screen.findByRole('button', { name: LAPTOP_ROW });
  await press('Add SSH key');
  await type('Name', 'work-laptop');
  await type('Public key', VALID_KEY);
  await press('Add key');
  await press('Close');
  // A new form, opened before the first answer comes back
  await press('Add SSH key');
  await act(async () => {
    finish();
  });

  expect(screen.getByRole('header', { name: 'Add SSH key' })).toBeOnTheScreen();
  expect(screen.queryByText('SSH key added')).not.toBeOnTheScreen();
  // The key is listed all the same
  expect(await screen.findByRole('button', { name: /^work-laptop, / })).toBeOnTheScreen();
});

test("a key Scaleway refuses says why in Scaleway's words (trying again can't help)", async () => {
  const services = demo();
  jest
    .spyOn(services.sshKeys, 'create')
    .mockRejectedValueOnce(new AppError('unknown', 'conflict', 409, 'This SSH key is already in the project.'))
    .mockRejectedValueOnce(new AppError('unknown', 'Request failed with status 409', 409));
  await open(services);
  await screen.findByRole('button', { name: LAPTOP_ROW });
  await press('Add SSH key');
  await type('Name', 'work-laptop');
  await type('Public key', VALID_KEY);
  await press('Add key');

  expect(screen.getByText('This SSH key is already in the project.')).toBeOnTheScreen();

  // No words of Scaleway's: plain ones, never the status
  await press('Add key');

  expect(screen.getByText('Something went wrong. Try again.')).toBeOnTheScreen();
  expect(screen.queryByText('Request failed with status 409')).not.toBeOnTheScreen();
});

test('opening the sheets loads nothing again', async () => {
  const services = demo();
  const list = jest.spyOn(services.sshKeys, 'list');
  await open(services);
  await openKey(LAPTOP_ROW);
  await press('Close');
  await press('Add SSH key');
  await press('Close');

  expect(list).toHaveBeenCalledTimes(1);
});

test('a quick second tap on Delete deletes once', async () => {
  const services = demo();
  const remove = jest.spyOn(services.sshKeys, 'remove').mockReturnValue(new Promise(() => {}));
  await open(services);
  await openKey(LAPTOP_ROW);
  await press('Delete key');
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
  });

  expect(remove).toHaveBeenCalledTimes(1);
});

test('a key typed, then rubbed out, asks for the key once the field is left', async () => {
  await open();
  await screen.findByRole('button', { name: LAPTOP_ROW });
  await press('Add SSH key');
  await type('Public key', 's');
  await type('Public key', '');

  expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeOnTheScreen();

  await act(async () => {
    fireEvent(screen.getByLabelText('Public key'), 'blur');
  });

  expect(screen.getByText(EMPTY_MESSAGE)).toBeOnTheScreen();
});

test("offline, keys that couldn't load say You're offline once, under Try again", async () => {
  const services = realRules();
  jest.spyOn(services.sshKeys, 'list').mockRejectedValue(new AppError('server', 'internal error', 500));
  await open(services);

  expect(await screen.findByText("Couldn't load your SSH keys")).toBeOnTheScreen();

  await goOffline();

  expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
  expect(screen.getAllByText("You're offline")).toHaveLength(1);
});
