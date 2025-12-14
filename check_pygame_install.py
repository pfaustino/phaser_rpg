"""
Check if pygame is properly installed and can create windows
"""

import sys
import subprocess

print("=" * 60)
print("CHECKING PYGAME INSTALLATION")
print("=" * 60)

# Check Python version
print(f"\nPython version: {sys.version}")

# Check if pygame is installed
print("\n1. Checking pygame installation...")
try:
    result = subprocess.run(
        [sys.executable, "-m", "pip", "show", "pygame"],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print("   ✓ Pygame is installed")
        for line in result.stdout.split('\n'):
            if 'Version:' in line:
                print(f"   {line.strip()}")
    else:
        print("   ✗ Pygame not found via pip")
        print("   Installing pygame...")
        install_result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "pygame"],
            capture_output=True,
            text=True
        )
        print(install_result.stdout)
except Exception as e:
    print(f"   Error: {e}")

# Try importing pygame
print("\n2. Testing pygame import...")
try:
    import pygame
    print(f"   ✓ Pygame imported successfully")
    print(f"   Version: {pygame.version.ver}")
except Exception as e:
    print(f"   ✗ Failed to import pygame: {e}")
    sys.exit(1)

# Try initializing
print("\n3. Testing pygame initialization...")
try:
    pygame.init()
    init_result = pygame.get_init()
    print(f"   ✓ Pygame initialized")
    print(f"   Modules initialized: {init_result}")
except Exception as e:
    print(f"   ✗ Failed to initialize: {e}")
    sys.exit(1)

# Check display
print("\n4. Checking display...")
try:
    driver = pygame.display.get_driver()
    displays = pygame.display.get_num_displays()
    print(f"   Display driver: {driver}")
    print(f"   Number of displays: {displays}")
except Exception as e:
    print(f"   ✗ Error checking display: {e}")

# Try creating a window
print("\n5. Testing window creation...")
print("   This will open a window for 2 seconds")
print("   If you see a window, pygame is working!")
try:
    screen = pygame.display.set_mode((400, 300))
    pygame.display.set_caption("INSTALLATION TEST")
    print(f"   ✓ Window created: {screen.get_size()}")
    
    # Fill with bright color
    screen.fill((0, 255, 0))  # Green
    pygame.display.flip()
    
    import time
    clock = pygame.time.Clock()
    start = time.time()
    
    while time.time() - start < 2:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                break
        pygame.display.flip()
        clock.tick(60)
    
    pygame.quit()
    print("   ✓ Window test completed")
    
except Exception as e:
    print(f"   ✗ Failed to create window: {e}")
    import traceback
    traceback.print_exc()
    try:
        pygame.quit()
    except:
        pass

print("\n" + "=" * 60)
print("INSTALLATION CHECK COMPLETE")
print("=" * 60)
print("\nIf no window appeared, try:")
print("1. Run this script from a regular Command Prompt (not Cursor)")
print("2. Update your graphics drivers")
print("3. Check Windows Event Viewer for display errors")
