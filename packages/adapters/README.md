# @scaleway-manager/adapters

The real things behind the core ports. Each folder is its own entry point. See `docs/architecture.md`.

**Belongs here**
- `src/scaleway/` (`@scaleway-manager/adapters/scaleway`): calls to `api.scaleway.com` and the public status page. Imports only `@scaleway-manager/core`.
- `src/demo/` (`@scaleway-manager/adapters/demo`): fake data, no network. This *is* demo mode. Imports only `@scaleway-manager/core`.
- `src/device/` (`@scaleway-manager/adapters/device`): the phone's features (secure storage, Face ID, connectivity) through Expo modules. Never imports `src/scaleway/` or `src/demo/`.

**Never here:** React, screens or `@scaleway-manager/ui`. Only `apps/mobile/src/wiring` imports this package.
