#!/usr/bin/env python3
"""Generate a better icon for Linus Playlists - more sophisticated design."""

import struct
import zlib
import os

def create_gradient_music_icon(size: int, output_path: str):
    """Create a sophisticated PWA icon with musical elements and gradient."""
    
    # Create pixel data - RGBA format
    pixels = bytearray()
    center_x, center_y = size / 2, size / 2
    
    for y in range(size):
        row = bytearray()
        for x in range(size):
            # Calculate distance from center for gradient effect
            dx = (x - center_x) / size
            dy = (y - center_y) / size
            dist = (dx * dx + dy * dy) ** 0.5
            
            # Create a radial gradient from purple to pink
            ratio = min(dist * 2, 1.0)  # Normalize distance
            
            # Purple to pink gradient
            r = int(147 + (255 - 147) * ratio)  # #9333EA to pink
            g = int(51 + (102 - 51) * ratio)
            b = int(234 + (204 - 234) * ratio)
            
            # Add musical elements
            alpha = 255
            
            # Create musical staff lines (horizontal lines)
            note_center = size // 3
            staff_height = size // 20
            
            # Draw 3 staff lines
            for staff_line in range(3):
                line_y = note_center + staff_line * (staff_height * 2)
                if abs(y - line_y) < 2:
                    r, g, b = 255, 255, 255  # White line
                    break
            
            # Draw stylized musical notes
            note_x = size // 4
            note_y = note_center + staff_height
            note_radius = size // 10
            
            # First note head (circle)
            dx1 = x - note_x
            dy1 = y - note_y
            if (dx1 * dx1 + dy1 * dy1) < (note_radius * note_radius * 0.4):
                r, g, b = 255, 255, 255  # White
            
            # First note stem
            stem_x = note_x + note_radius * 0.4
            if abs(x - stem_x) < 2 and note_y - note_radius < y < note_y + note_radius:
                r, g, b = 255, 255, 255  # White
            
            # Second note (offset higher)
            note_x2 = size * 3 // 5
            note_y2 = note_center - staff_height * 2
            dx2 = x - note_x2
            dy2 = y - note_y2
            if (dx2 * dx2 + dy2 * dy2) < (note_radius * note_radius * 0.35):
                r, g, b = 255, 220, 100  # Light gold/white
            
            # Second note stem
            stem_x2 = note_x2 + note_radius * 0.35
            if abs(x - stem_x2) < 2 and note_y2 - note_radius * 1.2 < y < note_y2 + note_radius:
                r, g, b = 255, 220, 100
            
            # Add some shine/highlight in top-left
            if x < size * 0.3 and y < size * 0.3:
                highlight = (1 - dist) * 0.3
                r = min(255, int(r + highlight * 100))
                g = min(255, int(g + highlight * 100))
                b = min(255, int(b + highlight * 100))
            
            row.extend([r, g, b, alpha])
        
        # Add filter byte and row to pixels
        pixels.append(0)  # Filter type: None
        pixels.extend(row)
    
    # Create PNG structure
    png_data = bytearray()
    
    # PNG signature
    png_data.extend(b'\x89PNG\r\n\x1a\n')
    
    # IHDR chunk (image header)
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png_data.extend(create_chunk(b'IHDR', ihdr_data))
    
    # IDAT chunk (image data) - compressed pixels
    compressed = zlib.compress(bytes(pixels))
    png_data.extend(create_chunk(b'IDAT', compressed))
    
    # IEND chunk (end of file)
    png_data.extend(create_chunk(b'IEND', b''))
    
    # Write to file
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

# Generate icons
output_dir = '/Users/s0m13i5/linus/multi-media/frontend/public'
create_gradient_music_icon(192, f'{output_dir}/icon-192x192.png')
create_gradient_music_icon(512, f'{output_dir}/icon-512x512.png')
create_gradient_music_icon(192, f'{output_dir}/icon-192x192-maskable.png')
create_gradient_music_icon(512, f'{output_dir}/icon-512x512-maskable.png')

print("\n✅ All improved PWA icons generated successfully!")
print("📱 The new icons feature musical staff lines and notes with gradient background")
