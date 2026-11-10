import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FlatList, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { noticeLayout } from '../layout/noticeLayout';
import { tabBarLayout } from '../layout/tabBarLayout';
import { useTheme } from '../theme';
import { SectionTitle } from './Section';
import { NoEdgeEffects } from './NoEdgeEffects';

// A HeaderBackground at the top of a Screen tells it where its bottom edge is
export const HeaderLayoutContext = createContext<((bottom: number) => void) | null>(null);

// A list that can grow long, last on the screen: drawn like a Section of rows, and only the rows near the screen are
// drawn (the screen scrolls as a FlatList)
export type ScreenRows<Row> = {
  // Above the rows, like a Section's title ("Production")
  title?: string;
  data: readonly Row[];
  // A stable key per row (the resource's key)
  rowKey: (row: Row) => string;
  // One row: a ListRow
  renderRow: (row: Row) => ReactNode;
};

type ScreenProps<Row> = {
  // With rows: what comes above them
  children: ReactNode;
  scroll?: boolean;
  withTabBar?: boolean;
  // 'belowNotice' also leaves room for the offline pill, always, so nothing moves when it shows
  topInset?: 'safe' | 'belowNotice' | 'none';
  // Without the tab bar only: 'none' lets a full-height header reach the very bottom
  bottomInset?: 'safe' | 'none';
  padded?: boolean;
  // Pull to refresh (scrolling screens): onRefresh is called; the spinner shows while refreshing is true
  onRefresh?: () => void;
  refreshing?: boolean;
  // With a HeaderBackground first, under the status bar (topInset 'none'): true while its purple is under the
  // status bar, false once scrolled past it. Called when it changes, so the status bar can follow.
  onHeaderUnderStatusBar?: (under: boolean) => void;
  // With a HeaderBackground first: its real height, each time it changes (the splash lands on Home's)
  onHeaderHeight?: (height: number) => void;
  // A long list after the content (a product's resources, a cluster's nodes)
  rows?: ScreenRows<Row>;
};

