# @scaleway-manager/login-receiver

Our own small native module (Swift + Kotlin, Expo Modules API) that catches Scaleway's login redirect. See `docs/architecture.md`.

Scaleway only redirects a login to `http://localhost:<port>/callback`. So while the user signs in, the app listens on the loopback addresses `127.0.0.1` and `::1`, the way Scaleway's CLI does. It's our code, not a third-party server library, so we control everything that touches the token.

**API** (`src/index.ts`)
- `start(): Promise<{ port: number }>`: listens on `127.0.0.1` and `::1`, port `47815`, or the next port where both are free, up to `47830`. Rejects with `NO_PORT` if none is free.
- `nextCallback(): Promise<string>`: resolves with the first callback's request target (`/callback?token=…`), after the reply page is sent. Rejects with `LISTENER_LOST` (iOS) if the port can't be bound again, `NO_PORT` if it was called while `start()` found no free port, `STOPPED` on `stop()`.
- `received(): string | null`: that same target, or `null` if none arrived yet.
- `stop(): Promise<void>`: closes the listener and every connection, and forgets the target. Safe to call twice.

**Behaviour (same on iOS and Android unless noted)**
- Only the loopback addresses (`127.0.0.1` and `::1`, same port): nothing outside the phone can reach it, and no other app can take the `::1` side (browsers try it first for `localhost`). If `::1` can't be bound for any reason (busy or otherwise), we move to the next port; only a phone with no IPv6 loopback at all gets `127.0.0.1` alone. It only runs during login.
- iOS: if the system takes the port back while the app is in the background, the same port is bound again right away, then once more when the app becomes active (or a second later if it already is). If that fails too, `nextCallback` rejects with `LISTENER_LOST`. Never another port: the browser already has the address.
- Reads at most 64 KB per request, within 10 s.
- The first `GET /callback…` is kept, answered with a small page that sends the browser back to `scalewaymanager://auth/done`. The app hears about it only after the page is sent. Later callbacks get the same page and are ignored. Anything else gets a `404`.
- Never logs the request target: it holds the session token.

**Files:** `ios/LoginReceiverModule.swift` (Network.framework), `android/src/main/java/app/scalewaymanager/loginreceiver/LoginReceiverModule.kt` (`ServerSocket`). Tests check that both send exactly the same reply page, bind both loopback addresses, and keep `127.0.0.1` alone only when there is no IPv6 loopback.

**Never here:** any other `@scaleway-manager/*` package. Only `@scaleway-manager/adapters/device` imports this one. Native changes need a new dev build (`expo prebuild`, then `expo run:ios` / `expo run:android`).
