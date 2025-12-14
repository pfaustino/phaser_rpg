"""
Diagnose pygame window issues - writes to file
"""

import pygame
import sys
import os
import traceback

output_file = "pygame_diagnosis.txt"

def log(msg):
    print(msg)
    with open(output_file, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

# Clear previous output
if os.path.exists(output_file):
    os.remove(output_file)

log("=" * 60)
log("PYGAME DIAGNOSIS")
log("=" * 60)

try:
    log("\n1. Python version:")
    log(f"   {sys.version}")
    
    log("\n2. Importing pygame...")
    import pygame
    log(f"   ✓ Pygame imported")
    log(f"   Pygame version: {pygame.version.ver}")
    
    log("\n3. Checking display environment...")
    log(f"   SDL_VIDEODRIVER: {os.environ.get('SDL_VIDEODRIVER', 'not set')}")
    
    log("\n4. Initializing pygame...")
    pygame.init()
    init_result = pygame.get_init()
    log(f"   Init result: {init_result}")
    
    log("\n5. Display information:")
    try:
        driver = pygame.display.get_driver()
        log(f"   Display driver: {driver}")
    except Exception as e:
        log(f"   Error getting driver: {e}")
    
    try:
        num_displays = pygame.display.get_num_displays()
        log(f"   Number of displays: {num_displays}")
    except Exception as e:
        log(f"   Error getting displays: {e}")
    
    try:
        video_info = pygame.display.Info()
        log(f"   Video info: {video_info}")
    except Exception as e:
        log(f"   Error getting video info: {e}")
    
    log("\n6. Attempting to create window...")
    try:
        screen = pygame.display.set_mode((800, 600))
        log(f"   ✓ Window created!")
        log(f"   Window size: {screen.get_size()}")
        pygame.display.set_caption("Diagnostic Test Window")
        log(f"   Window caption set")
        
        # Try to update display
        pygame.display.flip()
        log(f"   Display flipped")
        
        # Check if window is actually visible
        log("\n7. Window should be visible now!")
        log("   If you don't see it, there may be a display issue.")
        
        # Run for a few seconds
        clock = pygame.time.Clock()
        running = True
        frames = 0
        
        log("\n8. Running window loop for 3 seconds...")
        while running and frames < 180:  # 3 seconds at 60fps
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    log("   Window closed event received")
                    running = False
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        log("   ESC pressed")
                        running = False
            
            # Draw something
            screen.fill((100, 150, 200))
            font = pygame.font.Font(None, 48)
            text = font.render("DIAGNOSTIC TEST", True, (255, 255, 255))
            text_rect = text.get_rect(center=(400, 300))
            screen.blit(text, text_rect)
            
            pygame.display.flip()
            clock.tick(60)
            frames += 1
        
        log(f"   Loop completed ({frames} frames)")
        
    except Exception as e:
        log(f"   ✗ ERROR creating window: {e}")
        log(f"   Traceback:")
        for line in traceback.format_exc().split("\n"):
            log(f"   {line}")
    
    log("\n9. Cleaning up...")
    pygame.quit()
    log("   ✓ Pygame quit")
    
except Exception as e:
    log(f"\n✗ FATAL ERROR: {e}")
    log(f"Traceback:")
    for line in traceback.format_exc().split("\n"):
        log(f"   {line}")

log("\n" + "=" * 60)
log("DIAGNOSIS COMPLETE")
log("=" * 60)
log(f"\nCheck {output_file} for full output")
