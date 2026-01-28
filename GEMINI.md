# Strategy Board

## Project Overview

This is a digital strategy whiteboard for FIRST Robotics Competition (FRC) teams. It allows users to plan and visualize match strategies, including autonomous and tele-operated periods. The application is built as a cross-platform tool that can be accessed via a web browser, installed as a Progressive Web App (PWA), or run as a native desktop application on Windows, macOS, and Linux.

### Key Features:
-   **Multi-Platform Support:** Web, PWA, and desktop versions for all major operating systems.
-   **Real-time Collaboration:** Share and import strategies via QR codes and links.
-   **FRC-Specific:** Tailored for FRC, with FRC field diagrams and robot representations.
-   **Data Integration:** Pulls data from The Blue Alliance (TBA) and Statbotics for match analysis.
-   **Offline First:** Uses IndexedDB to store data locally, allowing for offline use.

### Architecture:
The application is a vanilla TypeScript app (no React/Vue) built with Vite and Tailwind CSS. It ships as a web app, PWA, Electron desktop app (Mac/Win/Linux), and Capacitor mobile app (iOS/Android).

#### Core Source Files (src/):
-   **app.ts** - Entry point; registers PWA service worker, initializes modules.
-   **model.ts** - Central state management for matches; persists to IndexedDB.
-   **whiteboard.ts** - Canvas rendering engine for field images, robots, and drawings.
-   **view.ts** - UI controller; handles all DOM manipulation and event binding.
-   **match.ts** - Match data model and serialization.
-   **db.ts** - IndexedDB wrapper using idb-keyval.
-   **cloud.ts** - Firebase/Firestore integration for cloud sharing.
-   **qr.ts** - QR code generation (export) and scanning (import).
-   **tba.ts** - The Blue Alliance API client.
-   **statbotics.ts** - Statbotics API client for team analytics.
-   **manager.ts** - Field image asset management.
-   **pdf.ts** - PDF export functionality.

#### Key Patterns:
-   All UI is vanilla DOM manipulation in `view.ts` (3000+ lines).
-   Canvas rendering uses multiple layers (background, items, drawing).
-   Data flows: User action → `view.ts` → `model.ts` → `db.ts` (IndexedDB).
-   Cloud sync: `model.ts` ↔ `cloud.ts` ↔ Firebase Firestore.

#### Configuration:
-   **vite.config.ts** - Vite + PWA + Tailwind plugins; path alias `@/` → `src/`.
-   **capacitor.config.ts** - App ID: `com.strategyboard.app`.
-   **electron/main.cjs** - Electron main process entry point.

### Important Considerations:
-   TypeScript strict mode is disabled (`strict: false` in `tsconfig.json`).
-   PWA service worker handles offline caching via Workbox.
-   Changes must work across all platforms (web, Electron, iOS, Android).
-   The largest files are `view.ts` and `whiteboard.ts` - consider breaking into modules for major features.

### Technologies Used:
-   **Frontend:** HTML, CSS, TypeScript
-   **Frameworks & Libraries:**
    -   **Vite:** Build tool for the web application.
    -   **Tailwind CSS:** Utility-first CSS framework for styling.
    -   **Capacitor:** For building the native mobile (iOS and Android) versions.
    -   **Electron:** For building the native desktop (Windows, macOS, Linux) versions.
-   **Database:** IndexedDB for local storage.

## Environment Variables

The project requires the following environment variables to be set in a `.env` file:

-   `VITE_TBA_API_KEY`: The Blue Alliance API key.
-   `VITE_FIREBASE_API_KEY`: Firebase project API key.


### Development
To run the application in development mode with hot-reloading, use the following command:

```bash
pnpm dev
```

### Building for Production
To build the application for production, which includes generating the necessary files for the web, mobile, and desktop versions, use the following command:

```bash
pnpm build
```

### Running Tests
There are no explicit test commands in `package.json`. However, the project uses `cspell` for spell checking. To run the spell checker, use the following command:

```bash
pnpm spell
```

### Mobile App (Capacitor)
To sync the web build with the native mobile projects, run:

```bash
pnpm cap:sync
```

To open the native project in their respective IDEs, use:

```bash
# For iOS
pnpm cap:open:ios

# For Android
pnpm cap:open:android
```

To run the app directly on a connected device or emulator, use:

```bash
# For iOS
pnpm cap:run:ios

# For Android
pnpm cap:run:android
```

### Desktop App (Electron)
To run the app in development mode with Electron, use:

```bash
pnpm electron:dev
```

To build the desktop app for different platforms, use the following commands:

```bash
# For macOS
pnpm electron:build:mac

# For Windows
pnpm electron:build:win

# For Linux
pnpm electron:build:linux

# For all platforms
pnpm electron:build:all
```

## Development Conventions

-   **Package Manager:** The project uses `pnpm` for package management.
-   **Code Style:** The codebase is written in TypeScript and follows standard modern TypeScript conventions. There is a `.prettierrc` file, which suggests that Prettier is used for code formatting, although there is no explicit format script in `package.json`.
-   **Linting:** The project uses `cspell` for spell checking. There are no other explicit linting configurations, but it's likely that a linter is used during development.
-   **Modularity:** The code is organized into modules by feature, such as `model.ts`, `view.ts`, `whiteboard.ts`, etc. The `app.ts` file serves as the main entry point for the application logic.
-   **Data Flow:** The application follows a Model-View-Controller (MVC) like pattern, where the `Model` manages the application's data, the `View` handles the UI and user interactions, and the various services and utility modules provide additional functionality.
