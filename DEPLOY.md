# Deploy

How to build and send Scaleway Manager to the App Store and the Play Store. Only the owner can upload.

Never write passwords, keys or key file paths in this repo. It is public.

## Before you start

- Node.js 24 and pnpm 10, then `pnpm install` at the repo root.
- Xcode, signed in to the Apple developer team `8754A6XKT5` (Xcode > Settings > Accounts).
- Android Studio (for the Android SDK) and Java 17 (for example `brew install openjdk@17`).
- The Android upload key, set once in `~/.gradle/gradle.properties` on your Mac. Use these four names, with your own values:

```
SM_UPLOAD_STORE_FILE=<full path to your upload key file>
SM_UPLOAD_STORE_PASSWORD=<store password>
SM_UPLOAD_KEY_ALIAS=<key alias>
SM_UPLOAD_KEY_PASSWORD=<key password>
```

The build reads them through a small Expo plugin (`apps/mobile/plugins/withReleaseSigning.js`), so the key never touches the repo. Without them, a debug build still works, and `assembleRelease` still builds a debug-signed APK for local tests, but `bundleRelease` (the store bundle) stops with: `Release signing is not set up: add SM_UPLOAD_* to ~/.gradle/gradle.properties (see DEPLOY.md).` Never upload a debug-signed APK to a store.

If you lost the upload key, ask for a reset in the Play Console (App integrity > App signing), create a new key with `keytool -genkeypair -v -keystore <file> -alias <alias> -keyalg RSA -keysize 2048 -validity 10000`, and wait for Google to confirm before uploading.

## 1. Bump the version

Edit `apps/mobile/app.config.ts`:

- `version`: the number people see, for example `3.0.0`.
- `ios.buildNumber`: raise it for every new iOS upload (3.0.0 is at build `3`). iOS signing is only the team id `appleTeamId`; certificates stay in Xcode and your Keychain.
- `android.versionCode`: raise it for every new Android upload (it is `30003` for 3.0.0; it must stay above the last one in the Play Console).

Also set the same `version` in `apps/mobile/package.json`, so the two match.

## 2. Check

From the repo root:

```bash
pnpm test
pnpm lint
pnpm typecheck
```

## 3. Build

Build from a fresh terminal: `env | grep EXPO_PUBLIC` must print nothing, so no screenshot setting (`EXPO_PUBLIC_SCREENSHOTS`) gets into a store build.

```bash
cd apps/mobile
pnpm expo prebuild --clean
export JAVA_HOME="$(brew --prefix openjdk@17)"
export ANDROID_HOME="$HOME/Library/Android/sdk"
(cd android && ./gradlew bundleRelease)
xcodebuild -workspace ios/ScalewayManager.xcworkspace -scheme ScalewayManager -configuration Release \
  -archivePath ~/Library/Developer/Xcode/Archives/ScalewayManager.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates archive
```

- The Android bundle is `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.
- Run the Gradle build without `-q` and read the first lines: if it stops with the signing message, add the four names above.
- To check it is signed with your upload key (the SHA1 must match "Upload key certificate" in the Play Console, App integrity > App signing): `keytool -list -v -keystore <your key file> | grep SHA1`, and then `jarsigner -verify -verbose -certs apps/mobile/android/app/build/outputs/bundle/release/app-release.aab | grep -m1 "CN="`.
- The iOS archive appears in Xcode's Organizer (Window > Organizer) with the version and build you set.

The `ios/` and `android/` folders are made by `prebuild` and are not committed.

## 4. Upload

Always send a test build first.

- **iOS:** in the Organizer, pick the archive, then Distribute App > App Store Connect > Upload. Test it in TestFlight, then add it to a version and submit for review.
- **Android:** in the Play Console, create a release in Internal testing and upload the `.aab`. Test it, then promote it to Production.

## Store text and screenshots

- The store text and screenshots aren't kept in the repo. `pnpm --filter @scaleway-manager/mobile screenshots:frame` frames the captures in `apps/mobile/store/raw/` into `apps/mobile/store/framed/` (both git-ignored), with the captions from `apps/mobile/scripts/screenshots.config.ts`.
- The privacy policy link needs `PRIVACY.md` to be on `main` before you submit.
