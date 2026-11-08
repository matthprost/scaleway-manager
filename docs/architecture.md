# Architecture

Scaleway Manager uses a **hexagonal architecture** (also called "ports and adapters"). The idea is simple: the heart of the app knows nothing about phones, screens or the network. Everything else plugs into it.

The repo is one `pnpm` workspace with an app and a few packages.

## The six parts

| Part | Where | What it is |
| --- | --- | --- |
| **Core** | `packages/core` (`domain/`, `use-cases/`) | What the app *is*: types (an instance, a month of spending, money), rules (the "by month end" projection) and actions (load the spending of a month, reboot an instance). Plain TypeScript. |
| **Ports** | `packages/core` (`ports/`) | The interfaces the core needs from outside: spending source, instances source, session store, biometric lock, connectivity, clock. The core only talks to these interfaces, never to a real service. |
| **Adapters** | `packages/adapters` | The real things behind the ports. `scaleway` calls `api.scaleway.com` and the public status page. `demo` returns fake data with no network. `device` uses the phone: secure storage, Face ID, connectivity, and the browser and receiver used to log in. |
| **Login receiver** | `packages/login-receiver` | Our own small native module (Swift + Kotlin). During login it listens on the phone's loopback addresses (`127.0.0.1` and `::1`) to catch Scaleway's `localhost` redirect. Only `adapters/device` uses it. See "Logging in" below. |
| **App** | `apps/mobile` | Screens (`app/`, one file per screen with Expo Router), features (`src/features/<feature>`: data hooks with TanStack Query and screen composition) and the **wiring** (`src/wiring/`), the only place that picks real or demo adapters. |
| **UI** | `packages/ui` | The design system in code: tokens (colours, sizes), themes, components, charts and the gallery. It knows nothing about Scaleway: components take simple values (a title, a status, numbers). |

## Who may import whom

An arrow means "imports". Every arrow points inward, towards the core. Nothing points out of it. `login-receiver` is a dead end: it imports no project package.

```
                         apps/mobile
          +-----------------------------------------+
          |  app/ + src/features/       src/wiring/ |
          +------+-------------+-------------+------+
                 |             |             |
                 |             |             v
                 |             |   +-------------------+
                 |             |   | packages/adapters |
                 |             |   | scaleway | demo   |
                 |             |   | device            |
                 |             |   +---------+----+----+
                 |             |             |    |  device only
                 |             |             |    v
                 |             |             |  +-------------------------+
                 |             |             |  | packages/login-receiver |
                 |             |             |  | Swift + Kotlin          |
                 |             |             |  +-------------------------+
                 v             v             v
         +-------------+   +-------------------------+
         | packages/ui |   |      packages/core      |
         | tokens,     |   |  domain, ports,         |
         | components  |   |  use cases              |
         +-------------+   +-------------------------+
```

## The rules

These are checked by lint (`pnpm lint`) and by each package's dependencies, not just written down.

- **`core` imports no project or framework package.** No React, React Native, Expo or TanStack Query, and no other `@scaleway-manager/*` package.
- **`adapters/scaleway` and `adapters/demo` import only `core`.**
- **`adapters/device` imports `core`, Expo modules and `@scaleway-manager/login-receiver`** (our small native module that catches the login redirect). Never React, the UI, or the `scaleway` and `demo` adapters.
- **`login-receiver` imports no project package**, and only `adapters/device` imports it: nothing in `apps/mobile` (`app/` or `src/`, wiring included) does.
- **`ui` never imports `core` or `adapters`.**
- **Only `apps/mobile/src/wiring/**` imports `adapters`.**
- **Colours exist only in `packages/ui/src/tokens/`.** The one exception is `apps/mobile/app.config.ts`, because native config can't import TypeScript tokens.
- **No styling in the app.** `apps/mobile/app/**` and `apps/mobile/src/features/**` use no `style` prop, no `StyleSheet` and no visual `react-native` components (`View`, `Text`, `Pressable`…), and never import `expo-linear-gradient`, `expo-blur`, `react-native-svg` or `lucide-react-native` directly. They compose `@scaleway-manager/ui` only. A screen that needs something new gets it added to `packages/ui` first.
- **No sizes in the app either.** Screens never type a number as a prop value (`size={72}`): they pass a ui token (`sizes.logoHero`) or use the component's default. And nothing in `apps/mobile` imports `expo-status-bar`: the ui `StatusBar`, drawn once in `app/_layout.tsx`, is the only one.
- **Network access** is limited to `https://api.scaleway.com`, `https://account.scaleway.com` (login page) and `https://status.scaleway.com`, plus the app's own login receiver on the loopback addresses (`127.0.0.1` and `::1`), which runs only during login. No analytics, crash reporting or `expo-updates`. To know if it is online, the app only asks the phone whether it has a network: NetInfo's own internet check (which pings Google every minute) is turned off.
- **Code rules:**
  - conditional JSX uses `cond ? <X /> : null`, never `&&`;
  - a blank line before every `return`, and between JSX sections;
  - no non-null assertion (`!`);
  - no helper function that is called only once;
  - React types come from `import type { ReactNode } from 'react'`, never `React.ReactNode`;
  - code comments stay short.
