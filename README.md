# Version Bump

Bump npm version and push tags from the VS Code sidebar.

## Features

- Bump `patch`, `minor`, or `major` version in `package.json`
- Automatically push version tags to Git remote

## Usage

1. Click the **Version Bump** icon in the Activity Bar
2. Choose the version bump type (patch / minor / major)
3. Click **Bump & Push**

The extension will:
- Run `npm version <type>` to bump the version
- Push the new tag to the remote with `git push --follow-tags`

## Requirements

- VS Code `^1.80.0`
- Git installed and available in `PATH`
- A valid `package.json` in the workspace root

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch
```

## License

MIT
