import { chartGeometry, monotoneLengths, monotonePath, monotonePieces } from './geometry';

const box = { width: 300, height: 100, padX: 10, padTop: 20, padBottom: 10 };
// Where the top and the bottom of the line's area are in that box
const TOP = 20;
const BOTTOM = 90;

type Point = { x: number; y: number };

// The pieces of a path written as `M x,y C x1,y1,x2,y2,x,y …`: each one is [start, control 1, control 2, end]
function curves(path: string): Point[][] {
  const numbers = (path.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g) ?? []).map(Number);
  const at = (index: number): Point => ({ x: numbers[index] ?? NaN, y: numbers[index + 1] ?? NaN });
  const pieces: Point[][] = [];

  for (let index = 2; index + 5 < numbers.length; index += 6) {
    pieces.push([at(index - 2), at(index), at(index + 2), at(index + 4)]);
  }

  return pieces;
}

describe('chartGeometry', () => {
  it('chartGeometry maps min to bottom and max to top', () => {
    const points = chartGeometry([120, 300, 60, 180], box);

    expect(points.map((point) => point.y)).toEqual([72.5, TOP, BOTTOM, 55]);

    // Evenly spaced, padX from both sides
    [10, 10 + 280 / 3, 10 + 560 / 3, 290].forEach((x, index) => {
      expect(points[index]?.x).toBeCloseTo(x, 9);
    });
  });

  it('chartGeometry puts equal values in the middle, and all zeros at the bottom', () => {
    expect(chartGeometry([40, 40, 40], box).map((point) => point.y)).toEqual([55, 55, 55]);
    expect(chartGeometry([0, 0, 0], box).map((point) => point.y)).toEqual([BOTTOM, BOTTOM, BOTTOM]);
  });

  it('chartGeometry handles one month, no month and negative values', () => {
    expect(chartGeometry([], box)).toEqual([]);
    expect(chartGeometry([42], box)).toEqual([{ x: 150, y: 55 }]);
    expect(chartGeometry([-20, 40], box).map((point) => point.y)).toEqual([BOTTOM, TOP]);
  });

  it('chartGeometry can place values on a fixed range (a percentage), clamped inside it', () => {
    const percent = { min: 0, max: 100 };

    // 100 at the top and 0 at the bottom, whatever the other values are; out of range stays inside
    expect(chartGeometry([0, 50, 100, 150, -5], box, null, percent).map((point) => point.y)).toEqual([
      BOTTOM,
      55,
      TOP,
      TOP,
      BOTTOM,
    ]);
    // Equal values keep their place on the range instead of moving to the middle
    expect(chartGeometry([92, 92], box, null, percent).map((point) => point.y)).toEqual([
      BOTTOM - 0.92 * (BOTTOM - TOP),
      BOTTOM - 0.92 * (BOTTOM - TOP),
    ]);
    expect(chartGeometry([42], box, null, percent)).toEqual([{ x: 150, y: BOTTOM - 0.42 * (BOTTOM - TOP) }]);
  });

  it('the projection above every month stays inside the chart', () => {
    // 2026-11-18: €149.29 by month end, above October's €141.20
    const points = chartGeometry([9980, 11860, 14120, 8460], box, 14929);
    const projection = points[4];

    expect(points).toHaveLength(5);
    // It sits on top, above the current (last) month
    expect(projection?.y).toBe(TOP);
    expect(projection?.x).toBeCloseTo(points[3]?.x ?? NaN, 9);

    for (const point of points) {
      expect(point.y).toBeGreaterThanOrEqual(TOP);
      expect(point.y).toBeLessThanOrEqual(BOTTOM);
    }
  });
});

