# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Strategy Board is a digital strategy whiteboard for FIRST Robotics Competition (FRC). Teams draw plays on virtual field images, collaborate via cloud share codes and QR codes, and import match data from The Blue Alliance and Statbotics APIs. Ships as a web app, PWA, Electron desktop (Mac/Win/Linux), and Capacitor mobile app (iOS/Android).

## Commands

**Use `bun` — not npm, yarn, or pnpm.**

```bash
bun dev                  # Start Vite dev server
bun run build            # tsx scripts/commit.ts + tsc + vite build
bun run spell            # cspell spell checker
bun run electron:dev     # Run Electron in dev mode
bun run electron:build   # Build Electron for current platform
bun run electron:build:mac   # macOS (x64 + arm64)
bun run electron:build:win   # Windows (x64)
bun run electron:build:linux # Linux (x64)
bun run cap:sync         # Build + sync Capacitor
bun run cap:run:ios      # Build + run on iOS
bun run cap:run:android  # Build + run on Android
bun run cap:open:ios     # Open in Xcode
bun run cap:open:android # Open in Android Studio
```

There are **no automated tests**. Manual testing across platforms is required.

## Architecture

Vanilla TypeScript, no React/Vue/Angular. All UI is direct DOM manipulation. Pattern:

```
User Action → view.ts → model.ts → db.ts (IndexedDB)
                  ↓
            whiteboard.ts (Canvas rendering)
```

### Core Modules (`src/`)

| Module | Purpose |
|--------|---------|
| **app.ts** | Entry point — parallelizes module imports with IndexedDB load, registers PWA service worker |
| **model.ts** | Match state — persists to IndexedDB under single `"appData"` key |
| **view.ts** | All DOM manipulation (~3200 lines) — event wiring, UI updates, panel management |
| **whiteboard.ts** | Canvas renderer (~2400 lines) — three layers: background, items, drawing |
| **match.ts** | Match data model and packet serialization/deserialization |
| **db.ts** | IndexedDB wrapper (idb-keyval) — `GET`, `SET`, `GETMANY`, `CLEAR` helpers |
| **cloud.ts** | Firebase/Firestore — upload/download matches via 6-char share codes |
| **qr.ts** | QR code export (generation) and import (camera scanning) |
| **tba.ts** | The Blue Alliance API client — match schedules, team info |
| **statbotics.ts** | Statbotics API client — team analytics and EPA predictions |
| **manager.ts** | Field image assets — `getFieldImageForYear()`, `preloadFieldImages()` |
| **search.ts** | Fuzzy search helpers for TBA events/teams |
| **pdf.ts** | PDF export of whiteboard snapshots |

### Important Patterns

**Lazy loading:** `cloud.ts` (Firebase), `tba.ts`, and `pdf.ts` are dynamically imported at their call sites in `view.ts` — they are **not** statically imported. Do not add static imports for them.

**IndexedDB storage:** All matches are stored under a single `"appData"` key as an array of packets. The legacy format (per-match keys + `"matchIds"`) is automatically migrated on first load. `db.ts` also caches Statbotics data under `"statbotics_<matchKey>"` keys.

**Canvas layers:** `whiteboard.ts` uses three overlapping `<canvas>` elements: background (field PNG), items (robots/pieces), drawing (user strokes). The Proxy pattern wraps each canvas element so rendering can start before DOM is ready.

**Cross-platform requirement:** Every change must work on web, Electron, iOS, and Android. Avoid browser-only or Node-only APIs without a guard. Electron-specific code lives in `electron/main.cjs`.

### Configuration

- **vite.config.ts** — Vite + PWA (Workbox) + Tailwind; path alias `@/` → `src/`; Firebase is in a separate `firebase` chunk via `manualChunks`
- **capacitor.config.ts** — App ID: `com.strategyboard.app`
- **electron/main.cjs** — Electron main process
- **tsconfig.json** — `strict: false`, target ES2022

### Environment Variables

Required in `.env`:
```
VITE_TBA_API_KEY=<The Blue Alliance API key>
VITE_FIREBASE_API_KEY=<Firebase project API key>
```

### Security / Dependency Overrides

`overrides` in `package.json` forces patched transitive dependency versions. When Dependabot can't auto-update a transitive dep, add it there.

### Deployment

- Web/PWA: Vercel (auto-deploy from `main`)
- Electron: manual via `bun run electron:build:*`
- Mobile: Xcode / Android Studio after `bun run cap:sync`
