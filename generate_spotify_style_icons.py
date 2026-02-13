#!/usr/bin/env python3
"""Generate professional music app icons similar to Spotify, Apple Music, etc."""

import struct
import zlib
import os
import math

def create_music_app_icon(size: int, output_path: str):
    """Create a professional music app icon with gradient and musical design."""
    
    pixels = bytearray()
    center_x, center_y = size / 2, size / 2
    
    for y in range(size):
        row = bytearray()
        for x in range(size):
            # Create circular gradient background (purple to pink to white)
            dx = (x - center_x) / size
            dy = (y - center_y) / size
            dist = math.sqrt(dx * dx + dy * dy)
            
            # Normalize distance for gradient
            ratio = min(dist * 2.5, 1.0)
            
            # Create vibrant purple to pink gradient (like Spotify)
            # Purple: #1DB954 -> Pink: #FF006E
            r = int(29 + (255 - 29) * ratio)    # 29 -> 255
            g = int(185 - (185 - 0) * ratio)    # 185 -> 0
            b = int(84 + (110 - 84) * ratio)    # 84 -> 110
            
            alpha = 255
            
            # Create multiple musical notes overlapping
            # Note 1 - Left side, lower
            note1_x = size * 0.25
            note1_y = size * 0.6
            
            # Note 2 - Right side, higher
            note2_x = size * 0.65
            note2_y = size * 0.35
            
            # Note 3 - Center, medium
            note3_x = size * 0.5
            note3_y = size * 0.5
            
            # Draw notes with varying sizes
            for note_x, note_y, note_size in [(note1_x, note1_y, size // 8), 
                                               (note2_x, note2_y, size // 7),
                                               (note3_x, note3_y, size // 9)]:
                dx = x - note_x
                dy = y - note_y
                dist_to_note = math.sqrt(dx * dx + dy * dy)
                
                # Note head (circle)
                if dist_to_note < note_size * 0.5:
                    r, g, b = 255, 255, 255  # White note heads
                    alpha = 255
                
                # Note stem (thin vertical line)
                stem_x = note_x + note_size * 0.4
                stem_thickness = max(1, int(note_size * 0.15))
                if abs(x - stem_x) < stem_thickness and note_y - note_size * 1.5 < y < note_y:
                    r, g, b = 255, 255, 255
                    alpha = 255
            
            # Add some glow/highlight effect
            if dist < 0.2:
                highlight = (1 - dist / 0.2) * 0.3
                r = min(255, int(r + highlight * 100))
                g = min(255, int(g + highlight * 100))
                b = min(255, int(b + highlight * 100))
            
            row.extend([r, g, b, alpha])
        
        pixels.append(0)  # Filter type: None
        pixels.extend(row)
    
    # Create PNG
    png_data = bytearray()
    png_data.extend(b'\x89PNG\r\n\x1a\n')
    
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png_data.extend(create_chunk(b'IHDR', ihdr_data))
    
    compressed = zlib.compress(bytes(pixels))
    png_data.extend(create_chunk(b'IDAT', compressed))
    png_data.extend(create_chunk(b'IEND', b''))
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(png_data)
    
    print(f"✅ Created {output_path}")

def create_chunk(chunk_type: bytes, data: bytes) -> bytes:
    """Create a PNG chunk with CRC."""
    chunk = chunk_type + data
    crc = zlib.crc32(chunk) & 0xffffffff
    length = struct.pack('>I', len(data))
    return length + chunk + struct.pack('>I', crc)

# Generate professional music app icons
output_dir = '/Users/s0m13i5/linus/multi-media/frontend/public'
print("🎵 Generating professional music app icons (Spotify-style)...\n")

create_music_app_icon(192, f'{output_dir}/icon-192x192.png')
create_music_app_icon(512, f'{output_dir}/icon-512x512.png')
create_music_app_icon(192, f'{output_dir}/icon-192x192-maskable.png')
create_music_app_icon(512, f'{output_dir}/icon-512x512-maskable.png')

# Also update favicon with new style
print("\n🎨 Updating favicons with new design...\n")
create_music_app_icon(32, f'{output_dir}/favicon-32x32.png')
create_music_app_icon(16, f'{output_dir}/favicon-16x16.png')

print("\n✅ All professional music app icons generated successfully!")
print("🎨 Style: Vibrant purple-to-pink gradient with layered musical notes")
print("📱 Perfect for modern music streaming apps!")
