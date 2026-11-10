// WCAG 2.x contrast maths. Colours are `#RRGGBB` or `rgba(r,g,b,a)`.

type Rgba = { r: number; g: number; b: number; a: number };

function parse(color: string): Rgba {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const value = parseInt(color.slice(1), 16);

    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255, a: 1 };
  }

  if (/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i.test(color)) {
    const [r = 0, g = 0, b = 0, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);

    return { r, g, b, a };
  }

  throw new Error(`Unsupported colour: ${color}`);
}

// Lays a colour (maybe see-through) over an opaque background; returns `#RRGGBB`.
export function compositeOver(color: string, background: string): string {
  const top = parse(color);
  const bottom = parse(background);

  if (bottom.a !== 1) {
    throw new Error(`The background must be opaque: ${background}`);
  }

  const mix = (front: number, back: number) => Math.round(top.a * front + (1 - top.a) * back);
  const channels = [mix(top.r, bottom.r), mix(top.g, bottom.g), mix(top.b, bottom.b)];

  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function luminance(color: string): number {
  const { r, g, b } = parse(color);
  const linear = (value: number) => {
    const channel = value / 255;

    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

// From 1 (no contrast) to 21 (black on white). An rgba foreground is laid over the background first.
export function contrastRatio(foreground: string, background: string): number {
  const front = luminance(compositeOver(foreground, background));
  const back = luminance(background);

  return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05);
}
