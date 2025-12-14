# How to Add Your Actual Game Assets

Right now the game uses programmatically generated graphics (colored shapes). Here's how to use your actual image files:

## Step 1: Create an Assets Folder

In your `phaser_starter` folder, create an `assets` folder:

```
phaser_starter/
├── index.html
├── game.js
└── assets/          ← Create this folder
    ├── player.png
    ├── monster.png
    └── tiles/
        ├── tile_floor_grass.png
        └── ...
```

## Step 2: Copy Your Images

Copy your image files from `c:\rpg\assets\` to `phaser_starter\assets\`:

- `assets/images/player.png` → `phaser_starter/assets/player.png`
- `assets/images/monster.png` → `phaser_starter/assets/monster.png`
- `assets/images/tiles/*.png` → `phaser_starter/assets/tiles/`

## Step 3: Update game.js to Load Images

Replace the `preload()` function in `game.js`:

```javascript
function preload() {
    // Load actual image files instead of generating graphics
    
    // Load player sprite
    this.load.image('player', 'assets/player.png');
    
    // Load monster sprite
    this.load.image('monster', 'assets/monster.png');
    
    // Load tile images
    this.load.image('grass', 'assets/tiles/tile_floor_grass.png');
    this.load.image('dirt', 'assets/tiles/tile_floor_dirt.png');
    this.load.image('stone', 'assets/tiles/tile_floor_stone.png');
    this.load.image('wall', 'assets/images/wall.png');
    
    console.log('Assets loaded');
}
```

## Step 4: Test Locally

1. **Open `index.html`** in your browser
2. **Check browser console** (F12) for any loading errors
3. **If images don't load**, check:
   - File paths are correct
   - File names match exactly (case-sensitive!)
   - Images are in the right folder

## Step 5: For GitHub Pages

When you upload to GitHub Pages, make sure:
- The `assets` folder is included
- All image files are uploaded
- File paths in code match the folder structure

## Quick Test Without Images

The current version works fine without images - it generates colored shapes. You can:
1. **Keep it as-is** for now (works great!)
2. **Add images later** when ready
3. **Mix both** - use images where you have them, generated graphics for the rest

## Troubleshooting

**Images not showing?**
- Check browser console (F12) for 404 errors
- Verify file paths match exactly
- Make sure images are in the `assets` folder

**Want to test with a local server?**
```bash
# In the phaser_starter folder:
python -m http.server 8000
# Then open: http://localhost:8000
```

This helps with CORS issues when loading local files.
