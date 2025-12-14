# Testing Pygame Windows

If pygame windows are not appearing, try these steps:

## Method 1: Run from Command Prompt (Recommended)

1. Open **Command Prompt** (not Cursor's terminal)
2. Navigate to the project folder:
   ```
   cd c:\rpg
   ```
3. Run the test:
   ```
   python test_window_simple.py
   ```

## Method 2: Double-click Batch File

1. Double-click `test_pygame_window.bat` in Windows Explorer
2. This will run the test in a regular command window

## Method 3: Check Graphics Drivers

If windows still don't appear:

1. **Update your graphics drivers**:
   - Right-click Start → Device Manager
   - Expand "Display adapters"
   - Right-click your graphics card → Update driver

2. **Check Windows Event Viewer**:
   - Search for "Event Viewer" in Windows
   - Look for errors related to display/graphics

## Method 4: Try Different SDL Driver

Edit `test_window_simple.py` and add at the top (before importing pygame):

```python
import os
os.environ['SDL_VIDEODRIVER'] = 'windib'
```

Then run it again.

## Common Issues

- **Window opens off-screen**: Check all monitors, try Alt+Tab
- **Window minimized**: Check taskbar for Python icon
- **No window at all**: Likely graphics driver issue
- **Cursor terminal shows no output**: This is normal - run from Command Prompt instead

## If Nothing Works

Pygame might not be compatible with your system. Consider:
- Using a different Python version
- Installing pygame-ce (community edition): `pip install pygame-ce`
- Checking if you're using WSL or a virtual environment that doesn't support GUI
