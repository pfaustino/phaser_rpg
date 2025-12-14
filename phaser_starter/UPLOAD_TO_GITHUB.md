# Upload Your Game to GitHub Pages - Step by Step

Your game works! Now let's get it online. Follow these steps:

## Step 1: Create GitHub Account (if you don't have one)

1. Go to **https://github.com**
2. Click **"Sign up"**
3. Create your account (it's free!)

## Step 2: Create a New Repository

1. **Sign in** to GitHub
2. Click the **"+"** icon (top right)
3. Click **"New repository"**
4. Fill in:
   - **Repository name:** `phaser_rpg` ✅
   - **Description:** "My RPG Game" (optional)
   - **Make it Public** ✅ (required for free GitHub Pages)
   - **DO NOT** check "Add a README file"
   - **DO NOT** add .gitignore or license
5. Click **"Create repository"**

## Step 3: Upload Your Files

You'll see a page that says "Quick setup". We'll use the **"uploading an existing file"** method:

### Option A: Drag and Drop (Easiest)

1. On the repository page, click **"uploading an existing file"**
2. **Open File Explorer** and navigate to `c:\rpg\phaser_starter\`
3. **Drag these files** into the GitHub upload area:
   - `index.html`
   - `game.js`
   - Any other files you want (README.md, etc.)
4. **Scroll down** and type a commit message: `"Initial game upload"`
5. Click **"Commit changes"**
6. **Wait** for files to upload (10-30 seconds)

### Option B: Using GitHub Desktop (Recommended)

1. **Download GitHub Desktop:** https://desktop.github.com/
2. **Install and sign in** with your GitHub account
3. In GitHub Desktop:
   - Click **"File" → "Clone repository"**
   - Find your repository (`phaser_rpg`)
   - Choose where to save it locally
   - Click **"Clone"**
4. **Copy your game files** to that folder:
   - Copy `index.html` from `c:\rpg\phaser_starter\`
   - Copy `game.js` from `c:\rpg\phaser_starter\`
5. **Back in GitHub Desktop:**
   - You'll see the files listed
   - Type commit message: `"Initial game upload"`
   - Click **"Commit to main"**
   - Click **"Push origin"** (top toolbar)
   - Wait for upload to complete

## Step 4: Enable GitHub Pages

1. **Go to your repository** on GitHub.com (`phaser_rpg`)
2. Click **"Settings"** tab (top menu)
3. **Scroll down** to **"Pages"** in the left sidebar
4. Under **"Source"**:
   - Select **Branch:** `main`
   - Select **Folder:** `/ (root)`
5. Click **"Save"**
6. **Wait 1-2 minutes** for GitHub to build your site

## Step 5: Access Your Game!

1. **After enabling Pages**, GitHub will show you a URL like:
   ```
   https://YOUR_USERNAME.github.io/phaser_rpg/
   ```
2. **Click the URL** or copy it
3. **Your game should be live!** 🎮

## Step 6: Share Your Game

Share that URL with anyone - they can play your game in their browser!

## Troubleshooting

### Game doesn't load?
- **Check the URL** - make sure it's exactly right
- **Wait 2-3 minutes** - GitHub Pages can take time to update
- **Check browser console** (F12) for errors
- **Make sure `index.html` is in the root** of your repository

### Files not showing?
- **Refresh** the page (Ctrl+F5)
- **Check file names** - they're case-sensitive!
- **Make sure files are committed** - check the repository page

### Want to update your game?
1. **Edit files** locally
2. **Commit and push** changes (GitHub Desktop) or upload new files
3. **Wait 1-2 minutes** for GitHub Pages to update
4. **Refresh** your game URL

## Your Repository Structure Should Look Like:

```
phaser_rpg/
├── index.html          ← Main file (required!)
├── game.js             ← Game code
└── (other files...)
```

That's it! Just these 2 files minimum.

## Next Steps After It's Live

- Share the URL with friends
- Update your game by editing files and pushing changes
- Add more features (inventory, combat, etc.)
- Add your actual images later (optional)

## Quick Checklist

- [ ] GitHub account created
- [ ] Repository created: `phaser_rpg` (public)
- [ ] Files uploaded (index.html, game.js)
- [ ] GitHub Pages enabled (Settings → Pages)
- [ ] Game URL works: `https://YOUR_USERNAME.github.io/phaser_rpg/`
- [ ] Game plays correctly online

---

**Your game URL will be:** `https://YOUR_USERNAME.github.io/phaser_rpg/`

**Need help?** Check the browser console (F12) for any errors and make sure all files are uploaded correctly!
