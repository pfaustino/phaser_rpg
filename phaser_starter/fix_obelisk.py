from PIL import Image

def fix_obelisk():
    input_path = "assets/images/obelisk.png"
    output_path = "assets/images/obelisk.png"

    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        newData = []

        # Identified background colors
        bg_colors = [
            (73, 73, 73),
            (127, 127, 127)
        ]
        
        # Helper to check proximity or exact match
        def is_bg(r, g, b):
            for bg in bg_colors:
                # Exact match check (safe for NEAREST resized pixel art)
                if r == bg[0] and g == bg[1] and b == bg[2]:
                    return True
                # Tolerance check (just in case)
                if abs(r - bg[0]) < 5 and abs(g - bg[1]) < 5 and abs(b - bg[2]) < 5:
                    return True
            return False

        for item in datas:
            if is_bg(item[0], item[1], item[2]):
                newData.append((255, 255, 255, 0)) # Transparent
            else:
                newData.append(item)

        img.putdata(newData)
        
        # Now try to crop again just to be clean
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            print(f"Cropped to: {img.size}")
        
        img.save(output_path)
        print("Obelisk fixed (alpha applied) and saved.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_obelisk()
