#!/usr/bin/env python3
"""Generate favicon (16x16, 32x32, 64x64) for Linus Playlists."""

import struct
import zlib
import os

def create_favicon(size: int, output_path: str):
    """Create a small favicon with musical note design."""
    
    pixels = bytearray()
    
    for y in range(size):
        row = bytearray()
        for x in range(size):
            # Purple background
            r, g, b = 147, 51, 234  # #9333EA
            
            # Center area - white musical note
            center = size // 2
            radius = size // 4
            
            dx = x - center
            dy = y - center
            dist = (dx * dx + dy * dy) ** 0.5
            
            # Draw a more visible note for small sizes
            if dist < radius * 0.8:
                r, g, b = 255, 255, 255  # White
            
            row.extend([r, g, b, 255])
        
        pixels.append(0)
        pixels.extend(row)
    
    # Create PNG structure (ICO files can contain PNGs)
    png_data = bytearray()
    png_data.extend(b'\x89PNG\r\n\x1a\n')
    
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png_data.extend(_create_chunk(b'IHDR', ihdr_data))
    
    compressed = zlib.compress(bytes(pixels))
    png_data.extend(_create_chunk(b'IDAT', compressed))
    png_data.extend(_create_chunk(b'IEND', b''))
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(png_data)
    
    print(f"✅ Created {output_path}")

def _create_chunk(chunk_type: bytes, data: bytes) -> bytes:
    """Create a PNG chunk with CRC."""
    chunk = chunk_type + data
    crc = zlib.crc32(chunk) & 0xffffffff
    length = struct.pack('>I', len(data))
    return length + chunk + struct.pack('>I', crc)

# Generate favicons
output_dir = '/Users/s0m13i5/linus/multi-media/frontend/public'
create_favicon(32, f'{output_dir}/favicon.png')

# Also create the alternative favicon format
create_favicon(16, f'{output_dir}/favicon-16x16.png')
create_favicon(32, f'{output_dir}/favicon-32x32.png')

print("\n✅ All favicons generated successfully!")
