"""
Force window to appear - Windows specific
"""

import pygame
import sys
import os

# Write all output to file
log_file = open("window_test_log.txt", "w", encoding="utf-8")

def log(msg):
    print(msg)
    log_file.write(msg + "\n")
    log_file.flush()

log("=" * 60)
log("FORCING WINDOW TO APPEAR TEST")
log("=" * 60)

try:
    # Set environment variables before pygame init
    os.environ['SDL_VIDEODRIVER'] = 'windib'
    os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = '1'
    
    log("\n1. Environment set")
    log(f"   SDL_VIDEODRIVER: {os.environ.get('SDL_VIDEODRIVER')}")
    
    log("\n2. Importing pygame...")
    import pygame
    log(f"   Pygame version: {pygame.version.ver}")
    
    log("\n3. Initializing pygame...")
    pygame.init()
    log(f"   Init result: {pygame.get_init()}")
    
    log("\n4. Display info:")
    try:
        log(f"   Driver: {pygame.display.get_driver()}")
        log(f"   Displays: {pygame.display.get_num_displays()}")
    except Exception as e:
        log(f"   Error: {e}")
    
    log("\n5. Creating window with explicit flags...")
    try:
        # Try with explicit flags
        screen = pygame.display.set_mode(
            (800, 600),
            pygame.RESIZABLE | pygame.DOUBLEBUF
        )
        log(f"   ✓ Window created: {screen.get_size()}")
        
        pygame.display.set_caption("FORCE WINDOW TEST - LOOK FOR THIS!")
        log("   Caption set")
        
        # Force window to front (Windows)
        try:
            import ctypes
            hwnd = pygame.display.get_wm_info()['window']
            ctypes.windll.user32.SetForegroundWindow(hwnd)
            ctypes.windll.user32.ShowWindow(hwnd, 9)  # SW_RESTORE
            log("   Window forced to foreground")
        except Exception as e:
            log(f"   Could not force to foreground: {e}")
        
        # Fill with very bright color
        screen.fill((255, 255, 0))  # Bright yellow
        pygame.display.flip()
        log("   Display updated with bright yellow")
        
        log("\n6. Window should be BRIGHT YELLOW and visible!")
        log("   If you don't see it, check:")
        log("   - Taskbar for Python/pygame window")
        log("   - Alt+Tab to switch windows")
        log("   - Multiple monitors")
        log("   - Window might be minimized")
        
        # Run loop
        clock = pygame.time.Clock()
        frames = 0
        max_frames = 300  # 5 seconds
        
        log("\n7. Running for 5 seconds...")
        while frames < max_frames:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    log("   QUIT event received")
                    break
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        log("   ESC pressed")
                        break
            
            # Draw bright yellow with text
            screen.fill((255, 255, 0))
            font = pygame.font.Font(None, 72)
            text = font.render("CAN YOU SEE THIS?", True, (0, 0, 0))
            text_rect = text.get_rect(center=(400, 300))
            screen.blit(text, text_rect)
            
            pygame.display.flip()
            clock.tick(60)
            frames += 1
        
        log(f"   Completed {frames} frames")
        
    except Exception as e:
        log(f"   ✗ ERROR: {e}")
        import traceback
        for line in traceback.format_exc().split("\n"):
            log(f"   {line}")
    
    log("\n8. Cleaning up...")
    pygame.quit()
    log("   Done")
    
except Exception as e:
    log(f"\n✗ FATAL ERROR: {e}")
    import traceback
    for line in traceback.format_exc().split("\n"):
        log(f"   {line}")

log("\n" + "=" * 60)
log("TEST COMPLETE - Check window_test_log.txt for details")
log("=" * 60)

log_file.close()
