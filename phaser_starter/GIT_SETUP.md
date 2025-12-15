# Git Authentication Setup

## Option 1: GitHub CLI (Easiest) ⭐ Recommended

1. **Install GitHub CLI:**
   - Download from: https://cli.github.com/
   - Or use: `winget install GitHub.cli`

2. **Authenticate:**
   ```bash
   gh auth login
   ```
   - Follow the prompts
   - Choose GitHub.com
   - Choose HTTPS
   - Authenticate in browser

3. **Then push:**
   ```bash
   git push origin feature/combat-system
   ```

## Option 2: Personal Access Token

1. **Create a token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it (e.g., "Phaser RPG Development")
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **Push using token:**
   ```bash
   git push https://YOUR_TOKEN@github.com/pfaustino/phaser_rpg.git feature/combat-system
   ```
   Replace `YOUR_TOKEN` with your actual token.

3. **Or configure credential helper (one-time setup):**
   ```bash
   git config --global credential.helper wincred
   ```
   Then on first push, use your GitHub username and the token as password.

## Option 3: SSH Keys (More Secure, One-Time Setup)

1. **Generate SSH key:**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
   - Press Enter to accept default location
   - Optionally set a passphrase

2. **Add to SSH agent:**
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

3. **Add public key to GitHub:**
   - Copy your public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste your key and save

4. **Change remote to SSH:**
   ```bash
   git remote set-url origin git@github.com:pfaustino/phaser_rpg.git
   ```

5. **Then push:**
   ```bash
   git push origin feature/combat-system
   ```

## Quick Test

After setting up authentication, test with:
```bash
git push origin feature/combat-system
```

## Current Status

✅ **Repository connected:** https://github.com/pfaustino/phaser_rpg  
✅ **Remote configured:** origin  
✅ **Branch set up:** feature/combat-system  
✅ **Changes committed:** Latest commit ready to push  
⏳ **Need authentication:** Choose one of the options above
