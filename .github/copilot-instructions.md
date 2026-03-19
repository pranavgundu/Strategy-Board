# Strategy Board

Digital strategy whiteboard for FIRST Robotics Competition (FRC). Cross-platform: web/PWA, Electron desktop (Mac/Win/Linux), Capacitor mobile (iOS/Android).

## Commands

```bash
bun dev                # Vite dev server
bun run build          # TypeScript check + Vite production build
bun run lint           # ESLint
bun run lint:fix       # ESLint with auto-fix
bun run spell          # cspell spell checker
bun run electron:dev   # Electron dev mode
bun run electron:build # Electron build (current platform)
bun run cap:sync       # Build + sync Capacitor apps
```

There are no automated tests. Validate changes with `bun run build` and manual testing.

## Architecture

**This is NOT a React/Vue/Angular app.** All UI is vanilla TypeScript with direct DOM manipulation.

```
User Action → view.ts → model.ts → db.ts (IndexedDB)
                  ↓
            whiteboard.ts (Canvas rendering)
```

- **app.ts** — Entry point. Lazy-imports modules in parallel, initializes `Model` → `Whiteboard` → `View`.
- **view.ts** — All DOM manipulation and event binding (~3200 lines). Uses `document.getElementById` via a local `get()` helper.
- **whiteboard.ts** — Multi-layer canvas renderer (~2400 lines). Three layers: background (field image), items (robots/game pieces), drawing (user annotations).
- **model.ts** — State management. Plain classes/arrays, no state library. Persistence is explicit via `model.persist()`.
- **match.ts** — Match data model with `toPacket()`/`fromPacket()` serialization.
- **db.ts** — IndexedDB wrapper using `idb-keyval`. Exports uppercase functions (`GET`, `SET`, `CLEAR`, etc.).
- **cloud.ts** — Firebase/Firestore sync. Matches shared via 6-character codes.
- **tba.ts** / **statbotics.ts** — External API clients (The Blue Alliance, Statbotics).
- **config.ts** — Field dimensions and robot station coordinates. Reads env vars via `import.meta.env`.

## Key Conventions

- **Package manager**: bun (not npm/yarn/pnpm)
- **Path alias**: `@/` maps to `src/` (configured in `vite.config.ts`)
- **TypeScript**: `strict: false`, no implicit-any errors, target ES2022
- **ESLint**: `@typescript-eslint/no-explicit-any` is off; unused vars are warnings (prefix with `_` to suppress)
- **Imports**: Use `.ts` extensions in import paths (e.g., `import { Model } from "./model.ts"`)
- **DOM access pattern**: Elements looked up by ID via `const get = (id) => document.getElementById(id)`
- **DB function naming**: IndexedDB wrappers are UPPERCASE (`GET`, `SET`, `GETMANY`, `CLEAR`)
- **New features**: Create a module in `src/`, add HTML in `index.html`, wire events in `view.ts`, extend `model.ts` for state
- **Canvas changes**: Edit `whiteboard.ts`; layers render in order: background → items → drawing

## Cross-Platform

Changes must work on all platforms. Web/PWA code lives in `src/`. Electron-specific code is in `electron/main.cjs`. Capacitor native projects are in `android/` and `ios/`.

## Environment Variables

Required in `.env`:
```
VITE_TBA_API_KEY=<The Blue Alliance API key>
VITE_FIREBASE_API_KEY=<Firebase API key>
```
