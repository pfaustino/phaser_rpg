"""
Test if pygame window is actually being created
"""

import pygame
import sys
import time

print("Starting test...")
print("This will try to create a window and keep it open for 5 seconds")
print("If you see a window, pygame is working!")
print("If you don't see a window, there's a display issue")
print()

try:
    pygame.init()
    print(f"Pygame initialized: {pygame.get_init()}")
    
    print("Creating window...")
    screen = pygame.display.set_mode((640, 480))
    pygame.display.set_caption("VISIBILITY TEST")
    print(f"Window created: {screen.get_size()}")
    
    # Fill with bright color so it's obvious
    screen.fill((255, 0, 255))  # Bright magenta
    pygame.display.flip()
    print("Display updated")
    
    print("\nWindow should be visible NOW!")
    print("Look for a bright magenta/pink window")
    print("Waiting 5 seconds...")
    
    clock = pygame.time.Clock()
    start_time = time.time()
    
    while time.time() - start_time < 5:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                print("Window closed!")
                pygame.quit()
                sys.exit(0)
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    print("ESC pressed!")
                    pygame.quit()
                    sys.exit(0)
        
        # Keep drawing
        screen.fill((255, 0, 255))
        font = pygame.font.Font(None, 72)
        text = font.render("CAN YOU SEE THIS?", True, (255, 255, 255))
        text_rect = text.get_rect(center=(320, 240))
        screen.blit(text, text_rect)
        
        pygame.display.flip()
        clock.tick(60)
    
    print("5 seconds elapsed")
    pygame.quit()
    print("Test complete")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
