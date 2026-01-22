#!/bin/bash

# Resize screenshots from 1170x2532 to 1284x2778 (6.7" iPhone requirement)
# This script uses macOS's built-in sips tool

echo "📸 Resizing screenshots for App Store..."

# Create output directory
mkdir -p screenshots_resized

# Counter
count=0

# Process all PNG files in current directory
for file in *.png *.PNG 2>/dev/null; do
    if [ -f "$file" ]; then
        echo "Resizing: $file"
        sips -z 2778 1284 "$file" --out "screenshots_resized/$file"
        ((count++))
    fi
done

# Process all JPG/JPEG files
for file in *.jpg *.jpeg *.JPG *.JPEG 2>/dev/null; do
    if [ -f "$file" ]; then
        echo "Resizing: $file"
        sips -z 2778 1284 "$file" --out "screenshots_resized/$file"
        ((count++))
    fi
done

if [ $count -eq 0 ]; then
    echo "❌ No image files found in current directory"
    echo "Please run this script in the folder containing your screenshots"
else
    echo "✅ Resized $count screenshot(s)"
    echo "📁 Resized images saved to: screenshots_resized/"
    echo ""
    echo "New dimensions: 1284 × 2778 pixels (6.7\" iPhone)"
fi
