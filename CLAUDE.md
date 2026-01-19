# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Strategy Board is a digital strategy whiteboard application for FIRST Robotics Competition (FRC). It allows teams to draw plays on virtual fields, collaborate via cloud sharing and QR codes, and pull data from The Blue Alliance and Statbotics APIs.

## Build Commands

```bash
pnpm run dev              # Start Vite dev server
pnpm run build            # TypeScript check + Vite production build
pnpm run spell            # Run cspell spell checker
pnpm run electron:dev     # Run Electron desktop app in dev mode
pnpm run electron:build   # Build Electron app for current platform
pnpm run cap:sync         # Build and sync Capacitor mobile apps
pnpm run cap:run:ios      # Build and run on iOS
pnpm run cap:run:android  # Build and run on Android
```

## Architecture

The application is a vanilla TypeScript app (no React/Vue) built with Vite and Tailwind CSS. It ships as a web app, PWA, Electron desktop app (Mac/Win/Linux), and Capacitor mobile app (iOS/Android).

### Core Source Files (src/)

- **app.ts** - Entry point; registers PWA service worker, initializes modules
- **model.ts** - Central state management for matches; persists to IndexedDB
- **whiteboard.ts** - Canvas rendering engine for field images, robots, and drawings
- **view.ts** - UI controller; handles all DOM manipulation and event binding
- **match.ts** - Match data model and serialization
- **db.ts** - IndexedDB wrapper using idb-keyval
- **cloud.ts** - Firebase/Firestore integration for cloud sharing
- **qr.ts** - QR code generation (export) and scanning (import)
- **tba.ts** - The Blue Alliance API client
- **statbotics.ts** - Statbotics API client for team analytics
- **manager.ts** - Field image asset management
- **pdf.ts** - PDF export functionality

### Key Patterns

- All UI is vanilla DOM manipulation in view.ts (3000+ lines)
- Canvas rendering uses multiple layers (background, items, drawing)
- Data flows: User action → view.ts → model.ts → db.ts (IndexedDB)
- Cloud sync: model.ts ↔ cloud.ts ↔ Firebase Firestore

### Configuration

- **vite.config.ts** - Vite + PWA + Tailwind plugins; path alias `@/` → `src/`
- **capacitor.config.ts** - App ID: com.strategyboard.app
- **electron/main.cjs** - Electron main process entry point

### Environment Variables

Required in `.env`:
```
VITE_TBA_API_KEY=<The Blue Alliance API key>
VITE_FIREBASE_API_KEY=<Firebase project API key>
```

## Important Considerations

- TypeScript strict mode is disabled (strict: false in tsconfig.json)
- PWA service worker handles offline caching via Workbox
- Changes must work across all platforms (web, Electron, iOS, Android)
- The largest files are view.ts and whiteboard.ts - consider breaking into modules for major features
