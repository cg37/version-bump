# Version Bump

Bump npm version and push tags directly from the VS Code sidebar.

![Version Bump](images/activity-icon.png)

## Features

- 🚀 Bump `patch`, `minor`, or `major` version in `package.json` with one click
- 📦 Automatically create a Git tag and push to the remote
- 🖥️ Clean sidebar UI — no command palette needed
- 📋 Real-time output log showing each step of the bump & push process

## Usage

1. Open a workspace with a `package.json` in the root
2. Click the **Version Bump** icon in the Activity Bar
3. Select the bump type: **patch** / **minor** / **major**
4. Click **Bump & Push**

The extension runs the following commands in sequence:

```bash
npm version <type>           # Bump version and create tag
git push origin <tag>        # Push the tag to remote
git push origin              # Push commits to remote
```

## Requirements

- VS Code `^1.120.0`
- Git installed and available in `PATH`
- A valid `package.json` in the workspace root
- Git remote configured (the extension pushes to `origin`)

## Development

```bash
# Install dependencies
pnpm install

# Compile
pnpm run compile

# Watch mode (recompile on changes)
pnpm run watch

# Package as VSIX
pnpm run package
```

### Project Structure

```
src/                  # Extension source (TypeScript)
├── extension.ts      # Entry point, registers command & webview
├── logger.ts         # Output channel logger
├── commands/
│   └── bumpAndPush.ts  # Core bump & push logic
├── provider/
│   └── VersionBumpViewProvider.ts  # Webview view provider
└── types/
    └── messages.ts   # Webview ↔ extension message types

webview-src/          # Webview UI (Vue 3 + TypeScript)
├── App.vue           # Main component with bump type selector
├── main.ts           # Webview entry point
└── vscode.ts         # VS Code API utilities
```

## Release

Releases are automated via GitHub Actions:

1. Create and push a tag: `git tag v1.0.5 && git push origin v1.0.5`
2. The CI workflow packages the extension, creates a GitHub Release with the `.vsix` file, and publishes to the VS Code Marketplace.

Alternatively, trigger manually via **Actions → Release & Publish → Run workflow** with `dry_run` enabled for validation only.

## License

MIT
