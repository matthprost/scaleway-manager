import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lineChartHeight } from '../charts/LineChart';
import { pickerChipHeight } from '../components/PickerChip';
import { segmentedControlHeight } from '../components/SegmentedControl';
import { spendingSummaryHeight } from '../components/SpendingSummary';
import { radii, spacing } from '../tokens';

// How tall Home's header is online at the phone's text size (its floor): under the status bar, the chip and
// 6M/12M row, 12, the spending summary, 16, the chart, then room for the card that overlaps it. Offline it grows by the
// notice's room (HeaderBackground noticeShown).
export function homeHeaderLayout(insetTop: number, fontScale: number): { height: number } {
  const controls = Math.max(pickerChipHeight(fontScale), segmentedControlHeight(fontScale));
  // Under the chart: the 28 pt the card overlaps, and the usual 16 pt above it (HeaderBackground overlapped)
  const bottom = radii.xl + spacing.md;

  return {
    height:
      insetTop +
      controls +
      spacing.sm +
      spendingSummaryHeight(fontScale) +
      spacing.md +
      lineChartHeight('header', fontScale) +
      bottom,
  };
}

// Home's header on this phone (its status bar and text size): for Home, and the splash's first guess.
export function useHomeHeaderLayout(): { height: number } {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();

  return homeHeaderLayout(insets.top, fontScale);
}
