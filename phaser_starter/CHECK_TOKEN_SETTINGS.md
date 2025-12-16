# Check Your Token Settings - Step by Step

## Your Token Type
You have a **fine-grained token** (starts with `github_pat_`). These require specific repository access and permissions.

## Fix Steps

### 1. Go to Token Settings
https://github.com/settings/tokens

### 2. Find Your Token
Look for the token that starts with `github_pat_...`

### 3. Click "Configure" (or the token name)

### 4. Check "Repository Access"
- Must be set to **"Selected repositories"** (not "All repositories" unless you want that)
- **Must include:** `pfaustino/phaser_rpg`
- If it's not there:
  - Click "Select repositories"
  - Search for `phaser_rpg`
  - Check the box next to it
  - Click "Save"

### 5. Check "Repository Permissions"
Scroll down to find "Repository permissions" section:
- **Contents:** Must be **"Read and write"** ⚠️ (This is critical!)
  - If it says "Read-only" or "No access", change it to "Read and write"
- **Metadata:** Can be "Read-only" (this is fine)

### 6. Save Changes
Click "Save" at the bottom

### 7. Try Pushing Again
```bash
git push https://pfaustino:YOUR_TOKEN_HERE@github.com/pfaustino/phaser_rpg.git feature/combat-system
```

## Common Issues

**If "Contents" is set to "Read-only":**
- This is why you're getting 403
- Change it to "Read and write"
- Save and try again

**If the repository isn't in the list:**
- Add `pfaustino/phaser_rpg` to selected repositories
- Save and try again

## Still Not Working?

If you've checked both of these and it still doesn't work, create a **true classic token**:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → **"Generate new token (classic)"**
3. Note: "Phaser RPG"
4. Expiration: Your choice
5. **Select scopes:** Check `repo` (this gives everything)
6. Generate token
7. Copy it (will start with `ghp_`)
8. Use it:
   ```bash
   git push https://pfaustino:ghp_YOUR_NEW_TOKEN@github.com/pfaustino/phaser_rpg.git feature/combat-system
   ```

Classic tokens are simpler because they don't require repository selection - they just work!


