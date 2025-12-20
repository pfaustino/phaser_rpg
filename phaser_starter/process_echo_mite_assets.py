from PIL import Image
import os

def process_image():
    # Load the source image (the one we just generated)
    # Note: You need to ensure the source path is correct. 
    # I'll assume the artifact was touched/moved to assets/monster_echo_mite_base.png or similar.
    # For now, let's use the explicit path if I can, or relative.
    
    source_path = 'assets/monster_echo_mite_base.png' 
    output_dir = 'assets/animations'
    
    if not os.path.exists(source_path):
        print(f"Source not found: {source_path}")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        img = Image.open(source_path)
        
        # Resize to standard size (e.g. 32x32) if needed, or keep as is.
        # Let's resize to 32x32 for consistency with other sprites
        img = img.resize((32, 32), Image.Resampling.NEAREST)

        # Generate directional variants (by rotating)
        # South (Default)
        img.save(os.path.join(output_dir, 'monster_echo_mite_south.png'))
        
        # North (Rotate 180)
        img.rotate(180).save(os.path.join(output_dir, 'monster_echo_mite_north.png'))
        
        # West (Rotate 90 CW from South? South is usually 0 or 270? 
        # In Phaser: South=90, West=180, North=270, East=0
        # Visually:
        # South: V
        # North: ^ (Rotate 180)
        # East: > (Rotate 90 CCW)
        # West: < (Rotate 90 CW)
        
        img.rotate(90).save(os.path.join(output_dir, 'monster_echo_mite_east.png'))
        img.rotate(-90).save(os.path.join(output_dir, 'monster_echo_mite_west.png'))
        
        print("Successfully generated directional sprites.")
        
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    process_image()
