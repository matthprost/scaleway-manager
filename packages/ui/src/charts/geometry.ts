// The chart's maths: where each value goes, and the smooth line through the points.

type Point = { x: number; y: number };

// The drawing area, in points. The line stays inside the paddings.
type ChartBox = { width: number; height: number; padX: number; padTop: number; padBottom: number };

// One piece of the line: a cubic Bézier from `start` to `end`
type Curve = { start: Point; control1: Point; control2: Point; end: Point };

// Places the values left to right, evenly spaced: the smallest at the bottom, the largest at the top.
// All equal: zeros sit at the bottom, anything else in the middle. A projection is scaled with the
// values (so it stays inside) and comes back as one more point, at the last value's x.
// A fixed `range` (0 to 100 for a percentage) puts its ends at the bottom and the top instead; values
// outside it stay inside the box.
export function chartGeometry(
  values: readonly number[],
  box: ChartBox,
  projection: number | null = null,
  range: { min: number; max: number } | null = null,
): Point[] {
  if (values.length === 0) {
    return [];
  }

  const { width, height, padX, padTop, padBottom } = box;
  const bottom = height - padBottom;
  const scaled = projection === null ? values : [...values, projection];
  const min = range?.min ?? Math.min(...scaled);
  const max = range?.max ?? Math.max(...scaled);
  const flat = max === 0 ? bottom : (padTop + bottom) / 2;
  const yOf = (value: number) =>
    max === min
      ? flat
      : bottom - ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * (bottom - padTop);
  const xOf = (index: number) =>
    values.length === 1 ? width / 2 : padX + (index / (values.length - 1)) * (width - 2 * padX);
  const points = values.map((value, index) => ({ x: xOf(index), y: yOf(value) }));

  return projection === null ? points : [...points, { x: xOf(values.length - 1), y: yOf(projection) }];
}

// d3's curveMonotoneX (Steffen's slopes): each piece stays between its two points, never above or below.
function monotoneCurves(points: Point[]): Curve[] {
  const slopes = points.slice(1).map((point, index) => {
    const previous = points[index] ?? point;

    return (point.y - previous.y) / (point.x - previous.x);
  });
  // The tangent at each inner point; 0 where the line turns (a peak or a dip)
  const inner = slopes.slice(1).map((after, index) => {
    const before = slopes[index] ?? after;
    const left = (points[index + 1]?.x ?? 0) - (points[index]?.x ?? 0);
    const right = (points[index + 2]?.x ?? 0) - (points[index + 1]?.x ?? 0);
    const blended = (before * right + after * left) / (left + right);

    return (
      (Math.sign(before) + Math.sign(after)) * Math.min(Math.abs(before), Math.abs(after), 0.5 * Math.abs(blended)) ||
      0
    );
  });
  const first = slopes[0] ?? 0;
  const last = slopes.at(-1) ?? 0;
  // The two ends lean on their only neighbour
  const tangents = [(3 * first - (inner[0] ?? first)) / 2, ...inner, (3 * last - (inner.at(-1) ?? last)) / 2];

  return points.slice(1).map((end, index) => {
    const start = points[index] ?? end;
    const third = (end.x - start.x) / 3;
    const startTangent = tangents[index] ?? 0;
    const endTangent = tangents[index + 1] ?? 0;

    return {
      start,
      control1: { x: start.x + third, y: start.y + third * startTangent },
      control2: { x: end.x - third, y: end.y - third * endTangent },
      end,
    };
  });
}

// The pieces of monotonePath's line, one per gap between two points, without the starting move.
// Each piece starts where the one before ends, so any run of them is the same line.
export function monotonePieces(points: Point[]): string[] {
  const [, second] = points;

  if (second === undefined) {
    return [];
  }

  if (points.length === 2) {
    return [`L${second.x},${second.y}`];
  }

  return monotoneCurves(points).map(
    ({ control1, control2, end }) => `C${control1.x},${control1.y},${control2.x},${control2.y},${end.x},${end.y}`,
  );
}

// An SVG path through the points (Fritsch–Carlson monotone cubic, as d3's curveMonotoneX).
// Two points make a straight line.
export function monotonePath(points: Point[]): string {
  const [start] = points;

  if (start === undefined) {
    return '';
  }

  return `M${start.x},${start.y}${monotonePieces(points).join('')}`;
}

// How long each piece of monotonePath's line is, in order (the chart draws its line over that length).
export function monotoneLengths(points: Point[]): number[] {
  const [start, second] = points;

  if (start === undefined || second === undefined) {
    return [];
  }

  if (points.length === 2) {
    return [Math.hypot(second.x - start.x, second.y - start.y)];
  }

  // Measured along 64 short straight steps per piece
  const steps = 64;

  return monotoneCurves(points).map(({ start: from, control1, control2, end }) => {
    let length = 0;
    let previous = from;

    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const u = 1 - t;
      const at = (a: number, b: number, c: number, d: number) =>
        u ** 3 * a + 3 * u ** 2 * t * b + 3 * u * t ** 2 * c + t ** 3 * d;
      const point = { x: at(from.x, control1.x, control2.x, end.x), y: at(from.y, control1.y, control2.y, end.y) };

      length += Math.hypot(point.x - previous.x, point.y - previous.y);
      previous = point;
    }

    return length;
  });
}
