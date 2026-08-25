import sharp from "sharp";
import { writeFileSync } from "fs";

const svg = (size: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#10b981"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <!-- Tooth icon -->
  <path fill="#fff" d="M256 104c-58 0-86 22-118 22-26 0-44-14-66-14-16 0-28 12-28 36 0 50 24 86 36 138 8 34 14 74 32 74 18 0 22-32 30-66 8-34 18-56 38-56s30 22 38 56c8 34 12 66 30 66 18 0 24-40 32-74 12-52 36-88 36-138 0-24-12-36-28-36-22 0-40 14-66 14-32 0-60-22-118-22z" transform="translate(32 0) scale(0.92)"/>
  <circle cx="256" cy="256" r="0" fill="#0d9488"/>
</svg>`;

for (const size of [192, 512]) {
  const png = await sharp(Buffer.from(svg(size))).png().toBuffer();
  writeFileSync(`public/icon-${size}.png`, png);
  console.log("wrote icon-" + size + ".png");
}