export function Screen<Row>({
  children,
  scroll = true,
  withTabBar = true,
  topInset = 'safe',
  bottomInset = 'safe',
  padded = true,
  onRefresh,
  refreshing = false,
  onHeaderUnderStatusBar,
  onHeaderHeight,
  rows,
}: ScreenProps<Row>) {
  const { colors, radii, sizes, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale, height } = useWindowDimensions();
  const scrollY = useRef(0);
  const headerBottom = useRef<number | null>(null);
  // How tall the header really is (it grows with its content), so the purple above it continues its gradient
  const [headerHeight, setHeaderHeight] = useState(height);
  const lastReport = useRef<boolean | null>(null);
  const reportRef = useRef(onHeaderUnderStatusBar);
  const heightRef = useRef(onHeaderHeight);
  const paddingTop = {
    safe: insets.top,
    belowNotice: noticeLayout(insets.top, fontScale).clearance,
    // Lets a header start under the status bar
    none: 0,
  }[topInset];
  const paddingBottom = withTabBar ? tabBarLayout(insets.bottom).clearance : bottomInset === 'safe' ? insets.bottom : 0;
  // Padded content is centred on wide screens; full-bleed content reaches the edges
  const column = {
    width: '100%' as const,
    maxWidth: padded ? sizes.contentMaxWidth : undefined,
    alignSelf: 'center' as const,
    paddingHorizontal: padded ? spacing.md : 0,
  };

  useEffect(() => {
    reportRef.current = onHeaderUnderStatusBar;
    heightRef.current = onHeaderHeight;
  }, [onHeaderUnderStatusBar, onHeaderHeight]);

  const reportHeader = useCallback(() => {
    const report = reportRef.current;

    if (!report || headerBottom.current === null) {
      return;
    }

    // Switches when the header's bottom edge passes the middle of the status bar, where its icons are
    const under = scrollY.current < headerBottom.current - insets.top / 2;

    if (under !== lastReport.current) {
      lastReport.current = under;
      report(under);
    }
  }, [insets.top]);

  const onHeaderLayout = useCallback(
    (bottom: number) => {
      // It starts at the top, so its bottom edge is its height
      if (bottom !== headerBottom.current) {
        heightRef.current?.(bottom);
      }
      headerBottom.current = bottom;
      setHeaderHeight(bottom);
      reportHeader();
    },
    [reportHeader],
  );

  const content = (
    <HeaderLayoutContext.Provider value={topInset === 'none' ? onHeaderLayout : null}>
      {children}
    </HeaderLayoutContext.Provider>
  );
  const onScroll = onHeaderUnderStatusBar
    ? (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
        reportHeader();
      }
    : undefined;
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      // iOS: white on the purple header, brand on the page
      tintColor={topInset === 'none' ? colors.onBrand : colors.brand}
      // Android: a brand arrow on a small disc
      colors={[colors.brand]}
      progressBackgroundColor={colors.surface}
      // Both platforms start it below the status bar and, where it floats, the offline pill
      progressViewOffset={topInset === 'none' ? noticeLayout(insets.top, fontScale).clearance : paddingTop}
    />
  ) : undefined;
  // With a header at the top, purple above it: pulling the screen down (iOS) never shows the page there
  const overscroll =
    topInset === 'none' ? (
      <LinearGradient
        testID="screen-overscroll"
        pointerEvents="none"
        colors={colors.headerGradient as [string, string, ...string[]]}
        // Continues the header's gradient upwards (same colours, same slant), so no colour edge shows
        start={{ x: 0.37, y: 1 }}
        end={{ x: 0.63, y: 1 + headerHeight / height }}
        style={{ position: 'absolute', top: -height, height, left: 0, right: 0 }}
      />
    ) : null;

  if (rows) {
    const last = rows.data.length - 1;
    // Nothing in it (yet): no title and no card, and the screen stays the same list, so nothing above is redrawn
    const title = last >= 0 ? rows.title : undefined;

    // The content, then the rows' title and one card of rows (Section's look, in pieces: one per row)
    return (
      <NoEdgeEffects style={{ flex: 1 }}>
        <FlatList
          testID="screen-scroll"
          style={{ flex: 1, backgroundColor: colors.background }}
          scrollEnabled={scroll}
          scrollEventThrottle={16}
          onScroll={onScroll}
          refreshControl={refreshControl}
          data={rows.data}
          keyExtractor={rows.rowKey}
          ListHeaderComponent={
            <>
              {overscroll}

              <View
                testID="rows-top"
                style={{ ...column, paddingTop, paddingBottom: last < 0 ? 0 : title ? spacing.xs : spacing.md }}
              >
                <View style={{ gap: spacing.md }}>
                  {content}

                  {title ? <SectionTitle title={title} /> : null}
                </View>
              </View>
            </>
          }
          renderItem={({ item, index }) => (
            <View style={column}>
              <View
                testID="rows-card"
                style={{
                  backgroundColor: colors.surface,
                  paddingHorizontal: spacing.md,
                  paddingTop: index === 0 ? spacing.md : 0,
                  paddingBottom: index === last ? spacing.md : 0,
                  borderTopLeftRadius: index === 0 ? radii.lg : 0,
                  borderTopRightRadius: index === 0 ? radii.lg : 0,
                  borderBottomLeftRadius: index === last ? radii.lg : 0,
                  borderBottomRightRadius: index === last ? radii.lg : 0,
                }}
              >
                {index > 0 ? (
                  <View testID="section-divider" style={{ height: 1, backgroundColor: colors.divider }} />
                ) : null}

                {rows.renderRow(item)}
              </View>
            </View>
          )}
          ListFooterComponent={<View testID="rows-bottom" style={{ height: paddingBottom }} />}
        />
      </NoEdgeEffects>
    );
  }

  const page = (
    <View testID="screen-content" style={{ ...column, flex: scroll ? undefined : 1, paddingTop, paddingBottom }}>
      {content}
    </View>
  );

  if (scroll) {
    return (
      <NoEdgeEffects style={{ flex: 1 }}>
        <ScrollView
          testID="screen-scroll"
          style={{ flex: 1, backgroundColor: colors.background }}
          scrollEventThrottle={16}
          onScroll={onScroll}
          refreshControl={refreshControl}
        >
          {overscroll}

          {page}
        </ScrollView>
      </NoEdgeEffects>
    );
  }

  return <View style={{ flex: 1, backgroundColor: colors.background }}>{page}</View>;
}
