# Strategy Board Development Guide

Strategy Board is a digital strategy whiteboard for FIRST Robotics Competition (FRC) teams. It's a cross-platform application built with vanilla TypeScript, Vite, and Tailwind CSS, running as a web app, PWA, Electron desktop app (Mac/Win/Linux), and Capacitor mobile app (iOS/Android).

## Commands

### Development
```bash
pnpm dev              # Start Vite dev server (web/PWA)
pnpm electron:dev     # Run Electron app in dev mode
pnpm preview          # Preview production build locally
```

### Building
```bash
pnpm build            # TypeScript check + Vite production build (web)
pnpm electron:build   # Build Electron app for current platform
pnpm electron:build:mac    # Build for macOS (x64 + arm64)
pnpm electron:build:win    # Build for Windows (x64)
pnpm electron:build:linux  # Build for Linux (x64)
pnpm electron:build:all    # Build for all platforms
pnpm cap:sync         # Build and sync Capacitor mobile apps
pnpm cap:run:ios      # Build and run on iOS
pnpm cap:run:android  # Build and run on Android
```

### Quality
```bash
pnpm spell            # Run cspell spell checker
```

Note: There are no automated tests in this project. Manual testing is required across all platforms.

### Capacitor Commands
```bash
pnpm cap:open:ios     # Open iOS project in Xcode
pnpm cap:open:android # Open Android project in Android Studio
```

## Architecture

### Core Pattern: Vanilla TypeScript MVC

This is **NOT** a React/Vue/Angular app. All UI manipulation is done through vanilla DOM APIs. The architecture follows a Model-View-Controller pattern:

```
User Action → view.ts → model.ts → db.ts (IndexedDB)
                  ↓
            whiteboard.ts (Canvas rendering)
```

### Module Responsibilities

| Module | Purpose | Lines | Notes |
|--------|---------|-------|-------|
| **app.ts** | Entry point | ~100 | Registers PWA service worker, initializes all modules |
| **model.ts** | State management | ~170 | Central match state, persists to IndexedDB |
| **view.ts** | UI controller | ~3200 | **ALL DOM manipulation happens here** |
| **whiteboard.ts** | Canvas renderer | ~2400 | Multi-layer canvas for field, robots, drawings |
| **match.ts** | Data model | ~560 | Match serialization/deserialization |
| **db.ts** | IndexedDB wrapper | ~210 | Uses idb-keyval for persistence |
| **cloud.ts** | Cloud sync | ~130 | Firebase/Firestore integration for sharing |
| **qr.ts** | QR code handling | ~700 | Import/export via QR codes |
| **tba.ts** | TBA API client | ~470 | The Blue Alliance API integration |
| **statbotics.ts** | Stats API client | ~470 | Statbotics API for analytics |
| **manager.ts** | Asset management | ~250 | Field image management |
| **pdf.ts** | Export | ~160 | PDF generation |
| **search.ts** | Search utilities | ~290 | Fuzzy search for events/teams |

### Key Architectural Patterns

#### 1. Vanilla DOM Manipulation
All UI logic is in `view.ts` using direct DOM APIs:
```typescript
const get = (id: string): HTMLElement | null => document.getElementById(id);
// No React/Vue - use addEventListener, createElement, appendChild, etc.
```

#### 2. Canvas Rendering Layers
`whiteboard.ts` uses multiple canvas layers:
- Background layer (field image)
- Items layer (robots, game pieces)
- Drawing layer (user annotations)

#### 3. Data Flow
```typescript
// User clicks button in view.ts
button.addEventListener('click', () => {
  model.createMatch(data);  // Updates state
  model.persist();          // Saves to IndexedDB via db.ts
  whiteboard.render();      // Re-renders canvas
});
```

#### 4. Cloud Sync Pattern
```typescript
// model.ts ↔ cloud.ts ↔ Firebase Firestore
await uploadMatch(match);     // Export
const match = await downloadMatch(code);  // Import
```

## Cross-Platform Considerations

