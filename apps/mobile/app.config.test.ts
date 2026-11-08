import { existsSync } from 'node:fs';
import path from 'node:path';

import { darkColors, lightColors } from '@scaleway-manager/ui/tokens';

import config from './app.config';
import pkg from './package.json';

test('app identity matches the store listing', () => {
  const c = config({ config: {} } as never);
  expect(c.ios?.bundleIdentifier).toBe('com.matthiasprost.scalewaymanager');
  expect(c.android?.package).toBe('com.matthiasprost.scalewaymanager');
  expect(c.version).toBe('3.0.0');
  expect(c.android?.versionCode).toBe(30003);
  expect(c.ios?.supportsTablet).toBe(true);
});

test('every platform and variant uses the generated icons', () => {
  const c = config({ config: {} } as never);
  const icons = {
    icon: c.icon,
    ios: c.ios?.icon,
    android: c.android?.adaptiveIcon,
  };

  expect(icons).toEqual({
    icon: './assets/icon/icon.png',
    ios: {
      light: './assets/icon/icon.png',
      dark: './assets/icon/icon-dark.png',
      tinted: './assets/icon/icon-tinted.png',
    },
    android: {
      foregroundImage: './assets/icon/adaptive-foreground.png',
      backgroundImage: './assets/icon/adaptive-background.png',
      monochromeImage: './assets/icon/adaptive-monochrome.png',
    },
  });
  // Prebuild fails on a missing file
  for (const file of [icons.icon, ...Object.values(icons.ios ?? {}), ...Object.values(icons.android ?? {})]) {
    expect(existsSync(path.join(__dirname, String(file)))).toBe(true);
  }
});

test('store build numbers start at 1 (iOS) and 30000 (Android), above the old 2.x uploads', () => {
  const c = config({ config: {} } as never);

  expect(c.ios?.buildNumber).toBe('3');
  expect(c.android?.versionCode).toBe(30003);
});

test('release signing is wired in as a config plugin', () => {
  const c = config({ config: {} } as never);

  expect(c.plugins).toContain('./plugins/withReleaseSigning');
});

test('Face ID asks permission with our own words', () => {
  const c = config({ config: {} } as never);

  expect(c.plugins).toContainEqual([
    'expo-local-authentication',
    { faceIDPermission: 'Scaleway Manager uses Face ID to keep your cloud account locked.' },
  ]);
});

test('the native splash uses the brand purples', () => {
  const c = config({ config: {} } as never);

  expect(c.plugins).toContainEqual([
    'expo-splash-screen',
    {
      image: './assets/images/splash-logo.png',
      imageWidth: 137,
      backgroundColor: lightColors.splashBackground,
      dark: { image: './assets/images/splash-logo.png', backgroundColor: darkColors.splashBackground },
    },
  ]);
});

test('secure storage applies its native setup, so the session stays out of Android backups', () => {
  const c = config({ config: {} } as never);

  expect(c.plugins).toContain('expo-secure-store');
});

test('Android asks for no permission the app does not use', () => {
  const c = config({ config: {} } as never);

  expect(c.android?.blockedPermissions).toEqual([
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.VIBRATE',
    'android.permission.READ_MEDIA_IMAGES',
  ]);
  // expo-screen-capture needs it at launch on Android 14+: blocking it crashes the app
  expect(c.android?.blockedPermissions).not.toContain('android.permission.DETECT_SCREEN_CAPTURE');
});

test('Android backs up no app data, so the cached account data never reaches Google', () => {
  const c = config({ config: {} } as never);

  expect(c.android?.allowBackup).toBe(false);
});

test('package.json already holds what prebuild writes, so prebuild leaves it unchanged', () => {
  const c = config({ config: {} } as never);

  expect(pkg.version).toBe(c.version);
  expect(pkg.scripts.ios).toBe('expo run:ios');
  expect(pkg.scripts.android).toBe('expo run:android');
});
