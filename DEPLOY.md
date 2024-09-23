This file is a personal reminder for deploy, don't mind about it :)

## Prerequisite

Whatever platform you're trying to test or to deploy you need your packages to be installed:

```sh
rm -rf node_modules && npm i
```

## iOS

#### Requirements

- Macbook (Can be a VM with VMWare but expect it to be slow as hell)
- Xcode
- Ionic
- Capacitor

#### Build

1. Run `yarn run build:ios`
2. It should open xcode, you can start it on any emulator or device

#### Deploy

1. Run `yarn run build:ios`
2. Change the version of the app + build number in xcode
3. Click on `Product > Archive` then `Distribute App` and follow the steps
4. That's it, it should be on App Store Connect

## Android

#### Requirements

- Android Studio
- Android SDK
- Ionic
- Capacitor

#### Test

1. Run `yarn run build:android`
2. It should open Android Studio, you can start it on any emulator or device

#### Deploy

1. Run `yarn run build:android`
2. Change version into `android > app > build.gradle`:
```
versionCode 20005
versionName "2.0.5"
```
3. Then `Build > Generate Signed Bundle / APK > Android App Bundle` choose Key Store (*/mypath/mykey.jks*) and put `scaleway` as alias
4. Upload manually `.aab` file on Google Play Store
