"""
Simple pygame test to verify pygame can open a window
"""

import pygame
import sys

def main():
    print("Initializing pygame...")
    pygame.init()
    
    print("Creating window...")
    screen = pygame.display.set_mode((800, 600))
    pygame.display.set_caption("Pygame Test Window")
    
    print("Window created! You should see a window.")
    print("Press ESC or close the window to exit.")
    
    clock = pygame.time.Clock()
    running = True
    
    # Colors
    BLACK = (0, 0, 0)
    WHITE = (255, 255, 255)
    BLUE = (0, 0, 255)
    
    font = pygame.font.Font(None, 36)
    
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
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
        
        # Draw a simple shape
        pygame.draw.circle(screen, (255, 0, 0), (400, 500), 30)
        
        pygame.display.flip()
        clock.tick(60)
    
    print("Closing pygame...")
    pygame.quit()
    print("Test complete!")
    sys.exit()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