describe('monotonePath', () => {
  it('monotonePath never overshoots', () => {
    // A tiny seeded generator, so the "random" data is the same on every run
    let state = 7;
    const random = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;

      return state / 4294967296;
    };
    const series: number[][] = [];

    for (let run = 0; run < 30; run += 1) {
      const count = 3 + Math.floor(random() * 10);
      let value = random() * 50;
      const rising: number[] = [];
      const zigzag: number[] = [];

      for (let index = 0; index < count; index += 1) {
        // Some steps are flat on purpose
        value += random() < 0.2 ? 0 : random() * 40;
        rising.push(value);
        zigzag.push(random() * 100);
      }

      series.push(rising, [...rising].reverse(), zigzag);
    }

    for (const values of series) {
      const points = chartGeometry(values, box);
      const pieces = curves(monotonePath(points));

      expect(pieces).toHaveLength(points.length - 1);

      pieces.forEach(([start, control1, control2, end], index) => {
        const low = Math.min(points[index]?.y ?? NaN, points[index + 1]?.y ?? NaN);
        const high = Math.max(points[index]?.y ?? NaN, points[index + 1]?.y ?? NaN);

        // 50 points along the piece (a cubic Bézier, t from 0 to 1)
        for (let step = 0; step <= 50; step += 1) {
          const t = step / 50;
          const u = 1 - t;
          const y =
            u ** 3 * (start?.y ?? NaN) +
            3 * u ** 2 * t * (control1?.y ?? NaN) +
            3 * u * t ** 2 * (control2?.y ?? NaN) +
            t ** 3 * (end?.y ?? NaN);

          expect(y).toBeGreaterThanOrEqual(low - 1e-9);
          expect(y).toBeLessThanOrEqual(high + 1e-9);
        }
      });
    }
  });

  it('monotonePath starts at the first point and ends at the last', () => {
    const points = [
      { x: 12, y: 40 },
      { x: 80, y: 10 },
      { x: 150, y: 60 },
      { x: 220, y: 20 },
    ];
    const path = monotonePath(points);
    const pieces = curves(path);

    expect(path.startsWith('M12,40')).toBe(true);
    expect(pieces[0]?.[0]).toEqual({ x: 12, y: 40 });
    expect(pieces.at(-1)?.[3]).toEqual({ x: 220, y: 20 });
    // Each piece ends where the next one starts
    expect(pieces.map((piece) => piece[3])).toEqual(points.slice(1));
    // Two points: a straight line
    expect(monotonePath(points.slice(0, 2))).toBe('M12,40L80,10');
  });
});

describe('monotonePieces', () => {
  it('monotonePieces are the pieces of monotonePath, one per gap, so any run of them is the same line', () => {
    const points = [
      { x: 12, y: 40 },
      { x: 80, y: 10 },
      { x: 150, y: 60 },
      { x: 220, y: 20 },
    ];
    const pieces = monotonePieces(points);

    expect(pieces).toHaveLength(3);
    expect(`M12,40${pieces.join('')}`).toBe(monotonePath(points));
    // The last piece alone, from the point before it, ends on the last point
    expect(pieces.at(-1)?.endsWith(',220,20')).toBe(true);
    // Two points: one straight piece; one or none: nothing
    expect(monotonePieces(points.slice(0, 2))).toEqual(['L80,10']);
    expect(monotonePieces(points.slice(0, 1))).toEqual([]);
    expect(monotonePieces([])).toEqual([]);
  });
});

describe('monotoneLengths', () => {
  it('monotoneLengths measures each piece of the line', () => {
    // On a straight line, each piece is exactly as long as the distance between its points
    const straight = [0, 1, 2, 3].map((index) => ({ x: index * 10, y: index * 5 }));

    for (const length of monotoneLengths(straight)) {
      expect(length).toBeCloseTo(Math.hypot(10, 5), 6);
    }

    // A curve is longer than the straight distance, and shorter than going across then up
    const points = chartGeometry([30, 90, 10, 60, 60, 20], box);
    const lengths = monotoneLengths(points);

    expect(lengths).toHaveLength(5);

    lengths.forEach((length, index) => {
      const dx = (points[index + 1]?.x ?? NaN) - (points[index]?.x ?? NaN);
      const dy = Math.abs((points[index + 1]?.y ?? NaN) - (points[index]?.y ?? NaN));

      expect(length).toBeGreaterThanOrEqual(Math.hypot(dx, dy) - 1e-9);
      expect(length).toBeLessThanOrEqual(dx + dy);
    });
  });
});
