import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Resvg } from '@resvg/resvg-js';
import { palette } from '@scaleway-manager/ui/tokens';

import { featureGraphic, frameLayout, frameScreenshot } from './frame-screenshots';
import { SCREENSHOTS, STORE_SIZES } from './screenshots.config';

const sizes = Object.keys(STORE_SIZES) as (keyof typeof STORE_SIZES)[];

// What the simulators and the emulators capture (phone and 7" tablet), and a landscape one
const RAW_SHAPES = [
  { width: 1320, height: 2868 },
  { width: 2064, height: 2752 },
  { width: 1080, height: 2424 },
  { width: 1200, height: 1920 },
  { width: 2752, height: 2064 },
];

// The real size of a PNG, from its header
const pngSize = (png: Buffer) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });
// Its bit depth and colour type, from its header (2: RGB, no alpha)
const RGB = 2;
const pngColour = (png: Buffer) => ({ bitDepth: png[24], colourType: png[25] });

let dir = '';

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'screenshots-'));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

test("App Store's required iPhone set is the medium display, framed from the iPhone captures", () => {
  expect(STORE_SIZES.iphone63).toEqual({ width: 1206, height: 2622, raw: 'iphone69' });
  expect(STORE_SIZES.ipad13).toMatchObject({ width: 2064, height: 2752 });
});

test("Google Play's 7-inch tablet size is 9:16, with each side between 1080 and 3840px", () => {
  const { width, height } = STORE_SIZES.androidTablet7;

  expect(width * 16).toBe(height * 9);
  expect(width).toBeGreaterThanOrEqual(1080);
  expect(height).toBeLessThanOrEqual(3840);
});

test('framed screenshot has the store size', async () => {
  const raw = path.join(dir, 'raw.png');
  const flat = new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="2424"><rect width="1080" height="2424" fill="${palette.white}"/></svg>`,
  ).render();
  await writeFile(raw, flat.asPng());

  for (const size of sizes) {
    const framed = await frameScreenshot({ raw, caption: SCREENSHOTS[0]?.caption ?? '', size, theme: 'dark' });

    expect(pngSize(framed)).toEqual({ width: STORE_SIZES[size].width, height: STORE_SIZES[size].height });
    // Apple refuses screenshots with an alpha channel, and Google asks for none: 8-bit RGB only
    expect(pngColour(framed)).toEqual({ bitDepth: 8, colourType: RGB });
  }

  expect(pngColour(await featureGraphic())).toEqual({ bitDepth: 8, colourType: RGB });
});

test('the opaque PNG keeps every pixel', async () => {
  const raw = path.join(dir, 'raw-colours.png');
  const colours = new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="2424"><rect width="1080" height="2424" fill="${palette.white}"/><rect width="540" height="1212" fill="${palette.ink}"/></svg>`,
  ).render();
  await writeFile(raw, colours.asPng());

  const framed = await frameScreenshot({ raw, caption: SCREENSHOTS[0]?.caption ?? '', size: 'android', theme: 'dark' });
  // Read back through resvg: the same picture as an image element, so its pixels can be compared
  const reread = new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><image href="data:image/png;base64,${framed.toString('base64')}" width="1080" height="1920"/></svg>`,
  ).render();
  const { screenshot } = frameLayout('android', SCREENSHOTS[0]?.caption ?? '', { width: 1080, height: 2424 });
  const at = (x: number, y: number) => [...reread.pixels.subarray((y * 1080 + x) * 4, (y * 1080 + x) * 4 + 4)];

  // Top-left quarter of the screenshot is ink, the bottom-right is white, both fully opaque
  expect(at(Math.round(screenshot.x + screenshot.width * 0.2), Math.round(screenshot.y + screenshot.height * 0.2))).toEqual([
    0x14, 0x12, 0x1a, 255,
  ]);
  expect(at(Math.round(screenshot.x + screenshot.width * 0.8), Math.round(screenshot.y + screenshot.height * 0.8))).toEqual([
    255, 255, 255, 255,
  ]);
});

test('long captions wrap to two lines at most', () => {
  for (const size of sizes) {
    for (const { caption } of SCREENSHOTS) {
      const { lines } = frameLayout(size, caption, STORE_SIZES[size]);

      expect(lines.length).toBeGreaterThan(0);
      expect(lines.length).toBeLessThanOrEqual(2);
      // Every word is kept, in order
      expect(lines.join(' ')).toBe(caption);
    }
  }

  // Balanced lines, and a break after a comma when it's about as balanced
  expect(frameLayout('iphone69', 'See trouble before it grows', STORE_SIZES.iphone69).lines).toEqual([
    'See trouble',
    'before it grows',
  ]);
  expect(frameLayout('iphone69', 'Everything you run, one tap away', STORE_SIZES.iphone69).lines).toEqual([
    'Everything you run,',
    'one tap away',
  ]);

  // Too long for two lines: an error, never a cut caption
  const tooLong = 'Far too many words to fit on two lines of a store screenshot caption';

  expect(() => frameLayout('android', tooLong, STORE_SIZES.android)).toThrow(/two lines/);
});

test('the screenshot fits below the caption, keeps its shape and is never cropped', () => {
  for (const size of sizes) {
    for (const raw of RAW_SHAPES) {
      const { captionBottom, screenshot } = frameLayout(size, 'Know what you spend, month by month', raw);
      const canvas = STORE_SIZES[size];

      expect(screenshot.y).toBeGreaterThanOrEqual(captionBottom);
      expect(screenshot.x).toBeGreaterThanOrEqual(0);
      expect(screenshot.x + screenshot.width).toBeLessThanOrEqual(canvas.width);
      expect(screenshot.y + screenshot.height).toBeLessThanOrEqual(canvas.height);
      expect(screenshot.width / screenshot.height).toBeCloseTo(raw.width / raw.height, 6);
      // Rounded corners, 4% of its width
      expect(screenshot.radius).toBeCloseTo(0.04 * screenshot.width, 6);
    }
  }
});

test('feature graphic is 1024 by 500', async () => {
  expect(pngSize(await featureGraphic())).toEqual({ width: 1024, height: 500 });
});

test('the same input gives the same bytes', async () => {
  const raw = path.join(dir, 'same.png');
  const flat = new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="2424"><rect width="1080" height="2424" fill="${palette.white}"/></svg>`,
  ).render();
  await writeFile(raw, flat.asPng());

  const input = { raw, caption: SCREENSHOTS[0]?.caption ?? '', size: sizes[0] ?? 'iphone69', theme: 'dark' } as const;

  expect((await frameScreenshot(input)).equals(await frameScreenshot(input))).toBe(true);
  expect((await featureGraphic()).equals(await featureGraphic())).toBe(true);
});
