# Strategy Board

The Digital Strategy Whiteboard for FRC.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

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
