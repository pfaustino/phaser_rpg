from PIL import Image
img = Image.open("assets/images/obelisk.png").convert("RGBA")
print(f"Size: {img.size}")
print(f"Top-Left Pixel: {img.getpixel((0,0))}")
print(f"Top-Right Pixel: {img.getpixel((img.width-1, 0))}")
# Sample a few more
print(f"Pixel 10,10: {img.getpixel((10,10))}")