- **UI rules:** buttons placed side by side use the same explicit `size` and `fill`, and their row stretches them to the same height; UI copy is English, in sentence case and plain words; every animation has a "Reduce Motion" path (a plain fade of at most 250 ms).
- **Tools:** `pnpm` only. Expo and React Native packages are installed with `pnpm expo install` inside `apps/mobile`, so their versions match the Expo SDK.

## Logging in

Scaleway only sends a finished login to a `localhost` address (an app address like `scalewaymanager://…` is refused). We also want every Scaleway sign-in method to work: password, Google, passkeys and company single sign-on. So, like Scaleway's CLI:

- the login page opens in the phone's **real browser** (`ASWebAuthenticationSession` on iOS, a Chrome Custom Tab on Android, both through `expo-web-browser`), so the user's existing sign-ins and passkeys just work;
- a tiny receiver inside the app (`packages/login-receiver`) listens on `127.0.0.1` **and** `::1` (browsers try `::1` first for `localhost`, so we hold both on the same port and no other app can sit there), **only while the login is open**, to catch the redirect that carries the token.

The core use case `loginWithBrowser` runs the whole thing through three ports: `LoginReceiverPort` (`adapters/device/loginReceiver.ts`), `AuthBrowserPort` (`adapters/device/authBrowser.ts`) and `AuthPort` (`adapters/scaleway/auth.ts`). In demo mode, `adapters/demo/login.ts` starts nothing and the browser answers "cancelled" at once.

```
 App (loginWithBrowser)     Login receiver           Browser               Scaleway
                         (127.0.0.1 + ::1)           (Safari / Chrome)
        |                        |                        |                     |
        |-- start() ------------>|  listens on 47815      |                     |
        |<-- port 47815 ---------|  (or 47816 ... 47830)  |                     |
        |                        |                        |                     |
        |-- open(login URL, redirect = http://localhost:47815/callback) ------->|
        |                        |                        |-- user signs in --->|
        |                        |                        |<-- redirect to -----|
        |                        |                        |   localhost:47815/callback?token=...
        |                        |<-- GET /callback?... --|                     |
        |                        |  keeps the token       |                     |
        |<-- nextCallback() -----|-- small reply page --->|                     |
        |                        |                        |-- scalewaymanager://auth/done
        |-- close() ------------------------------------->|  (back to the app)  |
        |-- keeper.startFromCallback(): session saved     |                     |
        |-- stop() ------------->|  port closed           |                     |
```

On Android, `close()` can't close the Custom Tab (the receiver's page sends the user back by itself), so it waits until the app is in front again (`AppState` back to `active`) before the session is saved: screens changed while the app is hidden behind the tab crash Android's renderer (Fabric) when the app returns, all at once.

If the user closes the browser instead, `open` answers "cancelled", nothing was received, and `stop()` closes the port. `stop()` always runs, even after an error. On every exit other than "signed in" (cancelled or an error), the app first closes the browser, so the user can't finish signing in towards a port the app is about to let go. (Android can't close a Chrome Custom Tab from the app, so there this does nothing.)

The receiver only answers `GET /callback…` (everything else gets a 404), reads at most 64 KB per request within 10 s, and never logs the address it receives, because it holds the token. It sends its reply page before telling the app, so the browser always gets the page that brings it back. If `::1` can't be taken for any reason other than the phone having no IPv6 loopback at all, the receiver never settles for `127.0.0.1` alone: it moves to the next port (during an iOS re-bind, that try counts as failed). On iOS 27, the Network framework refuses to open `::1` on a port it already holds on `127.0.0.1` (`EADDRINUSE`); instead of moving on, the receiver holds `::1` with a plain IPv6-only socket (bound, not listening), so no other app can take it, and the browser reaches it on `127.0.0.1` alone. On iOS, if the system takes the port back while the user is in another app (for example to copy a 2FA code), the receiver binds the same port again right away, then once more when the app becomes active (or a second later if it already is). If that last try fails, `nextCallback` rejects with `LISTENER_LOST`: the login ends with an error and the browser is closed. It never switches ports mid-login, because the browser already has the address.

