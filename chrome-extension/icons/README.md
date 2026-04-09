# Chrome Extension Setup

Chrome requires PNG icons, not SVG. Here's how to create them:

## Option 1: Use an online converter
1. Go to https://svgtopng.com/
2. Upload each SVG file
3. Download as PNG with correct dimensions

## Option 2: Use simple placeholder PNGs
For development, you can use any 16x16, 48x48, and 128x128 PNG images.

## Option 3: Create with ImageMagick
```bash
convert -background none icon16.svg icon16.png
convert -background none icon48.svg icon48.png
convert -background none icon128.svg icon128.png
```

## Quick Start (Development)
For now, just create simple colored square PNGs or download free icons from:
- https://icons8.com
- https://iconmonstr.com

The extension will work without icons, but Chrome will show a default puzzle piece.
