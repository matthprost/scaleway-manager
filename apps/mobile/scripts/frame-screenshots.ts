// Frames the raw store screenshots and draws the Play feature graphic: pnpm --filter @scaleway-manager/mobile screenshots:frame
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

import { Resvg } from '@resvg/resvg-js';
import { darkColors, lightColors, palette, typography } from '@scaleway-manager/ui/tokens';

import { SCREENSHOTS, STORE_SIZES } from './screenshots.config';

type Theme = 'light' | 'dark';

const storeDir = path.join(__dirname, '../store');
const logoFile = path.join(__dirname, '../../../packages/ui/assets/logo-white.svg');

// Helvetica Neue is on every Mac; resvg can't draw the bold of the system's variable SF font
const font = `font-family="Helvetica Neue, Arial, sans-serif" fill="${palette.white}"`;

// A bold sans letter is about half its size wide: 0.55 keeps the guess on the safe side
const LETTER_WIDTH = 0.55;

// The header's gradient at 165deg, as in HeaderBackground (start 0.37,0, end 0.63,1)
const background = (theme: Theme, width: number, height: number) => {
  const stops = (theme === 'dark' ? darkColors : lightColors).headerGradient
    .map((colour, index, all) => `<stop offset="${index / (all.length - 1)}" stop-color="${colour}"/>`)
    .join('');

  return `<defs><linearGradient id="header" x1="0.37" y1="0" x2="0.63" y2="1">${stops}</linearGradient></defs><rect width="${width}" height="${height}" fill="url(#header)"/>`;
};

// One PNG chunk: its length, type, data and checksum
const chunk = (type: string, data: Buffer) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);

  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, checksum]);
};

// Apple refuses screenshots with an alpha channel and Google asks for none, so the PNG is 8-bit RGB.
// Every canvas starts with the opaque gradient, so dropping alpha changes no pixel.
const toPng = (width: number, height: number, content: string) => {
  const { pixels } = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${content}</svg>`, {
    font: { loadSystemFonts: true, defaultFontFamily: 'Helvetica Neue' },
  }).render();
  // Each row: a 0 (no filter), then red, green and blue for each pixel
  const rows = Buffer.alloc((width * 3 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * 4;
      const to = y * (width * 3 + 1) + 1 + x * 3;

      rows[to] = pixels[from] ?? 0;
      rows[to + 1] = pixels[from + 1] ?? 0;
      rows[to + 2] = pixels[from + 2] ?? 0;
    }
  }

  const header = Buffer.alloc(13);

  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  // 8 bits per channel, colour type 2 (RGB); compression, filter and interlace stay 0
  header[8] = 8;
  header[9] = 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// Where the caption and the screenshot go on a store-sized canvas. The caption always gets two lines of room, so
// every screenshot of a set sits at the same height; the raw one is scaled to fit below it, whole and undistorted.
export function frameLayout(size: keyof typeof STORE_SIZES, caption: string, raw: { width: number; height: number }) {
  const { width, height } = STORE_SIZES[size];
  const fontSize = 0.06 * width;
  const lineHeight = 1.18 * fontSize;
  const captionTop = 0.08 * width;
  const captionBottom = captionTop + 2 * lineHeight;
  const maxLetters = Math.floor((0.88 * width) / (LETTER_WIDTH * fontSize));

  // One line if it fits, else the split between words that makes the longer line shortest. A break after a comma
  // reads better, so it counts 3 letters shorter
  const words = caption.split(' ');
  const best = words
    .slice(1)
    .map((_, at) => {
      const first = words.slice(0, at + 1).join(' ');
      const second = words.slice(at + 1).join(' ');

      return { lines: [first, second], score: Math.max(first.length, second.length) - (first.endsWith(',') ? 3 : 0) };
    })
    .sort((a, b) => a.score - b.score)[0];
  const lines = caption.length <= maxLetters ? [caption] : (best?.lines ?? []);
  if (lines.length === 0 || lines.some((line) => line.length > maxLetters)) {
    throw new Error(`"${caption}" doesn't fit on two lines of ${maxLetters} letters`);
  }

  const top = captionBottom + 0.05 * width;
  const room = { width: 0.88 * width, height: height - top - 0.05 * width };
  const scale = Math.min(room.width / raw.width, room.height / raw.height);
  const shown = { width: raw.width * scale, height: raw.height * scale };

  return {
    lines,
    fontSize,
    lineHeight,
    captionTop,
    captionBottom,
    screenshot: {
      ...shown,
      x: (width - shown.width) / 2,
      y: top + (room.height - shown.height) / 2,
      radius: 0.04 * shown.width,
    },
  };
}

