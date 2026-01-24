#!/usr/bin/env python3
"""
Generate professional app icons for LinusPlaylists
Creates a modern, gradient-based icon with musical notes
"""

from PIL import Image, ImageDraw, ImageFont
import math

def create_gradient_background(size, colors):
    """Create a radial gradient background"""
    img = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(img)
    
    # Radial gradient from center
    center_x, center_y = size // 2, size // 2
    max_radius = math.sqrt(2) * size / 2
    
    for y in range(size):
        for x in range(size):
            # Calculate distance from center
            distance = math.sqrt((x - center_x)**2 + (y - center_y)**2)
            ratio = distance / max_radius
            ratio = min(1.0, ratio)
            
            # Interpolate between colors
            r = int(colors[0][0] + (colors[1][0] - colors[0][0]) * ratio)
            g = int(colors[0][1] + (colors[1][1] - colors[0][1]) * ratio)
            b = int(colors[0][2] + (colors[1][2] - colors[0][2]) * ratio)
            
            img.putpixel((x, y), (r, g, b))
    
    return img

def create_icon(size=1024):
    """Create main app icon"""
    # Brand colors: blue to purple gradient
    color1 = (59, 130, 246)   # #3b82f6 (blue)
    color2 = (139, 92, 246)   # #8b5cf6 (purple)
    
    # Create gradient background
    img = create_gradient_background(size, [color1, color2])
    draw = ImageDraw.Draw(img)
    
    # Add rounded corners
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    corner_radius = size // 5
    mask_draw.rounded_rectangle([(0, 0), (size, size)], corner_radius, fill=255)
    
    # Apply mask for rounded corners
    output = Image.new('RGBA', (size, size))
    output.paste(img, (0, 0))
    output.putalpha(mask)
    
    draw = ImageDraw.Draw(output)
    
    # Draw musical notes (larger and centered)
    note_size = size // 2.5
    
    # First note (main)
    note1_x = size // 2 - note_size // 3
    note1_y = size // 2 - note_size // 6
    
    # Note head (filled circle)
    head_radius = note_size // 5
    draw.ellipse([
        note1_x - head_radius, note1_y + head_radius,
        note1_x + head_radius, note1_y + head_radius + head_radius * 2
    ], fill='white')
    
    # Note stem
    stem_width = head_radius // 3
    stem_height = note_size // 1.5
    draw.rectangle([
        note1_x + head_radius - stem_width, note1_y - stem_height,
        note1_x + head_radius, note1_y + head_radius
    ], fill='white')
    
    # Note flag (curved)
    flag_points = [
        (note1_x + head_radius, note1_y - stem_height),
        (note1_x + head_radius + head_radius, note1_y - stem_height + head_radius),
        (note1_x + head_radius + head_radius // 2, note1_y - stem_height // 2),
        (note1_x + head_radius, note1_y - stem_height // 2)
    ]
    draw.polygon(flag_points, fill='white')
    
    # Second note (smaller, offset)
    note2_x = note1_x + note_size // 2
    note2_y = note1_y + head_radius
    head_radius2 = int(head_radius * 0.8)
    
    draw.ellipse([
        note2_x - head_radius2, note2_y + head_radius2,
        note2_x + head_radius2, note2_y + head_radius2 + head_radius2 * 2
    ], fill='white')
    
    stem_width2 = head_radius2 // 3
    stem_height2 = int(stem_height * 0.9)
    draw.rectangle([
        note2_x + head_radius2 - stem_width2, note2_y - stem_height2,
        note2_x + head_radius2, note2_y + head_radius2
    ], fill='white')
    
    # Add subtle shine effect (top-left highlight)
    shine = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    shine_draw = ImageDraw.Draw(shine)
    shine_draw.ellipse([
        size // 10, size // 10,
        size // 2, size // 2
    ], fill=(255, 255, 255, 30))
    
    output = Image.alpha_composite(output, shine)
    
    return output

def create_adaptive_icon(size=1024):
    """Create Android adaptive icon (foreground only)"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw larger musical notes for adaptive icon
    note_size = size // 2
    
    # First note
    note1_x = size // 2 - note_size // 4
    note1_y = size // 2 - note_size // 8
    
    head_radius = note_size // 4
    draw.ellipse([
        note1_x - head_radius, note1_y + head_radius,
        note1_x + head_radius, note1_y + head_radius + head_radius * 2
    ], fill='white')
    
    stem_width = head_radius // 3
    stem_height = note_size // 1.3
    draw.rectangle([
        note1_x + head_radius - stem_width, note1_y - stem_height,
        note1_x + head_radius, note1_y + head_radius
    ], fill='white')
    
    # Second note
    note2_x = note1_x + note_size // 2.5
    note2_y = note1_y + head_radius // 2
    head_radius2 = int(head_radius * 0.85)
    
    draw.ellipse([
        note2_x - head_radius2, note2_y + head_radius2,
        note2_x + head_radius2, note2_y + head_radius2 + head_radius2 * 2
    ], fill='white')
    
    stem_width2 = head_radius2 // 3
    stem_height2 = int(stem_height * 0.9)
    draw.rectangle([
        note2_x + head_radius2 - stem_width2, note2_y - stem_height2,
        note2_x + head_radius2, note2_y + head_radius2
    ], fill='white')
    
    return img

# Generate icons
print("🎨 Generating LinusPlaylists app icons...")

# Main icon (1024x1024)
icon = create_icon(1024)
icon.save('/Users/s0m13i5/linus/multi-media/mobile/assets/icon.png')
print("✅ Generated: assets/icon.png (1024x1024)")

# Adaptive icon foreground
adaptive = create_adaptive_icon(1024)
adaptive.save('/Users/s0m13i5/linus/multi-media/mobile/assets/adaptive-icon.png')
print("✅ Generated: assets/adaptive-icon.png (1024x1024)")

# Splash icon
splash = create_icon(2048)
splash.save('/Users/s0m13i5/linus/multi-media/mobile/assets/splash-icon.png')
print("✅ Generated: assets/splash-icon.png (2048x2048)")

# Favicon
favicon = create_icon(512)
favicon = favicon.resize((48, 48), Image.Resampling.LANCZOS)
favicon.save('/Users/s0m13i5/linus/multi-media/mobile/assets/favicon.png')
print("✅ Generated: assets/favicon.png (48x48)")

# iOS icon (will be picked up by expo prebuild)
ios_icon = create_icon(1024)
ios_icon.save('/Users/s0m13i5/linus/multi-media/mobile/assets/app-icon.png')
print("✅ Generated: assets/app-icon.png (1024x1024)")

print("\n🎉 All icons generated successfully!")
print("\n📝 Next steps:")
print("1. Run: expo prebuild --clean")
print("2. Check icons in mobile/ios/LinusPlaylists/Images.xcassets/")
print("3. Build new version for App Store")
