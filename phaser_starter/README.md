# Phaser.js RPG Starter

This is a starter template for porting your pygame RPG to Phaser.js.

## Quick Start

1. **Start a local web server** (required for audio files to work)
   - **Easiest:** Double-click `start_server.bat`
   - Or use: `python -m http.server 8000` or `npx http-server -p 8000`
   - See `LOCAL_SERVER.md` for details

2. **Open in browser:** `http://localhost:8000`
   - ⚠️ **Don't open `index.html` directly** - CORS will block audio files!

2. **For deployment:**
   - Upload all files to any web host
   - GitHub Pages, Netlify, Vercel all work great
   - No build step needed!

## Files

- `index.html` - Main HTML file
- `game.js` - Your game code (port your systems here)
- `README.md` - This file

## Next Steps

1. Replace placeholder graphics with your actual sprites
2. Port your map system (use Phaser Tilemap)
3. Port your player movement
4. Port your monster system
5. Port your inventory/quest/dialog systems

## Resources

- [Phaser Documentation](https://phaser.io/docs)
- [Phaser Examples](https://phaser.io/examples)
- [Phaser Tutorials](https://phaser.io/learn)

## Your Current Systems → Phaser

| Your System | Phaser Equivalent |
|-------------|-------------------|
| `pygame.display.set_mode()` | `new Phaser.Game(config)` |
| `screen.blit(image, pos)` | `this.add.image(x, y, 'key')` |
| `pygame.event.get()` | `this.input.keyboard` |
| `pygame.time.Clock()` | Built-in delta time in `update()` |
| Player sprite | `this.physics.add.sprite()` |
| Map tiles | `this.add.tilemap()` or `this.add.image()` |
| Collision detection | `this.physics.add.collider()` |

## Tips

- Start small - port one system at a time
- Use Phaser's built-in physics for collisions
- Use Phaser Scenes for different game states (menu, game, inventory)
- Your existing images/sprites will work fine
- Consider using Phaser's Tilemap for better map performance
