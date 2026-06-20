// Generates PWA icons from an inline SVG (no external assets / fonts).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons');
mkdirSync(OUT, { recursive: true });

// A cute speech-bubble mascot — pure shapes, kid-friendly.
function svg({ scale = 1 } = {}) {
  const m = (1 - scale) * 256; // margin for maskable safe zone
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b7bff"/>
      <stop offset="1" stop-color="#6d5cff"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <g transform="translate(${m},${m}) scale(${scale})">
    <rect x="96" y="120" width="320" height="232" rx="64" fill="#ffffff"/>
    <path d="M 188 348 L 256 348 L 200 412 Z" fill="#ffffff"/>
    <circle cx="196" cy="232" r="26" fill="#2a2350"/>
    <circle cx="316" cy="232" r="26" fill="#2a2350"/>
    <path d="M 188 286 Q 256 340 324 286" stroke="#2a2350" stroke-width="22" stroke-linecap="round" fill="none"/>
  </g>
</svg>`;
}

const tasks = [
  { name: 'icon-192.png', size: 192, scale: 1 },
  { name: 'icon-512.png', size: 512, scale: 1 },
  { name: 'maskable-512.png', size: 512, scale: 0.78 },
  { name: 'apple-touch-icon.png', size: 180, scale: 1 },
];

for (const t of tasks) {
  await sharp(Buffer.from(svg({ scale: t.scale })))
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(OUT, t.name));
  console.log('wrote', t.name);
}
