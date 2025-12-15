# Fix Token Permissions - Step by Step

## The Issue
Your fine-grained token is getting 403, which means it either:
1. Doesn't have access to the `pfaustino/phaser_rpg` repository
2. Doesn't have "Contents: Read and write" permission

## Fix Your Fine-Grained Token

1. **Go to token settings:**
   https://github.com/settings/tokens

2. **Find your token** (the one starting with `github_pat_...`)

3. **Click "Configure" or the token name**

4. **Check "Repository access":**
   - Should be set to "Selected repositories"
   - Make sure `pfaustino/phaser_rpg` is in the list
   - If not, click "Select repositories" and add it

5. **Check "Repository permissions":**
   - **Contents:** Must be "Read and write" (not just "Read")
   - **Metadata:** Should be "Read-only" (this is fine)

6. **Save the changes**

7. **Try pushing again:**
   ```bash
   git push https://pfaustino:YOUR_TOKEN@github.com/pfaustino/phaser_rpg.git feature/combat-system
   ```

## OR: Create a Classic Token (Easier!)

Classic tokens are simpler and more reliable:

1. **Go to:** https://github.com/settings/tokens

2. **Click:** "Generate new token" → "Generate new token (classic)"

3. **Settings:**
   - **Note:** "Phaser RPG Development"
   - **Expiration:** Choose your preference (90 days, 1 year, etc.)
   - **Select scopes:** Check `repo` (this gives full repository access)

4. **Click "Generate token"**

5. **Copy the token immediately** (starts with `ghp_`)

6. **Use it:**
   ```bash
   git push https://pfaustino:ghp_YOUR_NEW_TOKEN@github.com/pfaustino/phaser_rpg.git feature/combat-system
   ```

## Why Classic Tokens Work Better

- ✅ Simpler permissions (just `repo` scope)
- ✅ Works immediately without repository selection
- ✅ More reliable for Git operations
- ✅ Better documented and supported

## After Successful Push

Once it works, Windows Credential Manager will remember it, and you can use:

```bash
git push origin feature/combat-system
```
