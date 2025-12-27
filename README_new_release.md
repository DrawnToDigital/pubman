# PubMan Release Process

## Version Format

`YYYY.M.N` where:
- `YYYY` = Current year (e.g., 2025)
- `M` = Current month without leading zero (1-12)
- `N` = Release number for that month, starting at 0

Examples: `2025.12.0`, `2025.12.1`, `2026.1.0`

Release titles use the `-alpha` suffix: `2025.12.0-alpha`

## Pre-Release Checklist

1. Ensure you are on the `main` branch with latest changes pulled
2. Verify all intended PRs have been merged
3. Review changes since last release:

```bash
git log $(git tag --sort=-creatordate | head -1)..HEAD --oneline
```

## Release Steps

### Step 1: Determine Version

```bash
# Check current version and recent tags
git tag --sort=-creatordate | head -3
cat package.json | grep '"version"'
```

Calculate new version based on current date and existing releases this month.

### Step 2: Bump Version

```bash
npm version <NEW_VERSION> --no-git-tag-version
```

This updates both `package.json` and `package-lock.json`.

### Step 3: Commit Version Bump

```bash
git add package.json package-lock.json
git commit -m "bump version v<NEW_VERSION>"
```

### Step 4: Create and Push Tag

```bash
git tag v<NEW_VERSION>
git push origin main --tags
```

### Step 5: Monitor Release Build

```bash
# Check workflow status
gh run list --workflow=release.yml --limit 1

# Watch job progress
gh run view <RUN_ID> --json status,jobs --jq '{status: .status, jobs: [.jobs[] | {name: .name, status: .status, conclusion: .conclusion}]}'
```

The release workflow builds for:
- macOS (Intel + Apple Silicon)
- Ubuntu/Linux (AppImage + Flatpak)
- Windows (exe)

### Step 6: Handle Failed Jobs (if needed)

```bash
# Rerun only failed jobs
gh run rerun <RUN_ID> --failed
```

### Step 7: Publish the Release

After all builds complete, the release is created as a draft. Update and publish it:

```bash
# View current draft state
gh release view v<NEW_VERSION> --json isDraft,body

# Update title, add release notes, and publish
gh release edit v<NEW_VERSION> \
  --title "<NEW_VERSION>-alpha" \
  --notes "$(cat <<'EOF'
## What's Changed

### Bug Fixes
- <Description of fix> (#<PR_NUMBER>)

### Features
- <Description of feature> (#<PR_NUMBER>)

**Full Changelog**: https://github.com/DrawnToDigital/pubman/compare/v<PREVIOUS_VERSION>...v<NEW_VERSION>
EOF
)" \
  --draft=false
```

### Step 8: Verify Published Release

```bash
# Confirm release is published
gh release view v<NEW_VERSION> --json name,isDraft,assets --jq '{name: .name, isDraft: .isDraft, assets: [.assets[].name]}'
```

## Post-Release

The `brew-tap.yml` workflow will automatically update the Homebrew tap after the release is published.

Release URL: `https://github.com/DrawnToDigital/pubman/releases/tag/v<NEW_VERSION>`