**Known limit:** any app on the phone could send its own fake callback (`GET /callback?token=<its own>`) to the receiver while a login is open. Scaleway's flow (the same one as its CLI) has no `state` value we could check. Worst case, the user ends up signed in to the other app's account, or the login fails. We accept this for now.

## Keeping the session

The session (the token, the renew token and a few details) lives in the phone's secure storage, through `expo-secure-store` (`adapters/device/secureSessionStore.ts`).

- It can only be read while the phone is unlocked, and **only on this phone**: it is never in a backup and never moves to a new phone.
- Android backup is off for the whole app (`allowBackup: false` in `app.config.ts`), and the `expo-secure-store` plugin also keeps the session out of it. Nothing else the app stores goes into a phone backup either: the cache and invoice files are in the cache folder, and iOS leaves the app's saved data out of backups.
- On iOS, the saved session outlives removing the app. So the first time the app reads it after an install (the plain key-value store has no "installed" marker yet), it wipes whatever an old install left, then writes the marker. After a reinstall, the user logs in again.
- After the first read, the store keeps the session in memory, so requests don't read the secure storage each time. Saving updates that copy only once the write worked; clearing empties it first.
- Saves and wipes reach the secure storage one at a time, in the order they were asked, so a wipe asked after a save always lands last. A save asked before a wipe doesn't put the session back in memory, even if it ends after it.

## Logging out

- **The phone is signed out at once:** the saved session is wiped and the app is told. Only then, in the background, the app asks Scaleway to end the session on its side ("revoke"). If that fails or never answers, the user is still signed out.
- A renew that was running during the log out can't bring the session back, even one that was already saving: it sees it is outdated, gives up and never announces the renewed session.
- Every request to Scaleway gives up after 20 seconds and counts as "offline", so a bad network never blocks the app. A caller can still cancel it sooner with its own `signal` (for example when the user leaves a screen).

## Switching organization

