# How to Use Your GitHub Access Token

## Quick Steps

1. **Try to push:**
   ```bash
   git push origin feature/combat-system
   ```

2. **When prompted for credentials:**
   - **Username:** Enter your GitHub username (e.g., `pfaustino`)
   - **Password:** Enter your **access token** (NOT your GitHub password!)
   
3. **Windows Credential Manager will save it** - you won't need to enter it again!

## Alternative: Use Token Directly in URL (One-Time)

If you prefer to enter it directly in the command:

```bash
git push https://YOUR_TOKEN@github.com/pfaustino/phaser_rpg.git feature/combat-system
```

Replace `YOUR_TOKEN` with your actual token.

## Verify It's Working

After pushing successfully, you should see:
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
...
To https://github.com/pfaustino/phaser_rpg.git
   [branch info]
```

## Troubleshooting

**If it still asks for password:**
- Make sure you're using the **token** as the password, not your GitHub password
- Tokens start with `ghp_` (for classic tokens)

**If you get "authentication failed":**
- Check that your token has `repo` scope enabled
- Make sure you copied the entire token (they're long!)

## Security Note

✅ **Safe:** Using credential helper (Windows saves it securely)  
✅ **Safe:** Token in URL for one-time push (not stored)  
❌ **Not recommended:** Hardcoding token in files or scripts


