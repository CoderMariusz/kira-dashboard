// Simple icon generator using Node Canvas API (no external deps)
const fs = require('fs');
const path = require('path');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-icon.png', size: 180 }
];

const themeColor = '#3B82F6'; // Blue-500

// Create SVG icons (Canvas fallback)
sizes.forEach(({ name, size }) => {
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${themeColor}"/>
  <text 
    x="50%" 
    y="50%" 
    dominant-baseline="middle" 
    text-anchor="middle" 
    font-family="Arial, sans-serif" 
    font-size="${size * 0.6}" 
    font-weight="bold" 
    fill="white"
  >K</text>
</svg>`.trim();

  const outputPath = path.join(__dirname, '../public/icons', name.replace('.png', '.svg'));
  fs.writeFileSync(outputPath, svg);
  console.log(`✓ Created ${name.replace('.png', '.svg')}`);
});

console.log('\n✅ Icon generation complete! Using SVG format for simplicity.');
console.log('For production, consider using PNG icons generated from design tool.');
