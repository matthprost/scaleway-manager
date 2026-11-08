type BuildConfig = { screenshotBuild: boolean };

const FLAGS = ['EXPO_PUBLIC_SCREENSHOTS'] as const;

// Each case loads the file fresh, so the build values can change between cases.
const load = (dev: boolean, env: Partial<Record<(typeof FLAGS)[number], string>> = {}): BuildConfig => {
  const globals = globalThis as { __DEV__?: boolean };
  const before = { dev: globals.__DEV__, env: FLAGS.map((name) => [name, process.env[name]] as const) };
  globals.__DEV__ = dev;
  for (const name of FLAGS) {
    if (env[name] === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = env[name];
    }
  }
  let config: BuildConfig = { screenshotBuild: false };
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    config = require('./buildConfig') as BuildConfig;
  });
  globals.__DEV__ = before.dev;
  for (const [name, value] of before.env) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  return config;
};

test('EXPO_PUBLIC_SCREENSHOTS=1 makes a store screenshots build', () => {
  expect(load(false, { EXPO_PUBLIC_SCREENSHOTS: '1' }).screenshotBuild).toBe(true);
});

test('without EXPO_PUBLIC_SCREENSHOTS it is no screenshots build, in development too', () => {
  expect(load(false).screenshotBuild).toBe(false);
  expect(load(false, { EXPO_PUBLIC_SCREENSHOTS: '0' }).screenshotBuild).toBe(false);
  expect(load(true).screenshotBuild).toBe(false);
});
