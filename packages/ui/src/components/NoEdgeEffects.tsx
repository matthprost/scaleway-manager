import type { ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, View } from 'react-native';
import { ScrollViewMarker } from 'react-native-screens/experimental';

type NoEdgeEffectsProps = {
  // One scrolling view (ScrollView or FlatList)
  children: ReactElement;
  style?: StyleProp<ViewStyle>;
};

// iOS 26 and later draw their own band, line or fade at the edges of a scrolling view; iOS 27 shows a hard band
// under the status bar and lines along the sides. The app draws its own headers and bars, so every scrolling view
// turns all four off.
const HIDDEN = { top: 'hidden', bottom: 'hidden', left: 'hidden', right: 'hidden' } as const;

export function NoEdgeEffects({ children, style }: NoEdgeEffectsProps) {
  // Android has no edge effects, and its marker only accepts a plain vertical ScrollView as its child (a carousel or
  // pull-to-refresh would crash it): a plain view keeps the same layout
  if (Platform.OS !== 'ios') {
    return <View style={style}>{children}</View>;
  }

  return (
    <ScrollViewMarker scrollEdgeEffects={HIDDEN} style={style}>
      {children}
    </ScrollViewMarker>
  );
}
