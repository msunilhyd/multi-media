#!/usr/bin/env python3
"""Generate PWA icons using base64-encoded PNG data."""

import base64
import struct
import zlib
import os

def create_simple_png(size: int, output_path: str):
    """Create a simple purple PNG with white music note using raw PNG encoding."""
    
    # Create pixel data - purple background with white center (for music note)
    pixels = bytearray()
    
    for y in range(size):
        row = bytearray()
        for x in range(size):
            # Gradient purple background
            ratio_y = y / size
            r = int(180 - (180 - 147) * ratio_y)
            g = int(100 - (100 - 51) * ratio_y)
            b = int(220 - (220 - 234) * ratio_y)
            
            # Check if this pixel is part of the center music note area
            center_x, center_y = size // 2, size // 2
            note_radius = size // 6
            dist = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
            
            if dist < note_radius:
                # White for music note
                row.extend([255, 255, 255, 255])
            else:
                # Purple gradient
                row.extend([r, g, b, 255])
        
        # Add filter byte and row to pixels
        pixels.append(0)  # Filter type: None
        pixels.extend(row)
    
    # Create PNG structure
    png_data = bytearray()
    
    # PNG signature
    png_data.extend(b'\x89PNG\r\n\x1a\n')
    
    # IHDR chunk (image header)
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)  # width, height, bit depth, color type RGBA, etc
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
create_simple_png(192, f'{output_dir}/icon-192x192.png')
create_simple_png(512, f'{output_dir}/icon-512x512.png')
create_simple_png(192, f'{output_dir}/icon-192x192-maskable.png')
create_simple_png(512, f'{output_dir}/icon-512x512-maskable.png')

print("\n✅ All PWA icons generated successfully!")
