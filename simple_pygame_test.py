"""
Very simple pygame test - minimal code
"""

import pygame
import sys

# Initialize
pygame.init()

# Create window
screen = pygame.display.set_mode((640, 480))
pygame.display.set_caption("SIMPLE TEST - Can you see this?")

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

# Main loop
running = True
clock = pygame.time.Clock()

print("Window should be open now!")
print("Look for a window titled 'SIMPLE TEST - Can you see this?'")
print("If you don't see it, try Alt+Tab to switch windows")

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                running = False
    
    # Fill screen with white
    screen.fill(WHITE)
    
    # Draw black text
    font = pygame.font.Font(None, 48)
    text = font.render("HELLO!", True, BLACK)
    text_rect = text.get_rect(center=(320, 240))
    screen.blit(text, text_rect)
    
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
print("Test finished")
