#!/usr/bin/env python3
"""Generate PWA icons for Linus Playlists app."""

from PIL import Image, ImageDraw
import os

def create_icon(size: int, output_path: str, maskable: bool = False):
    """Create a PWA icon with purple gradient and music note."""
    
    # Create image with white background for maskable icons, gradient for regular
    if maskable:
        # For maskable icons, use a solid color with transparent background
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
    else:
        # Create gradient background
        img = Image.new('RGB', (size, size), (147, 51, 234))  # Purple: #9333EA
        draw = ImageDraw.Draw(img)
    
    # Draw gradient (light to dark purple)
    for y in range(size):
        # Gradient from lighter purple to darker purple
        ratio = y / size
        r = int(180 - (180 - 147) * ratio)
        g = int(100 - (100 - 51) * ratio)
        b = int(220 - (220 - 234) * ratio)
        if maskable:
            color = (r, g, b, 255)
        else:
            color = (r, g, b)
        draw.line([(0, y), (size, y)], fill=color)
    
    # Draw music note
    center_x = size // 2
    center_y = size // 2
    note_size = size // 3
    
    # Music note color
    note_color = (255, 255, 255)  # White
    
    # Draw the note head (bottom circle)
    head_radius = note_size // 4
    head_x = center_x - note_size // 8
    head_y = center_y + note_size // 3
    draw.ellipse(
        [head_x - head_radius, head_y - head_radius, 
         head_x + head_radius, head_y + head_radius],
        fill=note_color
    )
    
    # Draw the stem (vertical line)
    stem_x = head_x + head_radius
    stem_y_start = head_y - head_radius - note_size // 2
    stem_y_end = head_y - head_radius
    draw.line(
        [(stem_x, stem_y_start), (stem_x, stem_y_end)],
        fill=note_color,
        width=max(2, note_size // 8)
    )
    
    # Draw the flag (curved line for musical flag)
    flag_x_start = stem_x
    flag_y_start = stem_y_start
    flag_x_end = stem_x + note_size // 3
    flag_y_end = stem_y_start + note_size // 4
    draw.arc(
        [flag_x_start, flag_y_start, flag_x_end, flag_y_end],
        0, 180,
        fill=note_color,
        width=max(2, note_size // 8)
    )
    
    # Save the image
    if maskable:
        img.save(output_path, 'PNG')
    else:
        # Convert RGBA to RGB for non-maskable icons if needed
        if img.mode == 'RGBA':
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[3])
            rgb_img.save(output_path, 'PNG')
        else:
            img.save(output_path, 'PNG')
    
    print(f"✅ Created {output_path}")

# Create output directory if it doesn't exist
os.makedirs('/Users/s0m13i5/linus/multi-media/frontend/public', exist_ok=True)

# Generate icons
create_icon(192, '/Users/s0m13i5/linus/multi-media/frontend/public/icon-192x192.png')
create_icon(512, '/Users/s0m13i5/linus/multi-media/frontend/public/icon-512x512.png')
create_icon(192, '/Users/s0m13i5/linus/multi-media/frontend/public/icon-192x192-maskable.png', maskable=True)
create_icon(512, '/Users/s0m13i5/linus/multi-media/frontend/public/icon-512x512-maskable.png', maskable=True)

print("\n✅ All PWA icons generated successfully!")
