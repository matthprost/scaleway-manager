import { lineChartHeight } from '../charts/LineChart';
import { pickerChipHeight } from '../components/PickerChip';
import { segmentedControlHeight } from '../components/SegmentedControl';
import { spendingSummaryHeight } from '../components/SpendingSummary';
import { homeHeaderLayout } from './homeHeaderLayout';

describe('homeHeaderLayout', () => {
  it('online, at the default text size: the mockup header, with no room kept for the offline pill', () => {
    // Under the 47 pt status bar: the 44 pt chip and 6M/12M row, 12, the label (18), the amount (40), the organization
    // line (14), 16, the chart (120), then 28 under the overlapping card and 16 above it
    expect(homeHeaderLayout(47, 1)).toEqual({ height: 47 + 44 + 12 + 18 + 40 + 14 + 16 + 120 + 28 + 16 });
  });

  it('a taller status bar moves everything down by the same amount', () => {
    expect(homeHeaderLayout(59, 1).height - homeHeaderLayout(47, 1).height).toBe(12);
  });

  it("adds up its parts' own heights, so it follows them when they change", () => {
    for (const scale of [1, 1.3, 2, 3.5]) {
      expect(homeHeaderLayout(47, scale).height).toBeCloseTo(
        47 +
          Math.max(pickerChipHeight(scale), segmentedControlHeight(scale)) +
          12 +
          spendingSummaryHeight(scale) +
          16 +
          lineChartHeight('header', scale) +
          28 +
          16,
        5,
      );
    }
  });

  it('grows line by line with the text size', () => {
    const scale = 1.3;

    // The chip's subhead line (18) plus 24 makes the row; the chart's two caption lines grow, its line area doesn't
    expect(homeHeaderLayout(47, scale).height).toBeCloseTo(
      47 + (24 + 18 * scale) + 12 + (18 + 40 + 14) * scale + 16 + (88 + 2 * 14 * scale + 4) + 28 + 16,
      5,
    );
  });

  it('counts the comparison under the amount at accessibility text sizes', () => {
    const scale = 2;

    expect(homeHeaderLayout(47, scale).height).toBe(
      47 + (24 + 18 * scale) + 12 + (18 + 40 + 14 + 22 + 14) * scale + 16 + (88 + 2 * 14 * scale + 4) + 28 + 16,
    );
  });
});