export async function frameScreenshot(input: {
  raw: string;
  caption: string;
  size: keyof typeof STORE_SIZES;
  theme: Theme;
}): Promise<Buffer> {
  const png = await readFile(input.raw);
  if (png.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`${input.raw} is not a PNG`);
  }
  const { width, height } = STORE_SIZES[input.size];
  const { lines, fontSize, lineHeight, captionTop, screenshot } = frameLayout(input.size, input.caption, {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  });
  const { x, y, width: shownWidth, height: shownHeight, radius } = screenshot;
  // A single line sits in the middle of the two lines' room; each line's capitals are centred on it
  const firstLine = captionTop + ((2 - lines.length) * lineHeight) / 2 + (lineHeight + 0.72 * fontSize) / 2;
  // As tight as the app's titles
  const letterSpacing = (fontSize * typography.title.letterSpacing) / typography.title.fontSize;
  const text = lines
    .map(
      (line, index) =>
        `<text x="${width / 2}" y="${firstLine + index * lineHeight}" text-anchor="middle" font-weight="700" ` +
        `font-size="${fontSize}" letter-spacing="${letterSpacing}" ${font}>` +
        `${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`,
    )
    .join('');
  const frame = `<rect x="${x}" y="${y}" width="${shownWidth}" height="${shownHeight}" rx="${radius}"`;
  // A soft shadow under the screenshot, from a rounded shape of its size
  const shadow =
    `<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feDropShadow dx="0" dy="${0.012 * shownWidth}" stdDeviation="${0.03 * shownWidth}" flood-color="${palette.ink}" flood-opacity="0.45"/>` +
    `</filter>${frame} fill="${palette.ink}" filter="url(#shadow)"/>`;

  return toPng(
    width,
    height,
    background(input.theme, width, height) +
      text +
      shadow +
      `<clipPath id="corners">${frame}/></clipPath>` +
      `<image href="data:image/png;base64,${png.toString('base64')}" x="${x}" y="${y}" width="${shownWidth}" ` +
      `height="${shownHeight}" preserveAspectRatio="none" clip-path="url(#corners)"/>`,
  );
}

// Google Play's 1024 x 500 banner: the white logo on the left, the name and the tagline on the right
export async function featureGraphic(): Promise<Buffer> {
  const width = 1024;
  const height = 500;
  const logo = await readFile(logoFile);
  const [, , logoWidth = 1, logoHeight = 1] = (logo.toString('utf8').match(/viewBox="([^"]+)"/)?.[1] ?? '')
    .split(/\s+/)
    .map(Number);
  const shownHeight = 0.42 * height;
  const shownWidth = (shownHeight * logoWidth) / logoHeight;
  const left = 120;
  const textLeft = left + shownWidth + 56;

  return toPng(
    width,
    height,
    background('light', width, height) +
      `<image href="data:image/svg+xml;base64,${logo.toString('base64')}" x="${left}" y="${(height - shownHeight) / 2}" width="${shownWidth}" height="${shownHeight}"/>` +
      `<text x="${textLeft}" y="${height / 2 - 6}" font-weight="700" font-size="64" letter-spacing="-1" ${font}>Scaleway Manager</text>` +
      `<text x="${textLeft}" y="${height / 2 + 50}" font-weight="400" font-size="32" ${font}>Your Scaleway cloud, on the go</text>`,
  );
}

if (require.main === module) {
  (async () => {
    const missing: string[] = [];
    for (const size of Object.keys(STORE_SIZES) as (keyof typeof STORE_SIZES)[]) {
      await mkdir(path.join(storeDir, 'framed', size), { recursive: true });
      for (const [index, { id, caption, theme }] of SCREENSHOTS.entries()) {
        const raw = path.join(storeDir, 'raw', STORE_SIZES[size].raw, `${id}.png`);
        const out = path.join(storeDir, 'framed', size, `${index + 1}-${id}.png`);
        const found = await access(raw).then(
          () => true,
          () => false,
        );
        if (!found) {
          missing.push(path.relative(process.cwd(), raw));
          continue;
        }
        await writeFile(out, await frameScreenshot({ raw, caption, size, theme }));
        console.log(path.relative(process.cwd(), out));
      }
    }
    const graphic = path.join(storeDir, 'framed', 'feature-graphic.png');
    await writeFile(graphic, await featureGraphic());
    console.log(path.relative(process.cwd(), graphic));
    if (missing.length > 0) {
      throw new Error(`Missing raw screenshots:\n${missing.join('\n')}`);
    }
  })().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
