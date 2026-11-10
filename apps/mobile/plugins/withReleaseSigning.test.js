const { addReleaseSigning, MESSAGE } = require('./withReleaseSigning');

// Expo SDK 58 template (android/app/build.gradle), trimmed. 'android' is the public debug password.
const TEMPLATE = `apply plugin: "com.android.application"

android {
    namespace 'com.matthiasprost.scalewaymanager'
    defaultConfig {
        versionCode 30000
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}
`;

const patched = addReleaseSigning(TEMPLATE);

test('adds a release signing config read from Gradle properties', () => {
  expect(patched).toContain("project.property('SM_UPLOAD_STORE_FILE')");
  expect(patched).toContain("project.property('SM_UPLOAD_STORE_PASSWORD')");
  expect(patched).toContain("project.property('SM_UPLOAD_KEY_ALIAS')");
  expect(patched).toContain("project.property('SM_UPLOAD_KEY_PASSWORD')");
  expect(patched).toContain('signingConfig signingConfigs.release');
});

test('puts no literal secret in the file, only the public Android debug one', () => {
  const secrets = patched.match(/(storePassword|keyPassword)\s+'[^']*'/g) ?? [];

  expect(secrets).toEqual(["storePassword 'android'", "keyPassword 'android'"]);
  expect(patched).not.toMatch(/\/Users\/|\/home\/|\.jks/);
});

test('never prints the signing properties', () => {
  expect(patched).not.toMatch(/println|logger\.|System\.out/);
});

test('release signing is skipped when properties are missing', () => {
  expect(patched).toContain("project.hasProperty('SM_UPLOAD_STORE_FILE')");
  expect(patched).toContain("project.hasProperty('SM_UPLOAD_STORE_PASSWORD')");
  expect(patched).toContain("project.hasProperty('SM_UPLOAD_KEY_ALIAS')");
  expect(patched).toContain("project.hasProperty('SM_UPLOAD_KEY_PASSWORD')");
  expect(patched).toContain('signingConfig signingConfigs.debug');
  expect(patched).toContain(`throw new GradleException('${MESSAGE}')`);
  expect(patched).toContain("['bundleRelease']");
  expect(patched).not.toContain('assembleRelease');
  expect(patched).not.toContain('assembleDebug');
  expect(MESSAGE).toBe(
    'Release signing is not set up: add SM_UPLOAD_* to ~/.gradle/gradle.properties (see DEPLOY.md).',
  );
});

test('the release build type uses the release key when it exists', () => {
  const releaseType = patched.slice(patched.indexOf('release {', patched.indexOf('buildTypes {')));

  expect(releaseType).toContain('signingConfig signingConfigs.release');
  expect(releaseType.indexOf('hasProperty')).toBeLessThan(releaseType.indexOf('signingConfigs.release'));
});

test('running the plugin twice changes nothing', () => {
  expect(addReleaseSigning(patched)).toBe(patched);
  expect(patched.match(/@sm-release-signing/g)).toHaveLength(2);
});

test('a build.gradle with an unexpected layout fails with a clear error', () => {
  expect(() => addReleaseSigning('android {}')).toThrow('unexpected layout');
});
