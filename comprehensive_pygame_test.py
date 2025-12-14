"""
Comprehensive pygame test - tries multiple solutions
"""

import os
import sys

# Try different SDL video drivers
drivers_to_try = ['windib', 'directx', None]

for driver in drivers_to_try:
    print(f"\n{'='*60}")
    print(f"TESTING WITH DRIVER: {driver or 'default'}")
    print(f"{'='*60}")
    
    # Set environment before importing pygame
    if driver:
        os.environ['SDL_VIDEODRIVER'] = driver
    elif 'SDL_VIDEODRIVER' in os.environ:
        del os.environ['SDL_VIDEODRIVER']
    
    try:
        import pygame
        
        print("1. Importing pygame... OK")
        print(f"   Version: {pygame.version.ver}")
        
        print("2. Initializing pygame...")
        pygame.init()
        print(f"   Init: {pygame.get_init()}")
        
        print("3. Display info:")
        try:
            print(f"   Driver: {pygame.display.get_driver()}")
            print(f"   Displays: {pygame.display.get_num_displays()}")
        except Exception as e:
            print(f"   Error: {e}")
        
        print("4. Creating window...")
        screen = pygame.display.set_mode((800, 600))
        print(f"   Window created: {screen.get_size()}")
        
        pygame.display.set_caption(f"TEST - Driver: {driver or 'default'}")
        
        # Fill with bright color
        screen.fill((0, 255, 255))  # Cyan
        pygame.display.flip()
        
        print("5. Window should be CYAN!")
        print("   Look for a bright cyan window")
        print("   Waiting 3 seconds...")
        
        import time
        clock = pygame.time.Clock()
        start_time = time.time()
        
        while time.time() - start_time < 3:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    print("   Window closed!")
                    pygame.quit()
                    sys.exit(0)
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        print("   ESC pressed!")
                        pygame.quit()
                        sys.exit(0)
            
            # Keep drawing
            screen.fill((0, 255, 255))
            font = pygame.font.Font(None, 48)
            text = font.render(f"DRIVER: {driver or 'default'}", True, (0, 0, 0))
            text_rect = text.get_rect(center=(400, 300))
            screen.blit(text, text_rect)
            
            pygame.display.flip()
            clock.tick(60)
        
        print("6. Test completed successfully!")
        print("   If you saw a cyan window, this driver works!")
        pygame.quit()
        
        # If we got here, the window worked!
        print(f"\n✓ SUCCESS! Driver '{driver or 'default'}' works!")
        print("You can use this driver in your game.")
        break
        
    except Exception as e:
        print(f"✗ Failed with driver '{driver or 'default'}': {e}")
        try:
            pygame.quit()
        except:
            pass
        continue

print("\n" + "="*60)
print("ALL TESTS COMPLETE")
print("="*60)
print("\nIf no window appeared, try:")
print("1. Update your graphics drivers")
print("2. Run from command line (not IDE)")
print("3. Check if window is on another monitor")
print("4. Check Task Manager for python.exe processes")
