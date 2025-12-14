"""Test if pygame can open a window"""
import pygame
import sys

try:
    pygame.init()
    print("Pygame initialized")
    
    screen = pygame.display.set_mode((800, 600))
    print("Window created")
    pygame.display.set_caption("Test Window")
    
    print("Window should be visible now. Press any key or close window to exit.")
    
    running = True
    clock = pygame.time.Clock()
    
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                running = False
        
        screen.fill((100, 150, 200))
        font = pygame.font.Font(None, 36)
        text = font.render("If you see this, pygame works!", True, (255, 255, 255))
        text_rect = text.get_rect(center=(400, 300))
        screen.blit(text, text_rect)
        pygame.display.flip()
        clock.tick(60)
    
    pygame.quit()
    print("Window closed")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)



