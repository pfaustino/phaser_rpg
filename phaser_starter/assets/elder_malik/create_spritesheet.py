#!/usr/bin/env python3
"""Combine NPC direction images into a spritesheet."""
from PIL import Image
import os

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Load the 4 direction images
directions = ['south', 'west', 'east', 'north']
images = []
for direction in directions:
    img_path = os.path.join(script_dir, f'{direction}.png')
    if os.path.exists(img_path):
        img = Image.open(img_path)
        images.append(img)
        print(f'Loaded {direction}.png: {img.size}')
    else:
        print(f'Warning: {img_path} not found')

if len(images) == 4:
    # Get dimensions (assuming all are same size)
    width, height = images[0].size
    
    # Create a new image with 4 frames horizontally
    spritesheet_width = width * 4
    spritesheet_height = height
    spritesheet = Image.new('RGBA', (spritesheet_width, spritesheet_height), (0, 0, 0, 0))
    
    # Paste each image
    for i, img in enumerate(images):
        x = i * width
        spritesheet.paste(img, (x, 0))
        print(f'Pasted {directions[i]} at x={x}')
    
    # Save the spritesheet
    output_path = os.path.join(script_dir, 'ElderMalik.png')
    spritesheet.save(output_path)
    print(f'Spritesheet created: {output_path} ({spritesheet_width}x{spritesheet_height})')
else:
    print(f'Error: Expected 4 images, found {len(images)}')
