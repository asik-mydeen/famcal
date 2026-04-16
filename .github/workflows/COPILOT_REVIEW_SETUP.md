# Copilot Code Review Setup

This workflow implements GitHub Copilot Code Review with best practices to prevent the common "Execution failed" error caused by uncommitted changes.

## What Was Fixed

The most common cause of Copilot Code Review failing is **uncommitted changes** in the working directory. This happens when previous workflow steps (like `npm install`, build processes, or formatting tools) modify files.

## Implementation Details

### 1. **Full Repository Checkout**
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full git history for accurate diff
```

### 2. **Clean Working Tree (Critical)**
```yaml
- name: Clean working tree
  run: |
    git checkout -- .  # Discard uncommitted changes
    git clean -fd      # Remove untracked files
```

### 3. **Required Permissions**
```yaml
permissions:
  contents: read       # Read repository content
  pull-requests: write # Post review comments
  models: read         # Access Copilot models
```

### 4. **Correct Trigger**
```yaml
on:
  pull_request:
    types: [opened, synchronize]  # Runs on PR open and new commits
```

## Usage

### Automatic (Default)
The workflow runs automatically on:
- New PRs opened against `main` or `develop`
- New commits pushed to existing PRs

### Manual Dispatch
Add this to enable manual triggering:
```yaml
on:
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:  # Add this line
```

## Customization

### Review Focus
Add custom instructions for the AI reviewer:
```yaml
- name: Run Copilot Code Review
  uses: github/copilot-code-review-action@v1
  with:
    instructions: |
      Focus on:
      - React best practices and hooks
      - Material UI component patterns
      - Theme engine consistency
      - Accessibility (WCAG 2.1 AA)
      - Performance optimizations
```

### Model Selection
```yaml
with:
  model: gpt-4o  # Options: gpt-4o, gpt-4o-mini, claude-3-5-sonnet
```

## Troubleshooting

### "Execution failed" error
- ✅ Fixed by `git checkout -- .` step
- Ensure no previous steps modify the workspace

### "Permission denied" errors
- Verify `pull-requests: write` in permissions
- Check that GITHUB_TOKEN is properly passed

### Workflow not triggering
- Must be a `pull_request` event (not `push`)
- PR must target `main` or `develop` branches

### Large repositories
- `fetch-depth: 0` is required for accurate diffs
- Consider increasing `timeout-minutes` if needed

## Monitoring

Check workflow results in:
- **Actions tab**: View run history and logs
- **PR conversation**: Review comments appear automatically
- **Insights tab**: Track review metrics over time

## Cost Considerations

- Uses GitHub Copilot quota (included with Copilot subscription)
- Each PR consumes tokens based on diff size
- Large diffs may consume more quota
- Consider `gpt-4o-mini` for faster, cheaper reviews on large PRs

## Related Files

- `.github/workflows/copilot-code-review.yml` - Main workflow file
- `.github/workflows/tauri-build.yml` - Build workflow (no Copilot)
- `.github/workflows/build-kiosk-image.yml` - Image build workflow (no Copilot)
- `.github/workflows/trigger-infra-build.yml` - Infra dispatch (no Copilot)
