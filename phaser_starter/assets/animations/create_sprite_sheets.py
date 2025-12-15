import os
from PIL import Image

def create_sprite_sheet(character_name, direction):
    """Combine individual frames into a horizontal sprite sheet"""
    # Try walk-6-frames first (for spider), then fall back to walk
    frames_dir = f"{character_name}_extract/animations/walk-6-frames/{direction}"
    if not os.path.exists(frames_dir):
        frames_dir = f"{character_name}_extract/animations/walk/{direction}"
    output_path = f"monster_{character_name}_walk_{direction}.png"
    
    if not os.path.exists(frames_dir):
        print(f"Directory not found: {frames_dir}")
        return False
    
    # Get all frame files and sort them
    frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    
    if not frame_files:
        print(f"No frames found in {frames_dir}")
        return False
    
    # Load first frame to get dimensions
    first_frame = Image.open(os.path.join(frames_dir, frame_files[0]))
    frame_width, frame_height = first_frame.size
    
    # Create sprite sheet (horizontal strip)
    num_frames = len(frame_files)
    sprite_sheet_width = frame_width * num_frames
    sprite_sheet_height = frame_height
    
    sprite_sheet = Image.new('RGBA', (sprite_sheet_width, sprite_sheet_height), (0, 0, 0, 0))
    
    # Paste each frame into the sprite sheet
    for i, frame_file in enumerate(frame_files):
        frame = Image.open(os.path.join(frames_dir, frame_file))
        sprite_sheet.paste(frame, (i * frame_width, 0))
    
    sprite_sheet.save(output_path)
    print(f"Created {output_path} ({num_frames} frames, {frame_width}x{frame_height} each)")
    return True

# Create sprite sheets for goblin
for direction in ['south', 'north', 'east', 'west']:
    create_sprite_sheet('goblin', direction)

# Create sprite sheets for orc
for direction in ['south', 'north', 'east', 'west']:
    create_sprite_sheet('orc', direction)

# Create sprite sheets for skeleton
for direction in ['south', 'north', 'east', 'west']:
    create_sprite_sheet('skeleton', direction)

# Create sprite sheets for wolf
for direction in ['south', 'north', 'east', 'west']:
    create_sprite_sheet('wolf', direction)

# Create sprite sheets for dragon
for direction in ['south', 'north', 'east', 'west']:
    create_sprite_sheet('dragon', direction)

# Create sprite sheets for slime
for direction in ['south', 'north', 'east', 'west']:
    create_sprite_sheet('slime', direction)

# Create sprite sheets for ghost
for direction in ['south', 'north', 'east', 'west']:
    create_sprite_sheet('ghost', direction)

# Create sprite sheets for spider
for direction in ['south', 'north', 'east', 'west']:
    create_sprite_sheet('spider', direction)

print("\nAll sprite sheets created!")




