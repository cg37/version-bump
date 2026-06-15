---
name: pnpm-ci-build-scripts-fix
description: Fix pnpm v10+ [ERR_PNPM_IGNORED_BUILDS] errors in GitHub Actions CI
source: auto-skill
extracted_at: '2026-06-15T13:23:38.086Z'
---

# Fix pnpm v10+ Ignored Builds Error in CI

## Problem

`pnpm install --frozen-lockfile` fails in GitHub Actions with:

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: @vscode/vsce-sign@x, esbuild@x, keytar@x
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
Error: Process completed with exit code 1.
```

## Root Causes

1. **pnpm v10+ ignores `onlyBuiltDependencies` in `pnpm-workspace.yaml` and `package.json`** — it only reads this config from `.npmrc`
2. **Comma-separated format may not work in all pnpm versions** — use array format instead
3. **`version: latest` in CI** causes pnpm version drift between local and CI, leading to inconsistent behavior (warnings treated as errors)

## Solution

### 1. Configure `.npmrc` with array format

```ini
only-built-dependencies[]=@vscode/vsce-sign
only-built-dependencies[]=esbuild
only-built-dependencies[]=keytar
```

Do NOT use the comma-separated format (`only-built-dependencies=a,b,c`) — array format is more reliable across pnpm v10.x versions.

### 2. Pin pnpm version in CI workflow

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
      version: 10.11.0  # pin to specific version, NOT "latest"
```

### 3. Remove stale config from other files

- Remove `onlyBuiltDependencies` / `ignoredBuiltDependencies` from `pnpm-workspace.yaml`
- Remove `pnpm.onlyBuiltDependencies` from `package.json`

pnpm v10+ ignores these; keeping them causes confusion.

## Special case: keytar with vsce

If you use `vsce publish --no-keytar`, keytar is an optional dependency that doesn't need its build scripts to run. It's safe to either:
- Include it in `only-built-dependencies` (builds it, no harm)
- Exclude it (pnpm warns but succeeds with exit code 0)

The key packages that MUST be in `only-built-dependencies` are `@vscode/vsce-sign` and `esbuild`.
