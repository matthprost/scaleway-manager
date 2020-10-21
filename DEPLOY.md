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

#### Test

1. Run `ionic cap update`
2. Run `ionic cap open ios`
3. Choose the device you want then click on run button

#### Deploy

1. Run `ionic capacitor build ios --prod`
2. Choose `Generic/Any iOS Device` on the top and change `Build` and `Version` and verify `Signing & Capabilities`
3. Do this: `Product > Archive` and wait till the pop-up open
4. Then `Upload to App Store... ` and the rest is on App Store Connect

## Android

#### Requirements

- Android Studio
- Android SDK
- Ionic
- Capacitor

#### Test

1. Run `ionic cap update`
2. Run `ionic cap open android`
3. Choose the device you want then click on run button

#### Regenerate Android Icons

1. `ionic cap open android`
2. `app > res`  then right click `new > Image Asset`\
Resize: `50%`, Background: `#510099`

#### Deploy

1. Change version into `android > app > build.gradle`:
```
versionCode 20005
versionName "2.0.5"
```

1. Run `ionic cap build android --prod`
2. Then `Build > Generate Signed Bundle / APK > Android App Bundle` choose Key Store (*/mypath/mykey.jks*) and put `scaleway` as alias
3. Upload manually `.aab` file on Google Play Store

