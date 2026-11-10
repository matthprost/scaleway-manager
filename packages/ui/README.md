# @scaleway-manager/ui

The design system in code: `src/tokens/`, `src/theme/`, `src/components/`, `src/charts/` (the spending chart and its maths), `src/layout/` and `src/gallery/`. See `docs/architecture.md` and `docs/design-system.md`.

**Belongs here:** every colour and size (colours only in `src/tokens/`), the light and dark themes, and every visual building block the app uses. Components take simple values (a title, a status, numbers). Tokens are also exported on their own from `@scaleway-manager/ui/tokens`.

**Never here:** anything that knows about Scaleway, `@scaleway-manager/core` or `@scaleway-manager/adapters`. Lint blocks these imports.

A screen that needs something new gets it added here first, never as a one-off inside `apps/mobile`.