**CRITICAL**: Changes must work across all platforms:
- Web browser (Chrome, Firefox, Safari)
- PWA (Progressive Web App)
- Electron desktop (Mac, Windows, Linux)
- Capacitor mobile (iOS, Android)

### Platform Detection
Check `electron/main.cjs` for Electron-specific code. Web/PWA code is in `src/`.

### Build Outputs
- `dist/` - Web/PWA build (Vite output)
- `release/` - Electron builds
- `android/` - Android native project
- `ios/` - iOS native project

## Configuration

### Environment Variables
Required in `.env`:
```
VITE_TBA_API_KEY=<The Blue Alliance API key>
VITE_FIREBASE_API_KEY=<Firebase API key>
```

### Key Config Files
- **vite.config.ts** - Vite + PWA + Tailwind; path alias `@/` → `src/`
- **capacitor.config.ts** - App ID: `com.strategyboard.app`
- **electron/main.cjs** - Electron main process
- **tsconfig.json** - TypeScript with `strict: false`

### TypeScript Configuration
- Strict mode is **DISABLED** (`strict: false`)
- No implicit any warnings
- No unused locals/parameters warnings
- Target: ES2022

## Development Conventions

### Package Manager
**Use pnpm** - not npm or yarn. Commands use `pnpm` prefix.

### File Organization
- All source in `src/`
- Each feature is a single module (e.g., `tba.ts`, `qr.ts`)
- No React components - functions return void or manipulate DOM directly

### Code Style
- Vanilla TypeScript (no frameworks)
- Direct DOM manipulation via `document.*` APIs
- Event listeners attached in `view.ts`
- Canvas operations in `whiteboard.ts`
- Data persistence in `model.ts` → `db.ts`

### State Management
- All state lives in `model.ts` as plain JavaScript objects
- No Redux, MobX, or similar - just classes and arrays
- Persistence is explicit: `model.persist()` calls `db.ts` functions

### Large Files
`view.ts` (3200 lines) and `whiteboard.ts` (2400 lines) are intentionally large. When adding major features, consider splitting into focused modules rather than growing these further.

## PWA Service Worker

- Uses Workbox via `vite-plugin-pwa`
- Offline caching configured in `vite.config.ts`
- Service worker auto-updates on new deploys
- Caches: navigation, JS/HTML (StaleWhileRevalidate), images (CacheFirst)

## External APIs

### The Blue Alliance (TBA)
- API key required: `VITE_TBA_API_KEY`
- Client in `tba.ts`
- Fetches match schedules, team info

### Statbotics
- API key required: `VITE_FIREBASE_API_KEY` (for Firebase)
- Client in `statbotics.ts`
- Provides team analytics and predictions

### Firebase/Firestore
- Cloud sync via `cloud.ts`
- Share matches via 6-character codes
- Upload/download match data

## Common Tasks

### Adding a New Feature
1. Create new module in `src/` if it's self-contained (e.g., `feature.ts`)
2. Add UI elements to `index.html`
3. Wire up DOM manipulation in `view.ts`
4. If it needs state, extend `model.ts`
5. Test on web, Electron, and mobile (iOS/Android)

### Modifying the Canvas
- Edit `whiteboard.ts`
- Canvas layers: background → items → drawing
- Re-render by calling appropriate render methods

### Adding API Integration
- Create new client module (follow `tba.ts` or `statbotics.ts` pattern)
- Add API key to `.env` if needed
- Wire into `view.ts` for UI interactions

### Debugging Across Platforms
- **Web**: Use browser DevTools
- **Electron**: DevTools available in dev mode (`pnpm electron:dev`)
- **iOS**: Use Safari Web Inspector (enable in device settings)
- **Android**: Use Chrome DevTools (chrome://inspect)

## Deployment

- Web/PWA: Hosted on Vercel (auto-deploy from main branch)
- Electron: Built manually via `pnpm electron:build:*`
- iOS/Android: Build via Xcode/Android Studio after `pnpm cap:sync`

## Credits & License

- Original version from Team 834 and realTronsi
- Field images from Pathplanner
- GNU General Public License
