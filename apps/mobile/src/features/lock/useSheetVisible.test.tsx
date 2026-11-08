/// <reference types="node" />

import { DEFAULT_PREFERENCES } from '@scaleway-manager/core';
import type { BiometricPort, Preferences, Session } from '@scaleway-manager/core';
import { Sheet, Text } from '@scaleway-manager/ui';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { renderWithApp } from '../../test-utils/renderWithApp';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { LockGate } from './LockGate';
import { LockProvider } from './LockProvider';
import { useSheetVisible } from './useSheetVisible';

const ROOT = join(__dirname, '../../../../..');

const SESSION: Session = {
  token: 'token',
  renewToken: 'renew',
  sessionId: 'session',
  userId: 'user',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

const START = new Date('2026-01-01T10:00:00.000Z');

const LOCKED = 'Scaleway Manager is locked';

let now: Date;
// Everyone listening to the app state (the lock, and what hides while the app is away)
const listeners = new Set<(state: AppStateStatus) => void>();

function OpenSheet() {
  const sheet = useSheetVisible(true);

  return (
    <Sheet visible={sheet} title="Organization and project" onClose={() => {}}>
      <Text variant="body">Production</Text>
    </Sheet>
  );
}

// The lock also hides the app from screen readers; a sheet is its own window, so look past that.
const sheetContent = () => screen.queryByText('Production', { includeHiddenElements: true });

const settle = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });

const goTo = async (state: AppStateStatus) => {
  await act(async () => {
    listeners.forEach((listener) => listener(state));
  });
  await settle();
};

beforeEach(() => {
  jest.useFakeTimers();
  now = START;
  listeners.clear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, next) => {
    listeners.add(next);

    return { remove: () => listeners.delete(next) };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('an open sheet hides when the app locks', async () => {
  // Real mode, signed in, Face ID lock on. The launch decision waits until the test lets it through.
  let saved: Preferences = { ...DEFAULT_PREFERENCES, biometricLock: 'on' };
  let deciding = true;
  const waiting: (() => void)[] = [];
  const biometric: jest.Mocked<BiometricPort> = {
    isAvailable: jest.fn(async () => true),
    authenticate: jest.fn(async (_reason: string) => true),
  };
  const services: Services = {
    ...createServices('real', {
      kv: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
      store: { load: async () => SESSION, save: async () => {}, clear: async () => {} },
      biometric,
    }),
    preferences: {
      read: () => (deciding ? new Promise((resolve) => waiting.push(() => resolve(saved))) : Promise.resolve(saved)),
      update: async (patch) => {
        saved = { ...saved, ...patch };

        return saved;
      },
    },
    clock: { now: () => now },
  };
  await renderWithApp(
    <LockProvider>
      <LockGate>
        <OpenSheet />
      </LockGate>
    </LockProvider>,
    { services },
  );
  await settle();

  // Still deciding at launch: the purple cover is up, so the sheet waits
  expect(sheetContent()).not.toBeOnTheScreen();

  deciding = false;
  await act(async () => {
    waiting.forEach((answer) => answer());
  });
  await settle();

  expect(screen.getByText('Production')).toBeOnTheScreen();

  // Five minutes away, and Face ID fails: the lock covers the app, and the sheet goes at once
  await goTo('background');
  now = new Date(START.getTime() + 5 * 60_000);
  biometric.authenticate.mockResolvedValue(false);
  await goTo('active');

  expect(screen.getByText(LOCKED)).toBeOnTheScreen();
  expect(sheetContent()).not.toBeOnTheScreen();

  // Unlocked: it comes back, as it was
  biometric.authenticate.mockResolvedValue(true);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  });
  await settle();

  expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
  expect(screen.getByText('Production')).toBeOnTheScreen();
});

test('an open sheet hides under the privacy cover while the app is away, and comes back', async () => {
  // Real mode, signed in, Face ID lock on
  let saved: Preferences = { ...DEFAULT_PREFERENCES, biometricLock: 'on' };
  const services: Services = {
    ...createServices('real', {
      kv: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
      store: { load: async () => SESSION, save: async () => {}, clear: async () => {} },
      biometric: { isAvailable: async () => true, authenticate: async () => true },
    }),
    preferences: {
      read: async () => saved,
      update: async (patch) => {
        saved = { ...saved, ...patch };

        return saved;
      },
    },
    clock: { now: () => now },
  };
  await renderWithApp(
    <LockProvider>
      <LockGate>
        <OpenSheet />
      </LockGate>
    </LockProvider>,
    { services },
  );
  await settle();

  expect(screen.getByText('Production')).toBeOnTheScreen();

  // The app switcher: a sheet is its own window, above the cover, so it goes too
  await goTo('inactive');

  expect(sheetContent()).not.toBeOnTheScreen();

  await goTo('active');

  expect(screen.getByText('Production')).toBeOnTheScreen();
});

describe('the lint rule', () => {
  // Jest can't load ESLint's config (an ES module), so ESLint runs in its own Node process, from the repo root.
  const lint = (code: string, file: string): { ruleId: string | null; message: string }[] => {
    const script = `
      import { ESLint } from 'eslint';
      const [code, filePath] = process.argv.slice(1);
      const [result] = await new ESLint().lintText(code, { filePath });
      process.stdout.write(JSON.stringify(result.messages));
    `;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script, code, join(ROOT, file)], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    return JSON.parse(output);
  };

  const SHEET_RULE = 'A sheet gets `visible` from useSheetVisible(open), never from an object written here.';

  const WRITES_ITS_OWN = [
    "import { Sheet } from '@scaleway-manager/ui';",
    '',
    'export function Picker({ open }: { open: boolean }) {',
    '  return (',
    '    <Sheet visible={{ open, lockCovers: false }} title="Pick" onClose={() => {}}>',
    '      {null}',
    '    </Sheet>',
    '  );',
    '}',
    '',
  ].join('\n');

  test('a feature file that writes { open, lockCovers: false } itself fails lint', () => {
    const messages = lint(WRITES_ITS_OWN, 'apps/mobile/src/features/workspace/Picker.tsx');

    expect(messages).toEqual([expect.objectContaining({ ruleId: 'no-restricted-syntax', message: SHEET_RULE })]);
  }, 60_000);

  test('the lock-aware hook is the one file allowed to build it', () => {
    const messages = lint(
      'export const visible = (open: boolean, locked: boolean) => ({ open, lockCovers: locked });\n',
      'apps/mobile/src/features/lock/useSheetVisible.ts',
    );

    expect(messages).toEqual([]);
  }, 60_000);
});
