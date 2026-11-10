import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

import { generateIcons } from './generate-icons';

const size = 1024;

let dir = '';
let icons: Awaited<ReturnType<typeof generateIcons>> = [];

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'icons-'));
  icons = await generateIcons(dir);
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

// Decodes an 8-bit RGB or RGBA PNG (no interlace), so the tests see the real pixels
async function readPng(name: string) {
  const data = await readFile(path.join(dir, name));
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const channels = data.readUInt8(25) === 6 ? 4 : 3;
  const chunks: Buffer[] = [];
  for (let at = 8; at < data.length; at += data.readUInt32BE(at) + 12) {
    if (data.toString('ascii', at + 4, at + 8) === 'IDAT') {
      chunks.push(data.subarray(at + 8, at + 8 + data.readUInt32BE(at)));
    }
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw.readUInt8(y * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels.readUInt8(y * stride + x - channels) : 0;
      const up = y > 0 ? pixels.readUInt8((y - 1) * stride + x) : 0;
      const upLeft = x >= channels && y > 0 ? pixels.readUInt8((y - 1) * stride + x - channels) : 0;
      // PNG filters 1-4: Sub, Up, Average, Paeth
      const p = left + up - upLeft;
      const paeth =
        Math.abs(p - left) <= Math.abs(p - up) && Math.abs(p - left) <= Math.abs(p - upLeft)
          ? left
          : Math.abs(p - up) <= Math.abs(p - upLeft)
            ? up
            : upLeft;
      const guess = [0, left, up, Math.floor((left + up) / 2), paeth][filter] ?? 0;
      pixels[y * stride + x] = (raw.readUInt8(y * (stride + 1) + 1 + x) + guess) & 0xff;
    }
  }

  return { width, height, channels, pixels };
}

// How many pixels let the background show through (none in an RGB PNG)
function seeThrough({ channels, pixels }: Awaited<ReturnType<typeof readPng>>) {
  let count = 0;
  for (let at = 3; channels === 4 && at < pixels.length; at += 4) {
    count += pixels.readUInt8(at) < 255 ? 1 : 0;
  }

  return count;
}

test('generates six 1024 icons', async () => {
  expect(icons.map((icon) => path.basename(icon.file)).sort()).toEqual([
    'adaptive-background.png',
    'adaptive-foreground.png',
    'adaptive-monochrome.png',
    'icon-dark.png',
    'icon-tinted.png',
    'icon.png',
  ]);
  for (const icon of icons) {
    // The PNG header holds the real size
    const data = await readFile(icon.file);

    expect([icon.width, icon.height]).toEqual([size, size]);
    expect([data.readUInt32BE(16), data.readUInt32BE(20)]).toEqual([size, size]);
  }
});

test('main icon has no transparency', async () => {
  expect(seeThrough(await readPng('icon.png'))).toBe(0);
});

test('tinted icon has no transparency, because Expo flattens it onto white', async () => {
  expect(seeThrough(await readPng('icon-tinted.png'))).toBe(0);
});

// The box around a PNG's logo pixels, and how far the farthest one is from the centre
function logoBox({ pixels }: { pixels: Buffer }, isLogo: (at: number) => boolean) {
  const box = { left: size, top: size, right: 0, bottom: 0, farthest: 0 };

  for (let at = 0; at < pixels.length; at += 4) {
    if (isLogo(at)) {
      const x = (at / 4) % size;
      const y = Math.floor(at / 4 / size);

      box.left = Math.min(box.left, x);
      box.top = Math.min(box.top, y);
      box.right = Math.max(box.right, x + 1);
      box.bottom = Math.max(box.bottom, y + 1);
      box.farthest = Math.max(box.farthest, Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2));
    }
  }

  return box;
}

test('the iOS icons show the logo 70% of the icon tall, centred', async () => {
  for (const file of ['icon.png', 'icon-tinted.png']) {
    const image = await readPng(file);
    // The logo is the white part
    const box = logoBox(image, (at) => image.pixels.readUInt8(at) > 230 && image.pixels.readUInt8(at + 2) > 230);

    expect(Math.abs(box.bottom - box.top - 0.7 * size)).toBeLessThan(6);
    expect(Math.abs(box.top - (size - box.bottom))).toBeLessThan(6);
  }
});

test('adaptive foreground keeps the logo inside the safe circle', async () => {
  const image = await readPng('adaptive-foreground.png');
  const box = logoBox(image, (at) => image.pixels.readUInt8(at + 3) > 0);

  // The logo is there, 48% of the canvas tall
  expect(Math.abs(box.bottom - box.top - 0.48 * size)).toBeLessThan(4);
  // Android masks the icon to a shape that always keeps a centred circle 66% wide
  expect(box.farthest).toBeLessThanOrEqual((33 / 108) * size);
});
