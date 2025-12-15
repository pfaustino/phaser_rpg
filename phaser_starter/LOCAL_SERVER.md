# Running the Game with a Local Server

## Why Do I Need a Server?

Browsers block loading audio files (and other resources) when you open HTML files directly from the file system (`file://` protocol) due to CORS (Cross-Origin Resource Sharing) security policies.

**Solution:** Run the game through a local web server using `http://localhost` instead.

## Quick Start

### Option 1: Use the Batch File (Easiest)

1. **Double-click `start_server.bat`**
2. A command window will open showing "Starting local web server..."
3. **Open your browser** and go to: `http://localhost:8000`
4. The game should now load with sounds working!

**To stop the server:** Press `Ctrl+C` in the command window.

### Option 2: Python (If you have Python installed)

Open a terminal in the `phaser_starter` folder and run:

```bash
python -m http.server 8000
```

Then open: `http://localhost:8000`

### Option 3: Node.js (If you have Node.js installed)

```bash
npx http-server -p 8000
```

Then open: `http://localhost:8000`

### Option 4: VS Code Live Server Extension

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Troubleshooting

**"No web server found" error:**
- Install Python from https://www.python.org/downloads/ (check "Add Python to PATH" during installation)
- Or install Node.js from https://nodejs.org/

**Port 8000 already in use:**
- The batch file will show an error
- Close other programs using port 8000, or modify the batch file to use a different port (e.g., 8001)

**Sounds still not working:**
- Make sure you're accessing via `http://localhost:8000` (not `file://`)
- Check the browser console (F12) for any errors
- Verify audio files are in `assets/audio/` folder












