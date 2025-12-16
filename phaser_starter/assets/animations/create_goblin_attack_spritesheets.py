import os
from PIL import Image

# Get the script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
extracted_dir = os.path.join(script_dir, 'goblin_extracted')

# Directions to process
directions = ['south', 'north', 'east', 'west']

for direction in directions:
    # Path to frames for this direction
    frames_dir = os.path.join(extracted_dir, 'animations', 'lead-jab', direction)
    
    if not os.path.exists(frames_dir):
        print(f'Warning: {frames_dir} does not exist')
        continue
    
    # Get all frame files and sort them
    frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    
    if not frame_files:
        print(f'Warning: No frames found in {frames_dir}')
        continue
    
    # Load all frames
    frames = []
    frame_width = 0
    frame_height = 0
    
    for frame_file in frame_files:
        frame_path = os.path.join(frames_dir, frame_file)
        frame_img = Image.open(frame_path)
        frames.append(frame_img)
        frame_width = frame_img.width
        frame_height = frame_img.height
    
    # Create spritesheet (horizontal layout)
    spritesheet_width = frame_width * len(frames)
    spritesheet_height = frame_height
    spritesheet = Image.new('RGBA', (spritesheet_width, spritesheet_height), (0, 0, 0, 0))
    
    # Paste frames horizontally
    x_offset = 0
    for frame in frames:
        spritesheet.paste(frame, (x_offset, 0))
        x_offset += frame_width
    
    # Save the spritesheet
    output_path = os.path.join(script_dir, f'monster_goblin_attack_{direction}.png')
    spritesheet.save(output_path)
    print(f'Created spritesheet: monster_goblin_attack_{direction}.png ({spritesheet_width}x{spritesheet_height}, {len(frames)} frames)')

print('Done!')

