from PIL import Image
import os

def extract_stills():
    directions = ['south', 'north', 'east', 'west']
    input_dir = 'assets/animations'
    output_dir = 'assets/animations'
    
    # Size to extract (first frame)
    width = 64
    height = 64
    
    for direction in directions:
        # Source file: monster-echo-mite-attack-{direction}.png (hyphens)
        source_filename = f"monster-echo-mite-attack-{direction}.png"
        source_path = os.path.join(input_dir, source_filename)
        
        # Target file: monster_echo_mite_{direction}.png (underscores)
        target_filename = f"monster_echo_mite_{direction}.png"
        target_path = os.path.join(output_dir, target_filename)
        
        if not os.path.exists(source_path):
            print(f"Skipping {direction}: Source not found at {source_path}")
            continue
            
        try:
            img = Image.open(source_path)
            # Crop the first 64x64 frame
            still_frame = img.crop((0, 0, width, height))
            
            # Save it, overwriting the old one
            still_frame.save(target_path)
            print(f"✅ Generated {target_filename} from {source_filename}")
            
        except Exception as e:
            print(f"❌ Error processing {direction}: {e}")

if __name__ == "__main__":
    extract_stills()
