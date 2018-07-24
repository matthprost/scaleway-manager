## Requirements

- IONIC - `npm install -g ionic`
- Cordova - `npm install -g cordova`

## Installation

1. Clone the repo
2. Run `npm install`

## Live build

1. Run `ionic serve`
2. Go on [http://localhost:8100/](http://localhost:8100/)

## Deploy iOS

1. Clone repo on a Mac
2. Run `npm install`
3. Run `ionic cordova build ios --prod` and wait till the result display "BUILD SUCCEEDED"
4. Open `plateforms/ios/.xcodeproj` in Xcode
5. Choose `Generic iOS Device` on the top and change `Build` and `Version`
6. Do this: `Product > Archive` and wait till the pop-up open
7. Then `Upload to App Store... ` and the rest is on App Store Connect
