from PIL import Image
img = Image.open("assets/images/obelisk.png").convert("RGBA")
datas = img.getdata()
transparent_count = 0
for item in datas:
    if item[3] == 0:
        transparent_count += 1

print(f"Total Pixels: {len(datas)}")
print(f"Transparent Pixels: {transparent_count}")
if transparent_count > 0:
    print("SUCCESS: Transparency present.")
else:
    print("FAILURE: No transparency.")
