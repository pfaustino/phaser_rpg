# How to Use Your Real Images

Right now the game uses colored shapes. To use your actual PNG images:

## Step 1: Create Assets Folder Structure

In `phaser_starter` folder, create:
```
phaser_starter/
├── index.html
├── game.js
└── assets/
    ├── player.png
    ├── monster.png
    └── tiles/
        ├── tile_floor_grass.png
        ├── tile_floor_dirt.png
        ├── tile_floor_stone.png
        └── wall.png
```

## Step 2: Copy Your Images

Copy from `c:\rpg\assets\images\`:
- `player.png` → `phaser_starter/assets/player.png`
- `monster.png` → `phaser_starter/assets/monster.png`
- `tiles/tile_floor_grass.png` → `phaser_starter/assets/tiles/tile_floor_grass.png`
- `tiles/tile_floor_dirt.png` → `phaser_starter/assets/tiles/tile_floor_dirt.png`
- `tiles/tile_floor_stone.png` → `phaser_starter/assets/tiles/tile_floor_stone.png`
- `wall.png` → `phaser_starter/assets/tiles/wall.png`

## Step 3: Update game.js preload() Function

Replace the `preload()` function with:

```javascript
function preload() {
    // Load actual image files
    this.load.image('player', 'assets/player.png');
    this.load.image('monster', 'assets/monster.png');
    this.load.image('grass', 'assets/tiles/tile_floor_grass.png');
    this.load.image('dirt', 'assets/tiles/tile_floor_dirt.png');
    this.load.image('stone', 'assets/tiles/tile_floor_stone.png');
    this.load.image('wall', 'assets/tiles/wall.png');
    
    console.log('Assets loaded from files');
}
```

## Step 4: Test

1. **Open `index.html`** in browser
2. **Check console** (F12) for errors
3. **If images don't load**, you may need a local server:
   ```bash
   cd phaser_starter
   python -m http.server 8000
   ```
   Then open: http://localhost:8000

## Current Status

✅ **Game works fine** with generated graphics (yellow/red shapes)
⏳ **Images are optional** - add them when ready

The game will work the same either way!
