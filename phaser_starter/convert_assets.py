from PIL import Image
from pathlib import Path
from collections import deque
import math

def same_color(c1, c2, tolerance=60):
    return (abs(c1[0] - c2[0]) < tolerance and
            abs(c1[1] - c2[1]) < tolerance and
            abs(c1[2] - c2[2]) < tolerance)

def is_checkerboard(c):
    # Standard checkerboard colors (approximate for JPG)
    WHITE = (255, 255, 255)
    GRAY_1 = (204, 204, 204) # 0xCC
    GRAY_2 = (192, 192, 192) # 0xC0
    # Also include other potential gray levels found in common transparent textures
    
    return (same_color(c, WHITE) or 
            same_color(c, GRAY_1) or 
            same_color(c, GRAY_2))

def process_image(image_path):
    print(f"Processing {image_path.name}...")
    img = Image.open(image_path)
    img = img.convert("RGBA")
    
    width, height = img.size
    pixels = img.load()
    
    visited = set()
    
    # Start BFS from all four corners
    corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    
    start_color = pixels[0, 0]
    print(f"  Debug: (0,0) color: {start_color}")

    cleared_count = 0

    for start_node in corners:
        if start_node in visited:
            continue
            
        sx, sy = start_node
        sc = pixels[sx, sy]
        
        # Check if corner is somewhat background-like (high brightness or gray-ish)
        # and match checkerboard
        check = is_checkerboard(sc)
        if not check:
             # Fallback: if corner is VERY bright (near white), treat as background
             if sc[0] > 240 and sc[1] > 240 and sc[2] > 240:
                 check = True
             # Fallback: if corner is gray (r~g~b)
             elif abs(sc[0]-sc[1]) < 10 and abs(sc[1]-sc[2]) < 10:
                 check = True
        
        if not check:
            print(f"  Skipping corner {start_node} with color {sc}")
            continue
            
        queue = deque([start_node])
        visited.add(start_node)
        
        while queue:
            x, y = queue.popleft()
            
            # Set to transparent
            pixels[x, y] = (0, 0, 0, 0)
            cleared_count += 1
            
            # Check neighbors
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        neighbor_color = pixels[nx, ny]
                        # If neighbor matches checkerboard criteria
                        if is_checkerboard(neighbor_color):
                            visited.add((nx, ny))
                            queue.append((nx, ny))

    print(f"  Cleared {cleared_count} pixels.")
    # Save as PNG
    output_path = image_path.with_suffix(".png")
    img.save(output_path, "PNG")
    print(f"✅ Converted {image_path.name} -> {output_path.name}")

if __name__ == "__main__":
    assets_dir = Path("c:/rpg/phaser_starter/assets/images")
    images = list(assets_dir.glob("*.jpg"))
    
    if not images:
        print("No .jpg images found in assets/images")
    else:
        print(f"Found {len(images)} images. Processing...")
        for image_path in images:
            process_image(image_path)
        print(f"🎉 Finished! Converted {len(images)} images.")
