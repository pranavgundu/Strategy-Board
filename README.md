# Orbit Strategy Board

Orbit 1690's match strategy whiteboard for FRC, forked from [pranavgundu/Strategy-Board](https://github.com/pranavgundu/Strategy-Board).

## Running it

```sh
bun install
cp orbit-strategy-board.env.example orbit-strategy-board.env  # then fill in the API keys
bun run dev  # http://localhost:1420
```

- `bun run test` runs the Vitest suite
- `bun run check` type-checks the Svelte and TypeScript code
- `bun run build` builds the static web app into `build/`

API keys are compiled into the web build from `orbit-strategy-board.env`. Real environment variables override the file. Never commit the filled-in file.

## Mobile

Generate both native mobile projects on macOS:

```sh
bun run mobile:init
```

Build both the Android and iOS release artifacts:

```sh
bun run mobile:build
```

The generated projects are written under `src-tauri/gen/android` and
`src-tauri/gen/apple`. Android builds require the Android SDK/NDK; iOS builds
require macOS, Xcode, CocoaPods, and Apple signing for a distributable IPA.

## License

MIT, see [LICENSE](LICENSE). The original Strategy Board is by Pranav Gundu.
