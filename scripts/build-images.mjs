// Converts the photos downloaded from the old site into web-sized WebP files.
// Dish photos carry a baked-in red "VABENE! пиццерия" strip at the bottom; it is cropped off.
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'src/assets');
const out = path.join(root, 'public/img');

const BANNER_TOP = 0.85; // the strip starts at ~86% of the frame height

async function dishes() {
  const dir = path.join(out, 'menu');
  await mkdir(dir, { recursive: true });
  const files = (await readdir(path.join(src, 'menu'))).filter((f) => f.endsWith('.jpg'));
  for (const f of files) {
    const input = sharp(path.join(src, 'menu', f));
    const { width, height } = await input.metadata();
    const keep = Math.floor(height * BANNER_TOP);
    const base = f.replace(/\.jpg$/, '');
    const cropped = input.extract({ left: 0, top: 0, width, height: keep });
    await cropped.clone().resize(720).webp({ quality: 74 }).toFile(path.join(dir, `${base}.webp`));
    await cropped.clone().resize(360).webp({ quality: 70 }).toFile(path.join(dir, `${base}-s.webp`));
  }
  console.log('dishes', files.length);
}

async function rooms() {
  const dir = path.join(out, 'room');
  await mkdir(dir, { recursive: true });
  // Only the photos the page shows; the rest of the archive stays in src/assets/interior.
  const keep = new Set(['presn_002', 'presn_005', 'presn_009', 'presn_011', 'presn_017', 'presn_019']);
  const files = (await readdir(path.join(src, 'interior'))).filter((f) => keep.has(f.replace(/\.jpg$/, '')));
  for (const f of files) {
    const base = f.replace(/\.jpg$/, '');
    const input = sharp(path.join(src, 'interior', f)).rotate();
    await input.clone().resize(1600, null, { withoutEnlargement: true }).webp({ quality: 76 }).toFile(path.join(dir, `${base}.webp`));
    await input.clone().resize(800).webp({ quality: 72 }).toFile(path.join(dir, `${base}-m.webp`));
  }
  console.log('rooms', files.length);
}

// Margherita frames from the image generator: src/assets/frames/*.png (or .jpg/.webp), in name order.
async function frames() {
  const dir = path.join(src, 'frames');
  const files = (await readdir(dir).catch(() => [])).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
  if (!files.length) return;
  await mkdir(path.join(out, 'frames'), { recursive: true });
  for (const [i, f] of files.entries()) {
    await sharp(path.join(dir, f)).resize(1024, 1024, { fit: 'cover' }).webp({ quality: 78 })
      .toFile(path.join(out, 'frames', `margherita-${String(i + 1).padStart(2, '0')}.webp`));
  }
  console.log('frames', files.length);
}

await Promise.all([dishes(), rooms(), frames()]);
