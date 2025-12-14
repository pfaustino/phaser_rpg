import pygame
import sys

print("Starting...")
sys.stdout.flush()

try:
    print("Initializing pygame...")
    sys.stdout.flush()
    pygame.init()
    print(f"Init: {pygame.get_init()}")
    sys.stdout.flush()
    
    print("Creating window...")
    sys.stdout.flush()
    screen = pygame.display.set_mode((400, 300))
    print(f"Window created: {screen.get_size()}")
    sys.stdout.flush()
    
    pygame.display.set_caption("MINIMAL TEST")
    screen.fill((255, 0, 0))  # Red
    pygame.display.flip()
    
    print("Window should be RED and visible!")
    print("Press any key in the window or close it...")
    sys.stdout.flush()
    
    import time
    start = time.time()
    while time.time() - start < 3:
        for event in pygame.event.get():
            if event.type in (pygame.QUIT, pygame.KEYDOWN):
                break
        pygame.display.flip()
    
    pygame.quit()
    print("Done")
    sys.stdout.flush()
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.stdout.flush()
