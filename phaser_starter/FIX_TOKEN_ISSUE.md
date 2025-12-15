# Fixing Token Authentication Issue

## The Problem
You're getting a 403 error, which usually means:
1. The token doesn't have the right permissions
2. The token format in the URL is incorrect
3. The token needs to be used with your username

## Solution: Use Username + Token

For fine-grained tokens (starting with `github_pat_`), use this format:

```bash
git push https://pfaustino:YOUR_TOKEN@github.com/pfaustino/phaser_rpg.git feature/combat-system
```

Replace `YOUR_TOKEN` with your actual token.

## Check Token Permissions

Your fine-grained token needs:
1. **Repository access:** Must have access to `pfaustino/phaser_rpg`
2. **Permissions:** 
   - Contents: Read and write
   - Metadata: Read-only

To check/fix:
1. Go to: https://github.com/settings/tokens
2. Find your token
3. Click "Configure" or edit it
4. Make sure it has access to `pfaustino/phaser_rpg` repository
5. Ensure it has "Contents" permission set to "Read and write"

## Alternative: Use Classic Token

If fine-grained tokens are causing issues, create a classic token instead:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it (e.g., "Phaser RPG")
4. Select scope: `repo` (full control)
5. Generate and copy the token (starts with `ghp_`)
6. Use it in the push command:

```bash
git push https://pfaustino:ghp_YOUR_CLASSIC_TOKEN@github.com/pfaustino/phaser_rpg.git feature/combat-system
```

## Test Connection

After fixing permissions or using a classic token, test with:

```bash
git push https://pfaustino:YOUR_TOKEN@github.com/pfaustino/phaser_rpg.git feature/combat-system
```

## Once It Works

After a successful push, Windows Credential Manager should remember it, and you can use:

```bash
git push origin feature/combat-system
```
