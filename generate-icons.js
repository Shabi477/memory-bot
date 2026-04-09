// Script to generate extension icons
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const outputDir = path.join(__dirname, 'chrome-extension', 'icons');

// Create a simple TM (ThreadMind) icon
async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    const fontSize = Math.round(size * 0.45);
    const cornerRadius = Math.round(size * 0.2);
    
    // Create a purple gradient icon with "TM" text
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#grad)"/>
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">TM</text>
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(outputDir, `icon${size}.png`));
    
    console.log(`Created icon${size}.png`);
  }

  console.log('All icons created successfully!');
}

generateIcons().catch(console.error);
