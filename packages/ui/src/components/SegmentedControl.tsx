import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme';
import { sizes, spacing, typography } from '../tokens';
import { Text } from './Text';
import type { Tone } from './Text';

type SegmentedControlProps<T extends string> = {
  // `accessibilityLabel`: what screen readers say, when the label is short ('6 months' for '6M')
  options: readonly { key: T; label: string; accessibilityLabel?: string }[];
  value: T;
  onChange: (key: T) => void;
  // 'onBrand' on the purple header
  tone?: 'default' | 'onBrand';
  // With two options the whole switch is one button: this names it ("Range" is read as "Range: 6 months")
  accessibilityLabel?: string;
};

// Space between the track's edge and the picked segment, from the approved mockup
const TRACK_INSET = 2;

// How tall the switch is at a text size: its 44 pt touch box, or its segments' padding and line.
export function segmentedControlHeight(fontScale: number): number {
  const slack = (sizes.touchMin - sizes.compactControl) / 2;

  return Math.max(
    sizes.touchMin,
    2 * (slack + TRACK_INSET) + 2 * spacing.xxs + typography.caption.lineHeight * fontScale,
  );
}

// A row of choices (6M / 12M), one of them picked. With two choices a tap anywhere switches to the other one.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'default',
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors, radii, sizes, spacing, motion } = useTheme();
  const reduceMotion = useReducedMotion();
  const toggles = options.length === 2;
  // Where each segment sits, so the white pill can slide between them
  const [frames, setFrames] = useState<Partial<Record<T, { x: number; width: number }>>>({});
  const placed = useRef(false);
  const shown = useRef(value);
  const left = useSharedValue(0);
  const width = useSharedValue(0);
  const target = frames[value];
  const [x1, y1, x2, y2] = motion.easing.standard;
  // The picked segment is a white (or surface) pill with a bold label
  const look: { track: string; pill: string; picked: Tone; other: Tone } =
    tone === 'onBrand'
      ? { track: colors.controlOnBrand, pill: colors.onBrand, picked: 'primaryButton', other: 'onBrand' }
      : { track: colors.divider, pill: colors.surface, picked: 'default', other: 'muted' };
  // The track looks compactControl high, centred in a 44 pt touch box
  const slack = (sizes.touchMin - sizes.compactControl) / 2;

  // The pill slides to the picked segment; the first time, and with Reduce Motion, it is simply there
  useEffect(() => {
    if (!toggles || !target) {
      return;
    }

    // Only a new pick slides; a text size change moves the pill at once
    const animate = placed.current && !reduceMotion && shown.current !== value;
    const timing = { duration: motion.duration.base, easing: Easing.bezier(x1, y1, x2, y2) };

    left.value = animate ? withTiming(target.x + TRACK_INSET, timing) : target.x + TRACK_INSET;
    width.value = animate ? withTiming(target.width - 2 * TRACK_INSET, timing) : target.width - 2 * TRACK_INSET;
    placed.current = true;
    shown.current = value;
  }, [toggles, target, value, reduceMotion, left, width, motion.duration.base, x1, y1, x2, y2]);

  const slideStyle = useAnimatedStyle(() => ({ left: left.value, width: width.value }));
  const picked = options.find((option) => option.key === value) ?? options[0];
  const other = options.find((option) => option.key !== value) ?? options[0];
  const spoken = (option: typeof picked) => option?.accessibilityLabel ?? option?.label ?? '';
  const toggle = () => {
    if (other) {
      onChange(other.key);
      // The label changes under the finger; say the new choice once, as the label would
      AccessibilityInfo.announceForAccessibility(accessibilityLabel ? `${accessibilityLabel}: ${spoken(other)}` : spoken(other));
    }
  };

  const track = (
    <View
      testID="segmented-track"
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: slack,
        bottom: slack,
        borderRadius: radii.pill,
        backgroundColor: look.track,
      }}
    />
  );
  // Each segment is a full-height touch box; the track is drawn behind them. Words too wide for the room (the largest
  // text sizes) share it and wrap, a word may break inside itself (an accepted exception), instead of running off
  const segmentStyle = {
    flexShrink: 1,
    minWidth: sizes.touchMin,
    paddingVertical: slack + TRACK_INSET,
    paddingHorizontal: TRACK_INSET,
  };
  // Until the sliding pill has a place, the picked label keeps the other tone: no purple on the bare track
  const placedPill = !toggles || target !== undefined;
  const label = (option: (typeof options)[number], selected: boolean) => (
    <View
      testID="segment-pill"
      style={{
        flexGrow: 1,
        minHeight: sizes.compactControl - 2 * TRACK_INSET,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xxs,
        alignItems: 'center',
        justifyContent: 'center',
        // With two choices the sliding pill is the background
        backgroundColor: selected && !toggles ? look.pill : 'transparent',
      }}
    >
      <Text variant="caption" tone={selected && placedPill ? look.picked : look.other} bold={selected} align="center">
        {option.label}
      </Text>
    </View>
  );

  // The box keeps the switch as wide as its choices in a column, and lets it fill the height of a row
  return (
    <View testID="segmented-box" style={{ minHeight: sizes.touchMin, alignItems: 'flex-start' }}>
      {toggles ? (
        <Pressable
          testID="segmented-control"
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}: ${spoken(picked)}` : spoken(picked)}
          accessibilityHint={`Double-tap to show ${spoken(other)}`}
          onPress={toggle}
          style={({ pressed }) => ({ flexGrow: 1, flexDirection: 'row', opacity: pressed ? 0.8 : 1 })}
        >
          {track}

          <Animated.View
            testID="segmented-slider"
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: slack + TRACK_INSET,
                bottom: slack + TRACK_INSET,
                borderRadius: radii.pill,
                backgroundColor: look.pill,
              },
              slideStyle,
            ]}
          />

          {options.map((option) => (
            <View
              key={option.key}
              testID="segment"
              style={segmentStyle}
              onLayout={({ nativeEvent: { layout } }: LayoutChangeEvent) =>
                setFrames((current) => {
                  const known = current[option.key];

                  return known?.x === layout.x && known.width === layout.width
                    ? current
                    : { ...current, [option.key]: { x: layout.x, width: layout.width } };
                })
              }
            >
              {label(option, option.key === value)}
            </View>
          ))}
        </Pressable>
      ) : (
        <View testID="segmented-control" accessibilityRole="tablist" style={{ flexGrow: 1, flexDirection: 'row' }}>
          {track}

          {options.map((option) => {
            const selected = option.key === value;

            return (
              <Pressable
                key={option.key}
                accessibilityRole="tab"
                accessibilityLabel={option.accessibilityLabel ?? option.label}
                accessibilityState={{ selected }}
                onPress={() => {
                  if (!selected) {
                    onChange(option.key);
                  }
                }}
                style={({ pressed }) => ({ ...segmentStyle, opacity: pressed ? 0.8 : 1 })}
              >
                {label(option, selected)}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
