"""
Diagnostic pygame test with detailed output
"""

import pygame
import sys
import os

print("=" * 50)
print("PYGAME DIAGNOSTIC TEST")
print("=" * 50)

print("\n1. Checking pygame import...")
try:
    import pygame
    print(f"   ✓ Pygame imported successfully")
    print(f"   Pygame version: {pygame.version.ver}")
except Exception as e:
    print(f"   ✗ Error importing pygame: {e}")
    sys.exit(1)

print("\n2. Checking display availability...")
try:
    print(f"   Display driver: {pygame.display.get_driver()}")
    print(f"   Available displays: {pygame.display.get_num_displays()}")
except Exception as e:
    print(f"   ✗ Error checking display: {e}")

print("\n3. Initializing pygame...")
try:
    pygame.init()
    print(f"   ✓ Pygame initialized")
    print(f"   Modules initialized: {pygame.get_init()}")
except Exception as e:
    print(f"   ✗ Error initializing pygame: {e}")
    sys.exit(1)

print("\n4. Creating window...")
try:
    screen = pygame.display.set_mode((800, 600))
    print(f"   ✓ Window created successfully")
    print(f"   Window size: {screen.get_size()}")
    pygame.display.set_caption("Pygame Test Window")
except Exception as e:
    print(f"   ✗ Error creating window: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n5. Window should be visible now!")
print("   Look for a window titled 'Pygame Test Window'")
print("   Press ESC or close the window to exit")
print("=" * 50)

clock = pygame.time.Clock()
running = True
frame_count = 0

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
BLUE = (0, 0, 255)
RED = (255, 0, 0)

font = pygame.font.Font(None, 36)

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            print("\nWindow closed by user")
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                print("\nESC pressed, exiting...")
                running = False
    
    # Clear screen
    screen.fill(BLACK)
    
    # Draw some text
    text = font.render("Pygame Test Window", True, WHITE)
    text_rect = text.get_rect(center=(400, 200))
    screen.blit(text, text_rect)
    
    text2 = font.render("If you see this, pygame is working!", True, BLUE)
    text2_rect = text2.get_rect(center=(400, 300))
    screen.blit(text2, text2_rect)
    
    text3 = font.render("Press ESC to exit", True, WHITE)
    text3_rect = text3.get_rect(center=(400, 400))
    screen.blit(text3, text3_rect)
    
    # Draw a simple animated shape
    frame_count += 1
    x_pos = 400 + int(50 * pygame.math.sin(frame_count * 0.1))
    pygame.draw.circle(screen, RED, (x_pos, 500), 30)
    
    pygame.display.flip()
    clock.tick(60)

print("\n6. Cleaning up...")
pygame.quit()
print("   ✓ Pygame quit successfully")
print("\nTest complete!")
sys.exit(0)
