# @scaleway-manager/core

What the app *is*, in plain TypeScript. See `docs/architecture.md`.

**Belongs here**
- `src/domain/`: types and rules (an instance, a month of spending, the "by month end" projection).
- `src/ports/`: the interfaces the core needs from outside (spending source, session store, clock…).
- `src/use-cases/`: the actions built on those ports, each with its tests.

**Never here:** React, React Native, Expo, TanStack Query, network calls, or any other `@scaleway-manager/*` package. Lint blocks these imports.
