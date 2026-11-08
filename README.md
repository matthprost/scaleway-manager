<p align="center">
  <img src="apps/mobile/assets/icon/icon.png" width="128" alt="Scaleway Manager logo"/>
</p>

# Scaleway Manager

Check your Scaleway spending, servers and alerts from your phone. Open source, free, and nothing is tracked.

### Download

**Apple Store**: https://itunes.apple.com/us/app/scaleway-manager/id1415090286?mt=8

**Google Play Store**: https://play.google.com/store/apps/details?id=com.matthiasprost.scalewaymanager

---

### Features

- Spending by product, by project and by month, with a monthly chart.
- Live resources on the Home screen, with the ones you pinned first.
- Monitoring alerts that are firing, and the Scaleway status.
- Instances, Elastic Metal, Kubernetes, Managed Databases, Serverless Containers, Functions, Jobs and Load Balancers.
- Simple actions like start, stop and reboot, always with a confirmation.
- Invoices (PDF), SSH keys, API keys and the activity log.
- Face ID or fingerprint lock, light and dark mode, and an offline view of your last data.

### Privacy

The app talks only to Scaleway and has no analytics, no crash reports and no third parties. Your login stays in your phone's secure storage. Read more in [PRIVACY.md](PRIVACY.md).

### Independent app, not affiliated with Scaleway

Scaleway Manager is an independent, open-source app. It is not made by or affiliated with Scaleway.

---

### Development

##### Requirements

- Node.js 24
- pnpm 10
- Xcode (for iOS) and Android Studio (for Android)

##### Installation

1. Clone the repo
2. Run `pnpm install`

##### Run the app

The app uses its own native module (the login receiver), so it can't run in Expo Go. Build it once for a simulator:

```bash
cd apps/mobile
pnpm expo prebuild --clean   # creates the ios/ and android/ folders (not committed)
pnpm expo run:ios            # iPhone simulator
pnpm expo run:android        # Android emulator
```

If Android can't find Java or the Android SDK, tell it where they are first (a Java 17, for example `brew install openjdk@17`, and the SDK Android Studio installs):

```bash
export JAVA_HOME="$(brew --prefix openjdk@17)"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

After that, `pnpm --filter @scaleway-manager/mobile start` is enough while you only change JavaScript.

No Scaleway account? The demo shows sample data and makes no network calls. Tap "Try the demo" on the Welcome screen (three quick taps on the logo work too).

##### Checks

- `pnpm test`: unit tests of every package
- `pnpm lint`: code rules and package boundaries
- `pnpm typecheck`: TypeScript in every package

---

### Architecture

The app is split in parts that only import in one direction, towards a plain TypeScript core. See [docs/architecture.md](docs/architecture.md) for the parts and the rules, and [docs/design-system.md](docs/design-system.md) for colours, components and motion.

### Contributing

- Build screens with the design system in `packages/ui`. If something is missing, add it there first.
- Run the design reviewer (`.claude/agents/design-reviewer.md`) on screen changes.
- Follow the code rules in [docs/architecture.md](docs/architecture.md), then run `pnpm test`, `pnpm lint` and `pnpm typecheck`.

### License

LGPL-3.0. See [LICENSE](LICENSE).

---

### Contributors

##### Quentin Lejard - valde

 GitLab: [https://framagit.org/valde](https://framagit.org/valde)

 Twitter: [https://twitter.com/__valde__](https://twitter.com/__valde__)
