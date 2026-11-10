import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { useTheme } from '../theme';
import type { Product } from '../tokens';
import { confirmCopy } from './copied';
import type { CopyHandler } from './copied';
import { HealthDot } from './HealthDot';
import type { Health } from './HealthDot';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { IconButton } from './IconButton';
import { ProductTile } from './ProductTile';
import { StatusPill } from './StatusPill';
import { Text } from './Text';

type Trailing =
  // text: the current value, before the chevron ("Project › Production"); spokenText: what screen readers hear
  // instead, when the value alone would be unclear (a product's count: "4 resources")
  | { type: 'chevron'; text?: string; spokenText?: string }
  | { type: 'switch'; value: boolean; onValueChange: (value: boolean) => void }
  // onCopy adds a copy button after the value; the screen passes both on to its clipboard (not a secret).
  // copyLabel names that button when rows share a title ("Public IPv4 51.15.12.34"); the title otherwise
  | { type: 'text'; text: string; onCopy?: CopyHandler<{ sensitive: false }>; copyLabel?: string }
  // One choice of a list: the picked one gets a mark
  | { type: 'check'; selected: boolean }
  // Opens something outside the app (a web page in the browser)
  | { type: 'external' }
  // A resource's status as its Pill, after the filled star when pinned (a chevron follows when the row opens)
  | { type: 'status'; label: string; health: Health; pinned?: boolean };

type ListRowProps = {
  title: string;
  subtitle?: string;
  // 'danger' when the subtitle says something went wrong (an event that failed); it says so in words too
  subtitleTone?: 'muted' | 'danger';
  // A health dot in front of the subtitle, whose words say the same ("1 failing · 2 OK")
  subtitleHealth?: Health;
  icon?: IconName;
  // The product's tile instead of the icon (a product, a resource)
  product?: Product;
  trailing?: Trailing;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  // Work in progress (an invoice downloading): a spinner instead of the trailing item, presses ignored
  loading?: boolean;
  // With onPress: what a tap does, when the row's words don't say it (a run that can be stopped)
  accessibilityHint?: string;
};

export function ListRow({
  title,
  subtitle,
  subtitleTone = 'muted',
  subtitleHealth,
  icon,
  product,
  trailing,
  onPress,
  destructive = false,
  disabled = false,
  loading = false,
  accessibilityHint,
}: ListRowProps) {
  const { colors, sizes, spacing } = useTheme();
  // The value last copied: a new value starts again at Copy
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const tone = destructive ? 'danger' : 'default';
  const value = trailing?.type === 'text' || trailing?.type === 'chevron' ? trailing.text : undefined;
  const spokenValue = trailing?.type === 'chevron' ? (trailing.spokenText ?? value) : value;
  const copyable =
    trailing?.type === 'text' && trailing.onCopy
      ? { text: trailing.text, onCopy: trailing.onCopy, name: trailing.copyLabel ?? title }
      : null;
  const copied = copyable !== null && copiedText === copyable.text;
  const selected = trailing?.type === 'check' ? trailing.selected : undefined;
  const status = trailing?.type === 'status' ? trailing : null;
  // One phrase for screen readers: "Zone, fr-par-1", "web-prod-1, DEV1-S · fr-par-1, Running, Pinned"
  const label = [title, subtitle, spokenValue, status?.label, status?.pinned ? 'Pinned' : null]
    .filter(Boolean)
    .join(', ');
  const row = {
    minHeight: sizes.listRowMin,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  };
  const subtitleText = subtitle ? (
    <Text variant="subhead" tone={subtitleTone}>
      {subtitle}
    </Text>
  ) : null;
  const words = (
    <>
      {product ? (
        <ProductTile product={product} />
      ) : icon ? (
        <Icon name={icon} tone={destructive ? 'danger' : 'muted'} />
      ) : null}

      <View style={{ flex: 1 }}>
        <Text variant="body" tone={tone}>
          {title}
        </Text>

        {subtitleText !== null && subtitleHealth ? (
          // The dot sits on the subtitle's first line, next to its words (never alone)
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
            <HealthDot health={subtitleHealth} line="subhead" />

            <View style={{ flexShrink: 1 }}>{subtitleText}</View>
          </View>
        ) : (
          subtitleText
        )}
      </View>

      {value !== undefined && !loading ? (
        // A long value (a key, a fingerprint) wraps on its own side, so the title keeps its room.
        // One to copy is in the monospace font, like a SecretBox's
        <View style={{ flexShrink: 1, maxWidth: '50%' }}>
          <Text variant="body" tone="muted" align="end" mono={copyable !== null}>
            {value}
          </Text>
        </View>
      ) : null}
    </>
  );
  const end = loading ? (
    <ActivityIndicator testID="row-spinner" color={colors.textMuted} />
  ) : (
    <>
      {status ? (
        // Like a value, at most half the row, so the title keeps its room
        <View
          testID="row-status"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1, maxWidth: '50%' }}
        >
          {status.pinned ? (
            <View testID="row-pinned">
              <Icon name="star-filled" size="sm" tone="brand" />
            </View>
          ) : null}

          <View style={{ flexShrink: 1 }}>
            <StatusPill label={status.label} health={status.health} />
          </View>
        </View>
      ) : null}

      {trailing?.type === 'chevron' || (status !== null && onPress !== undefined) ? (
        <Icon name="chevron-right" size="sm" tone="muted" />
      ) : null}

      {trailing?.type === 'check' && trailing.selected ? <Icon name="circle-check" tone="brand" /> : null}

      {trailing?.type === 'external' ? <Icon name="external" size="sm" tone="muted" /> : null}

      {trailing?.type === 'switch' ? (
        <Switch
          // React Native pins a Switch to the top of its row (alignSelf flex-start); centred like the rest
          style={{ alignSelf: 'center' }}
          accessibilityRole="switch"
          accessibilityLabel={title}
          value={trailing.value}
          onValueChange={trailing.onValueChange}
          disabled={disabled}
          trackColor={{ true: colors.brand }}
        />
      ) : null}

      {copyable ? (
        <IconButton
          icon={copied ? 'check' : 'copy'}
          label={(copied ? 'Copied ' : 'Copy ') + copyable.name}
          edge="end"
          disabled={disabled}
          onPress={() =>
            confirmCopy(copyable.onCopy(copyable.text, { sensitive: false }), () => setCopiedText(copyable.text))
          }
        />
      ) : null}
    </>
  );

  if (onPress) {
    const inactive = disabled || loading;

    // Busy isn't unavailable: a loading row keeps its full colour
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint ?? (trailing?.type === 'external' ? 'Opens in your browser' : undefined)}
        accessibilityState={{ disabled: inactive, busy: loading, selected }}
        disabled={inactive}
        onPress={onPress}
        style={({ pressed }) => ({ ...row, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}
      >
        {words}

        {end}
      </Pressable>
    );
  }

  // The words are one phrase; the copy button stays a control of its own, and fades itself when disabled
  if (copyable) {
    return (
      <View style={row}>
        <View accessible accessibilityLabel={label} style={{ ...row, flex: 1, opacity: disabled ? 0.5 : 1 }}>
          {words}
        </View>

        {end}
      </View>
    );
  }

  // A row with a switch stays open so the switch can be reached on its own
  return (
    <View
      accessible={trailing?.type !== 'switch'}
      accessibilityLabel={trailing?.type === 'switch' ? undefined : label}
      accessibilityState={loading || selected !== undefined ? { busy: loading, selected } : undefined}
      style={{ ...row, opacity: disabled ? 0.5 : 1 }}
    >
      {words}

      {end}
    </View>
  );
}
