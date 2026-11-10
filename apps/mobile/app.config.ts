import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Scaleway Manager',
  slug: 'scaleway-manager',
  scheme: 'scalewaymanager',
  version: '3.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  // Drawn by scripts/generate-icons.ts (pnpm --filter @scaleway-manager/mobile icons)
  icon: './assets/icon/icon.png',
  ios: {
    icon: {
      light: './assets/icon/icon.png',
      dark: './assets/icon/icon-dark.png',
      tinted: './assets/icon/icon-tinted.png',
    },
    bundleIdentifier: 'com.matthiasprost.scalewaymanager',
    appleTeamId: '8754A6XKT5',
    buildNumber: '3',
    supportsTablet: true,
    infoPlist: {
      'UISupportedInterfaceOrientations~ipad': [
        'UIInterfaceOrientationPortrait',
        'UIInterfaceOrientationPortraitUpsideDown',
        'UIInterfaceOrientationLandscapeLeft',
        'UIInterfaceOrientationLandscapeRight',
      ],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.matthiasprost.scalewaymanager',
    versionCode: 30003,
    // Expo's template asks for these; the app uses none of them. (Without SYSTEM_ALERT_WINDOW, a debug build can't show the "draw over apps" overlay.)
    // READ_MEDIA_IMAGES: expo-screen-capture's screenshot listener on Android 13, unused (Google Play asks every app
    // with photo access to justify it). Its DETECT_SCREEN_CAPTURE must stay: on Android 14+ the module needs it at launch.
    blockedPermissions: [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.VIBRATE',
      'android.permission.READ_MEDIA_IMAGES',
    ],
    // The cached account data never goes to Google backups.
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: './assets/icon/adaptive-foreground.png',
      backgroundImage: './assets/icon/adaptive-background.png',
      monochromeImage: './assets/icon/adaptive-monochrome.png',
    },
  },
  plugins: [
    'expo-router',
    // Release signing from ~/.gradle/gradle.properties (see DEPLOY.md)
    './plugins/withReleaseSigning',
    // Keeps the saved session out of Android backups.
    'expo-secure-store',
    [
      'expo-local-authentication',
      { faceIDPermission: 'Scaleway Manager uses Face ID to keep your cloud account locked.' },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-logo.png',
        imageWidth: 137,
        backgroundColor: '#4F0599',
        dark: { image: './assets/images/splash-logo.png', backgroundColor: '#2B0961' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
