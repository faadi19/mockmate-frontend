import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Jimp from "jimp";

const __dirname = dirname(fileURLToPath(import.meta.url));

const srcPath = resolve(__dirname, "../src/assets/mmLogo1.png");
const outPath = resolve(__dirname, "../src/assets/mmLogo1-transparent.png");

const img = await Jimp.read(srcPath);
img.rgba(true);

// Remove near-white pixels (background + fill) -> transparent
const threshold = 248; // keep anti-aliased edges; only remove very-white pixels
img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (_x, _y, idx) {
  const r = this.bitmap.data[idx + 0];
  const g = this.bitmap.data[idx + 1];
  const b = this.bitmap.data[idx + 2];
  const a = this.bitmap.data[idx + 3];

  if (a === 0) return;

  if (r >= threshold && g >= threshold && b >= threshold) {
    this.bitmap.data[idx + 3] = 0;
  }
});

// Slightly trim extra border if present (safe)
img.autocrop({ tolerance: 0.01 });

await img.writeAsync(outPath);
console.log(`✅ Wrote transparent logo: ${outPath}`);