Scaleway gives the app one token per organization, and no API to list an account's organizations: only its sign-in page lists them, and only after a full sign-in (a saved session skips the list). So "Switch organization" (Account, the project picker) runs the same login as above, but in a fresh, private browser session, so Scaleway shows its sign-in page and lists the account's organizations to pick from: `AuthBrowserPort.open(url, returnUrl, { fresh: true })` turns on `preferEphemeralSession` on iOS (Android's custom tab has no such option, so there it keeps its saved session). The auth browser also closes a leftover sign-in sheet iOS never showed (`dismissAuthSession`) before opening a new one, so the new one never finds "already open".

- **No question first, and no sign-out first:** the row shows `loading` while the page is open, and the current session stays until the new one is saved.
- **Cancel changes nothing:** still signed in, same organization, same screen.
- **A failure** shows the quiet failure line under the row, not Welcome's login error.
- **Success:** the app goes to Home in the new organization, and the project picker's sheet closes if that's where the switch started.
- The session keeper ends the replaced session (`auth.revoke`, best effort, as on sign-out) and tells its listeners which session a login replaced (`subscribe((session, replaced) => …)`; `'unknown'` when the old session couldn't be read: it still counts as replaced, but there is nothing to revoke). A renew that started during the login is outdated once the new session is saved, so it can't bring the old one back. The root layout's one wipe of cached and saved data (see "The session and the lock in the app") now also runs whenever a login replaces another session, not only on sign-out, so nothing of the old organization stays (the same user may come back with another organization). The tabs are built again too (`useSession().switches` is their `key`), so a tab opened before the switch never keeps showing the old organization's data. A renew replaces nothing, so it keeps the data.

## Keeping data fresh

TanStack Query holds the data, and the wiring tells it about the phone (`src/wiring/queryClient.ts`, bound once in `app/_layout.tsx`):

- **The network:** `bindOnlineManager` pauses requests while offline and refreshes stale data when the network is back.
- **The app coming back:** `bindFocusManager` tells it when the app goes to the background and comes back (`AppState`; `inactive`, a Face ID prompt or Control Center, doesn't count). Back in the app, data older than 30 seconds that is out of date is asked again (`FOCUS_REFRESH_AFTER`), so Home and Billing are never yesterday's after a night away, and a quick trip to another app asks nothing. While away, refresh timers wait (Home's alerts every minute).
- **Actions on resources are never queued.** They go through `useResourceAction` (`src/features/resources/`), which calls the port directly, never `useMutation`: a paused mutation would be sent when the network comes back, and saved with the cache, so a "Power off" tapped offline could happen hours later. Each action is refused offline at the tap and again at the confirm, and sent once. If it fails, the resource is asked again at once, because a request that timed out may still have reached Scaleway.

## The session and the lock in the app

- **One reader:** a `SessionProvider`, drawn once in `app/_layout.tsx`, reads the saved session once at launch and then follows its changes. Every screen asks it with `useSession()`. After a switch between real and demo, it says "loading" until the new session is read.
- **Every sign-out ends the same way**, whether the user logged out or Scaleway refused to renew the session: the root layout sends the user back to Welcome from whatever screen is showing (a screen pushed above the tabs too: `useSignedOutRedirect`), and wipes the cached and saved data. Each lives in one place, so nobody is left on a screen without a session, and the next person to log in never sees the previous person's data.
- **Nothing in the app switcher.** With the lock on, while the app is inactive or in the background, a purple cover with only the logo hides it (and every open sheet), so the phone's snapshot of the app shows no data. The lock knows its setting before the app leaves (it reads it at sign-in and follows every change), because the snapshot can't wait for a read. On Android, which may take its snapshot before that cover is drawn, the lock also asks the phone to keep the screen private while it's on (`ScreenPrivacyPort`: `adapters/device/screenPrivacy.ts` sets `FLAG_SECURE` through `expo-screen-capture`, so screenshots come out blank too); it's lifted when the lock is turned off or on sign-out, and the demo adapter never sets it. On iOS the port does nothing. A new API key's secret is guarded even with the lock off: it shows dots while the app is away (`useAppActive`), and while it's on screen Android keeps the screen private too (`protect()`, then `allow()` once the secret step closes, unless the lock is on).
- **What stays after logging out, on purpose:** the project chosen for each organization (only ids), so switching back to an organization keeps its project; the appearance and the Face ID setting, which belong to the phone. Everything else (the cached and saved data, the pins, the invoice files) is wiped.
- **Known limit:** a system share sheet (an invoice's PDF) already open when the lock comes stays above it, because it is the system's own window and the app can't close it (`expo-sharing` has no dismiss). The app only stops a PDF that arrives once the lock is up from opening a new one.
- **Screen privacy follows the services in use:** `allow()` goes to the current `ScreenPrivacyPort`. Swapping real for demo while the screen is protected would leave Android's `FLAG_SECURE` on, but that can't happen today: the demo starts from Welcome (signed out), and signing out already lets it go. A future "switch to the demo while signed in" must call `allow()` first.
- **The lock covers first, checks after.** The lock setting is read when the app goes to the background. When it comes back after 5 minutes or more, the lock covers the app at once; only then does it check Face ID (or the fingerprint). The app never shows for a moment before the lock. If that read hasn't answered yet when the app comes back, the lock covers anyway, reads the setting once more, and uncovers if the lock is off.

## Demo mode is just the `demo` adapters

Demo mode is not a special case spread across the app. When someone starts the demo, the wiring hands the `demo` adapters to the app instead of the `scaleway` ones. The use cases, hooks and screens are exactly the same; they just get fake data, and nothing goes over the network. Demo mode ignores connectivity: its connectivity adapter always says online (whatever the phone says), its queries run whatever the network says (`networkMode: 'always'`, set by `createQueryClient(mode)` and on every mode switch), and `useIsOnline()` is always `true` in demo, so no action is turned off as offline. The few places that look at `mode` only change what is shown: the Demo badge, no Face ID lock, no "Switch organization", and an invoice tap that says "Invoices aren't available in the demo." instead of sharing a PDF that doesn't exist.

Who sees the demo: everyone. Welcome shows "Try the demo" in every build (store reviewers use it too), and three quick taps on the logo open it as well. A demo mode saved on the phone keeps working on any build. Store screenshot builds are the only build setting (`src/wiring/buildConfig.ts`, so screens never read `process.env`).

Store screenshot builds add `EXPO_PUBLIC_SCREENSHOTS=1` (`screenshotBuild` in `buildConfig.ts`), so the screenshots look like the real app: the demo hides its Demo badge (and the header no longer makes room for it), and `createServices` gives the demo a clock that starts on the 18th of the current month at 09:41 and runs on from there, so the month-end guess and the dates look natural whatever day the screenshots are taken. Real mode is untouched. Such a build is never uploaded.

## Adding a feature

Always in this order:

1. **Domain type** in `packages/core/src/domain`.
2. **Port** (the interface the use case needs) in `packages/core/src/ports`.
3. **Use case**, with its tests, in `packages/core/src/use-cases`, only when there is logic to run (a hook may call a port directly).
4. **`scaleway` adapter**, with its tests, in `packages/adapters/src/scaleway`.
5. **`demo` adapter** in `packages/adapters/src/demo`.
6. **Hook** in `apps/mobile/src/features/<feature>`, calling the use case (or the port) through TanStack Query.
7. **Screen**, built only from `@scaleway-manager/ui` components.
