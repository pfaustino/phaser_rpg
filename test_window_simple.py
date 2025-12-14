"""
Very simple pygame window test - run from command prompt
"""

import pygame
import sys
import time

print("=" * 60)
print("PYGAME WINDOW TEST")
print("=" * 60)
print()

try:
    print("1. Importing pygame...")
    import pygame
    print(f"   ✓ Pygame version: {pygame.version.ver}")
    
    print("\n2. Initializing pygame...")
    pygame.init()
    print(f"   ✓ Initialized: {pygame.get_init()}")
    
    print("\n3. Checking display...")
    try:
        print(f"   Driver: {pygame.display.get_driver()}")
        print(f"   Displays: {pygame.display.get_num_displays()}")
    except Exception as e:
        print(f"   Warning: {e}")
    
    print("\n4. Creating window...")
    print("   Window should appear NOW!")
    print("   Look for a BRIGHT GREEN window")
    print()
    
    screen = pygame.display.set_mode((600, 400))
    pygame.display.set_caption("PYGAME TEST - GREEN WINDOW")
    
    print(f"   ✓ Window created: {screen.get_size()}")
    
    # Fill with bright green
    screen.fill((0, 255, 0))
    pygame.display.flip()
    
    print("\n5. Window should be visible!")
    print("   If you don't see a GREEN window:")
    print("   - Check your taskbar")
    print("   - Try Alt+Tab")
    print("   - Check other monitors")
    print("   - Window will close in 5 seconds")
    print()
    
    clock = pygame.time.Clock()
    start_time = time.time()
    frame_count = 0
    
    while time.time() - start_time < 5:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                print("   Window closed by user")
                pygame.quit()
                sys.exit(0)
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    print("   ESC pressed")
                    pygame.quit()
                    sys.exit(0)
        
        # Keep drawing green
        screen.fill((0, 255, 0))
        font = pygame.font.Font(None, 48)
        text = font.render("CAN YOU SEE THIS?", True, (0, 0, 0))
        text_rect = text.get_rect(center=(300, 200))
        screen.blit(text, text_rect)
        
        pygame.display.flip()
        clock.tick(60)
        frame_count += 1
    
    print(f"   ✓ Ran for 5 seconds ({frame_count} frames)")
    pygame.quit()
    print("\n✓ Test completed successfully!")
    print("\nIf you saw a GREEN window, pygame is working!")
    print("If you didn't see a window, there's a display driver issue.")
    
except Exception as e:
    print(f"\n✗ ERROR: {e}")
    import traceback
    traceback.print_exc()
    try:
        pygame.quit()
    except:
        pass
    sys.exit(1)

print("\n" + "=" * 60)
