# Git Workflow Guide

## Quick Commands

### Check Status
```bash
git status
```

### Stage All Changes
```bash
git add .
```

### Stage Specific Files
```bash
git add game.js DEVELOPMENT_ROADMAP.md
```

### Commit Changes
```bash
git commit -m "Your commit message here"
```

### Push to GitHub
```bash
git push origin feature/combat-system
```

### Push to Main Branch (if you switch to main)
```bash
git push origin main
```

## Common Workflow

1. **Make your changes** to files
2. **Check what changed:**
   ```bash
   git status
   ```
3. **Stage your changes:**
   ```bash
   git add .
   ```
   Or stage specific files:
   ```bash
   git add game.js DEVELOPMENT_ROADMAP.md
   ```
4. **Commit with a message:**
   ```bash
   git commit -m "Description of what you changed"
   ```
5. **Push to GitHub:**
   ```bash
   git push
   ```

## Switching Branches

### Switch to main branch
```bash
git checkout main
```

### Create and switch to new branch
```bash
git checkout -b new-feature-name
```

### Switch back to feature branch
```bash
git checkout feature/combat-system
```

## Viewing Changes

### See what files changed
```bash
git status
```

### See actual code changes
```bash
git diff
```

### See changes for specific file
```bash
git diff game.js
```

## Current Setup

- **Remote:** Connected to https://github.com/pfaustino/phaser_rpg
- **Current Branch:** feature/combat-system
- **Upstream:** Set to origin/main

## Notes

- Always commit with descriptive messages
- Push regularly to backup your work
- Use `git status` before committing to see what will be included
