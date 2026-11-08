// Draws the app icons from the logo and the colour tokens: pnpm --filter @scaleway-manager/mobile icons
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Resvg } from '@resvg/resvg-js';
import { lightColors, palette } from '@scaleway-manager/ui/tokens';

const size = 1024;
const logoFile = path.join(__dirname, '../../../packages/ui/assets/logo-white.svg');

export async function generateIcons(outDir: string): Promise<{ file: string; width: number; height: number }[]> {
  const svg = await readFile(logoFile, 'utf8');
  const [x, y, width, height] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '').split(/\s+/).map(Number);
  // The logo's own paths, without their fill: each icon picks its colour
  const paths = [...svg.matchAll(/<path\b([^>]*)\/>/g)]
    .map(([, attributes = '']) => {
      const d = attributes.match(/\sd="([^"]+)"/)?.[1];
      const evenOdd = attributes.includes('fill-rule="evenodd"');

      return d ? `<path d="${d}"${evenOdd ? ' fill-rule="evenodd"' : ''}/>` : '';
    })
    .join('');
  if (!paths || !width || !height) {
    throw new Error(`No logo found in ${logoFile}`);
  }

  // The logo centred, `share` of the canvas tall
  const logo = (share: number, fill: string) => {
    const scale = (share * size) / height;
    const left = (size - width * scale) / 2 - (x ?? 0) * scale;
    const top = (size - height * scale) / 2 - (y ?? 0) * scale;

    return `<g fill="${fill}" transform="translate(${left} ${top}) scale(${scale})">${paths}</g>`;
  };

  // The header's gradient: 165deg, as in HeaderBackground (start 0.37,0, end 0.63,1)
  const stops = lightColors.headerGradient
    .map((colour, index, all) => `<stop offset="${index / (all.length - 1)}" stop-color="${colour}"/>`)
    .join('');
  const gradient = `<defs><linearGradient id="header" x1="0.37" y1="0" x2="0.63" y2="1">${stops}</linearGradient></defs><rect width="${size}" height="${size}" fill="url(#header)"/>`;

  // How tall the logo is: 70% of an iOS icon; 48% of an Android one keeps it inside the 66% safe circle
  const ios = 0.7;
  const android = 0.48;
  const icons = {
    // No transparency: Apple rejects alpha on the main icon
    'icon.png': gradient + logo(ios, palette.white),
    // Apple draws its own dark backdrop behind it
    'icon-dark.png': logo(ios, lightColors.tabActiveBackground),
    // Opaque: Expo flattens the tinted icon onto white, which would hide a white logo
    'icon-tinted.png': `<rect width="${size}" height="${size}" fill="${palette.ink}"/>` + logo(ios, palette.white),
    'adaptive-foreground.png': logo(android, palette.white),
    'adaptive-background.png': gradient,
    // Android 13 themed icons use only its shape
    'adaptive-monochrome.png': logo(android, palette.white),
  };

  await mkdir(outDir, { recursive: true });

  return Promise.all(
    Object.entries(icons).map(async ([name, content]) => {
      const image = new Resvg(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${content}</svg>`,
        { font: { loadSystemFonts: false } },
      ).render();
      const file = path.join(outDir, name);
      await writeFile(file, image.asPng());

      return { file, width: image.width, height: image.height };
    }),
  );
}

if (require.main === module) {
  generateIcons(path.join(__dirname, '../assets/icon')).then(
    (icons) => icons.forEach(({ file, width, height }) => console.log(`${path.relative(process.cwd(), file)} ${width}x${height}`)),
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
