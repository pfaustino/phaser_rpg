# Classic Token Setup - Correct Instructions

## Classic Token vs Fine-Grained Token

**Classic tokens** (start with `ghp_`):
- Use **scopes** (not repository permissions)
- The `repo` scope gives full read/write access
- No need to select individual repositories
- Simpler to use

**Fine-grained tokens** (start with `github_pat_`):
- Use **repository permissions** (Contents: Read and write)
- Must select specific repositories
- More granular control

## Creating a Classic Token (Correct Steps)

1. **Go to:** https://github.com/settings/tokens

2. **Click:** "Generate new token" → **"Generate new token (classic)"**
   - ⚠️ Make sure you click "classic" - not the fine-grained option!

3. **Fill in the form:**
   - **Note:** "Phaser RPG Development" (or any name you want)
   - **Expiration:** Choose your preference (90 days, 1 year, or no expiration)
   - **Select scopes:** Check the box for **`repo`**
     - This scope gives full read and write access to repositories
     - You don't need to select "read/write" separately - `repo` includes both

4. **Scroll down and click:** "Generate token"

5. **Copy the token immediately** (it will start with `ghp_`)

6. **Use it:**
   ```bash
   git push https://pfaustino:ghp_YOUR_TOKEN@github.com/pfaustino/phaser_rpg.git feature/combat-system
   ```

## Important Notes

- Classic tokens use **scopes**, not "repository permissions"
- The `repo` scope = full read and write access
- No need to select individual repositories
- No "read/write" dropdown - just check the `repo` scope box

## If You See "Repository Permissions"

If you see a "Repository permissions" section with "Contents: Read and write" dropdown, you're creating a **fine-grained token**, not a classic token.

To get a classic token:
- Look for the **"Generate new token (classic)"** option
- It should show **scopes** (like `repo`, `workflow`, etc.) not "repository permissions"

## Verify You Have a Classic Token

- ✅ Starts with `ghp_` = Classic token
- ❌ Starts with `github_pat_` = Fine-grained token


