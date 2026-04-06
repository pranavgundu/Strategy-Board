# Strategy Board - Gemini Context

This file provides essential context for Gemini CLI when working in this repository.

## Project Overview

**Strategy Board** is a digital strategy whiteboard specifically designed for FIRST Robotics Competition (FRC) teams. It allows users to plan and visualize match strategies (Auto, Teleop, Endgame) using virtual field images and robot representations.

### Key Features:
- **Multi-Platform:** Ships as a Web app (PWA), Desktop app (Electron for Mac/Win/Linux), and Mobile app (Capacitor for iOS/Android).
- **Real-time Collaboration:** Share matches via 6-character cloud codes or QR codes.
- **Data Integration:** Pulls team and match data from **The Blue Alliance (TBA)** and analytics from **Statbotics**.
- **Offline First:** Uses IndexedDB for local persistence, ensuring reliability at competitions.

## Tech Stack
- **Language:** Vanilla TypeScript (no frontend framework like React/Vue).
- **Build Tool:** Vite.
- **Styling:** Tailwind CSS.
- **Persistence:** IndexedDB (via `idb-keyval`).
- **Backend/Cloud:** Firebase Firestore (for sharing).
- **Platforms:** Electron (Desktop), Capacitor (Mobile).

## Building and Running

Always use `bun`.

### Core Commands:
- `bun dev`: Start the Vite development server.
- `bun run build`: Build the web application (runs `scripts/git.ts`, `tsc`, and `vite build`).
- `bun run lint`: Run ESLint on `src/`.
- `bun run spell`: Run `cspell` for spell checking.

### Desktop (Electron):
- `bun run electron:dev`: Run Electron in development mode.
- `bun run electron:build`: Build Electron for the current platform.
- `bun run electron:build:mac | :win | :linux`: Targeted builds.

### Mobile (Capacitor):
- `bun run cap:sync`: Build web assets and sync with native projects.
- `bun run cap:run:ios | :android`: Build and run on a connected device/emulator.
- `bun run cap:open:ios | :android`: Open the project in Xcode or Android Studio.

## Architecture & Modules

The application follows a custom MVC-like architecture focused on direct DOM manipulation and Canvas rendering.

### Data Flow:
`User Action → view.ts → model.ts → db.ts (IndexedDB)`
`model.ts → whiteboard.ts (Canvas rendering)`

### Core Modules (`src/`):
- `app.ts`: Entry point; initializes the model, registers the PWA service worker, and parallelizes module imports.
- `view.ts`: UI controller (~3200 lines); handles all DOM manipulation, event binding, and panel management.
- `whiteboard.ts`: Canvas rendering engine (~2400 lines); manages three layers (background, items, drawing).
- `model.ts`: Central state management; handles match data and IndexedDB persistence.
- `match.ts`: Match data model and serialization logic.
- `db.ts`: IndexedDB wrapper for local storage.
- `cloud.ts`: Firebase integration for cloud sharing (lazy-loaded).
- `tba.ts`: The Blue Alliance API client (lazy-loaded).
- `statbotics.ts`: Statbotics API client for team analytics.
- `manager.ts`: Asset management for field images.

## Development Conventions

1. **Vanilla TS & DOM:** Avoid adding external UI frameworks. Use direct DOM manipulation in `view.ts`.
2. **Lazy Loading:** Heavy modules (`cloud.ts`, `tba.ts`, `pdf.ts`) must be dynamically imported at call sites to keep initial bundle size small.
3. **Cross-Platform Compatibility:** Ensure all changes work across Web, Electron, iOS, and Android. Avoid Node-only or Browser-only APIs without appropriate guards.
4. **Persistence:** Use the single `"appData"` key in IndexedDB for match storage. Statbotics data is cached under `"statbotics_<matchKey>"`.
5. **Canvas Layers:** `whiteboard.ts` uses three overlapping `<canvas>` elements for optimized rendering (Background, Items, Drawing).
6. **No Automated Tests:** Changes require manual verification on targeted platforms.

## Environment Variables

Create a `.env` file with:
```env
VITE_TBA_API_KEY=<Your TBA API Key>
VITE_FIREBASE_API_KEY=<Your Firebase API Key>
```
