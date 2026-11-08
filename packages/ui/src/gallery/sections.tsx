import { useEffect, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedSplash } from '../components/AnimatedSplash';
import type { WindowRect } from '../components/AnimatedSplash';
import { AnimatedSplashEntrance } from '../components/AnimatedSplashEntrance';
import type { SplashEntranceState } from '../components/AnimatedSplashEntrance';
import { AnimatedSplashLogoSlot } from '../components/AnimatedSplashLogoSlot';
import { LineChart } from '../charts/LineChart';
import type { ChartPoint } from '../charts/LineChart';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { FloatingNotice } from '../components/FloatingNotice';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { HeaderBackground } from '../components/HeaderBackground';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { LogoMark } from '../components/LogoMark';
import { Overlay } from '../components/Overlay';
import { PickerChip } from '../components/PickerChip';
import { Pill } from '../components/Pill';
import { PRODUCT_ICON } from '../components/ProductTile';
import { Screen } from '../components/Screen';
import { ScreenReaderShield } from '../components/ScreenReaderShield';
import { Section } from '../components/Section';
import { SegmentedControl } from '../components/SegmentedControl';
import { Skeleton } from '../components/Skeleton';
import { SpendingSummary } from '../components/SpendingSummary';
import { Stack } from '../components/Stack';
import { StatusBar } from '../components/StatusBar';
import { Text } from '../components/Text';
import type { Tone } from '../components/Text';
import { useHomeHeaderLayout } from '../layout/homeHeaderLayout';
import { tabBarLayout } from '../layout/tabBarLayout';
import { useTheme } from '../theme';
import { sizes, spacing, typography } from '../tokens';
import type { Product, ThemeColors, TypographyVariant } from '../tokens';
import { DEMO_WAIT_MS, FORMS_SECTIONS } from './formsSections';
import { HOME_SECTIONS, RANGES } from './homeSections';
import { PRODUCT_SECTIONS } from './productSections';

// `render` is used as a component, so a section may keep its own state.
export type GallerySection = { name: string; render: () => ReactNode };

type ButtonVariant = NonNullable<ComponentProps<typeof Button>['variant']>;
type IconTone = NonNullable<ComponentProps<typeof Icon>['tone']>;
type PillTone = ComponentProps<typeof Pill>['tone'];
// Any single theme colour (not the gradient, the chart series or the product colours)
type ToneBackground = Exclude<keyof ThemeColors, 'headerGradient' | 'series' | 'products'>;

const noop = () => {};

// The Record types make TypeScript fail when a new variant is missing here.
const ICON_USES: Record<IconName, string> = {
  home: 'Home tab',
  layers: 'Resources tab',
  chart: 'Billing tab',
  user: 'Account tab',
  'chevron-right': 'Row that opens a screen',
  'chevron-left': 'Back',
  'chevron-down': 'Opens a picker',
  'wifi-off': 'Offline',
  check: 'Done, back online, copied',
  'circle-check': 'The picked choice in a list',
  lock: 'App lock',
  'log-out': 'Log out',
  fingerprint: 'Face ID or fingerprint',
  alert: 'Warning or alert',
  close: 'Close',
  server: 'Instances, Elastic Metal',
  cube: 'Kubernetes',
  database: 'Databases',
  box: 'Serverless containers',
  zap: 'Serverless functions',
  play: 'Serverless jobs',
  split: 'Load balancers',
  star: 'Pin to Home (the pin while it is off)',
  'star-filled': 'Pinned, and the pin while it is on (filled)',
  plus: 'Add or create',
  trash: 'Delete',
  key: 'SSH keys, API keys',
  activity: 'Activity log',
  file: 'Invoice',
  copy: 'Copy',
  github: 'Source code',
  appearance: 'Appearance: follow phone, light or dark',
  info: 'About the app; a note to read (AlertRow info); a resource that no longer exists',
  external: 'Opens outside the app (a ListRow\'s external trailing)',
  power: 'Power on or off, start or stop a server',
  moon: 'Standby',
  restart: 'Reboot, restart',
  backup: 'Back up',
  redeploy: 'Redeploy',
  replace: 'Replace a node',
  run: 'Run a job now',
  stop: "Stop a job's run (kept for a future action button; a run is stopped from its row today)",
};

// `onPurple` variants are shown on a HeaderBackground.
const BUTTON_USES: Record<ButtonVariant, { use: string; onPurple: boolean }> = {
  primary: { use: 'The main action of a screen. One per screen.', onPurple: false },
  secondary: { use: 'A second action next to a primary one.', onPurple: false },
  ghost: { use: 'A quiet action on the page background.', onPurple: false },
  onBrand: { use: 'The main action on purple, like "Log in with Scaleway".', onPurple: true },
  ghostOnBrand: { use: 'A quiet action on purple, for a secondary choice.', onPurple: true },
};

const PILL_SAMPLES: Record<PillTone, readonly { label: string; icon?: IconName }[]> = {
  inverse: [{ label: "You're offline · showing data from 10:42", icon: 'wifi-off' }, { label: 'Demo' }],
  success: [{ label: 'Back online', icon: 'check' }, { label: 'Running' }],
  warning: [{ label: 'High CPU', icon: 'alert' }, { label: 'Pending' }],
  neutral: [{ label: 'Stopped' }],
  danger: [{ label: 'Error', icon: 'alert' }, { label: 'Failed' }],
  brand: [{ label: 'Starting' }, { label: 'Rebooting' }],
};

// Each text tone on the background it is made for.
const TONE_BACKGROUNDS: Record<Tone, readonly ToneBackground[]> = {
  default: ['surface'],
  muted: ['surface'],
  brand: ['surface'],
  danger: ['surface', 'alertBackground'],
  onBrand: ['splashBackground'],
  primaryButton: ['onBrand'],
  onPrimaryButton: ['primaryButton'],
  onBadge: ['successBadge', 'warningBadge', 'dangerBadge', 'neutralBadge', 'inverseBadge', 'primaryButton'],
};

// Each icon tone on the background it is made for.
const ICON_TONE_BACKGROUNDS: Record<IconTone, ToneBackground> = {
  default: 'surface',
  muted: 'surface',
  brand: 'surface',
  danger: 'surface',
  onBrand: 'splashBackground',
  primaryButton: 'onBrand',
  onPrimaryButton: 'primaryButton',
  onBadge: 'successBadge',
  active: 'tabActiveBackground',
  idle: 'tabBarBackground',
};

const TABS = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'resources', icon: 'layers', label: 'Resources' },
  { key: 'billing', icon: 'chart', label: 'Billing' },
  { key: 'account', icon: 'user', label: 'Account' },
] as const;

// The splash preview is a whole phone screen, scaled down.
const SPLASH_PREVIEW_SCALE = 0.4;

// A year of demo spending, in cents, up to November 2026 (this month, so far)
const DEMO_MONTHS = [
  'December 2025',
  'January 2026',
  'February 2026',
  'March 2026',
  'April 2026',
  'May 2026',
  'June 2026',
  'July 2026',
  'August 2026',
  'September 2026',
  'October 2026',
  'November 2026',
];
const DEMO_SPENDING = [7230, 7810, 7540, 8260, 8890, 9120, 10240, 11020, 9980, 11860, 14120, 8460];
const DEMO_PROJECTION = { value: 14929, label: '≈ €149.29 by month end' };
const euros = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });

// The last `count` months: short labels for 6 ('Nov'), initials for 12 ('N')
function demoPoints(count: 6 | 12, spending: readonly number[]): ChartPoint[] {
  const values = spending.slice(-count);

  return DEMO_MONTHS.slice(-count).map((month, index) => {
    const value = values[index] ?? 0;

    return {
      key: month,
      label: count === 6 ? month.slice(0, 3) : month.charAt(0),
      value,
      description: `${month}, ${euros.format(value / 100)}`,
    };
  });
}

// A choice list: an API key's expiry
type Expiry = '30d' | '90d' | '1y' | 'never';

const EXPIRIES: readonly { key: Expiry; label: string }[] = [
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '1y', label: '1 year' },
  { key: 'never', label: 'Never' },
];

const SIX_MONTHS = demoPoints(6, DEMO_SPENDING);
const TWELVE_MONTHS = demoPoints(12, DEMO_SPENDING);
const NO_SPENDING = demoPoints(6, DEMO_SPENDING.map(() => 0));

export const GALLERY_SECTIONS: readonly GallerySection[] = [
  {
    name: 'Text',
    render: function TextSection() {
      const { colors, radii } = useTheme();

      return (
        <Stack gap="sm">
          {(Object.keys(typography) as TypographyVariant[]).map((variant) => (
            <Text key={variant} variant={variant}>
              {`${variant} ${typography[variant].fontSize}/${typography[variant].lineHeight}`}
            </Text>
          ))}

          <Stack direction="row" wrap gap="xs">
            {(Object.keys(TONE_BACKGROUNDS) as Tone[]).map((tone) =>
              TONE_BACKGROUNDS[tone].map((background) => (
                <View
                  key={`${tone}-${background}`}
                  style={[styles.chip, { backgroundColor: colors[background], borderRadius: radii.sm }]}
                >
                  <Text variant="subhead" tone={tone}>
                    {`${tone} on ${background}`}
                  </Text>
                </View>
              )),
            )}
          </Stack>

          <Text variant="body" align="center">
            align center: every line is centred, even when a long sentence wraps onto a second line
          </Text>

          <Text variant="body" align="end">
            align end: lines up on the other side, like a value at the end of a row, even when it wraps onto a second line
          </Text>

          <Text variant="caption" bold>
            {"bold: the chart's selected month"}
          </Text>

          <Text variant="body" mono>
            mono: SCWXXXXXXXXXXXXXXXXX (keys, fingerprints, secrets)
          </Text>

          <View style={styles.narrow}>
            <Text variant="caption" shrinkToFit>
              {"shrinkToFit: one line that shrinks when it doesn't fit"}
            </Text>
          </View>

          <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
            Live region: polite (read out when it changes)
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'Icon',
    render: function IconSection() {
      const { colors, radii } = useTheme();

      return (
        <Stack gap="sm">
          <Section>
            {(Object.keys(ICON_USES) as IconName[]).map((name) => (
              <ListRow key={name} icon={name} title={name} subtitle={ICON_USES[name]} />
            ))}
          </Section>

          <Text variant="caption" tone="muted">
            Sizes: sm 16, md 21, lg 24
          </Text>

          <Stack direction="row" align="center" gap="xs">
            <Icon name="layers" size="sm" />

            <Icon name="layers" size="md" />

            <Icon name="layers" size="lg" />
          </Stack>

          <Text variant="caption" tone="muted">
            Tones, each on the background it is made for
          </Text>

          <Stack direction="row" wrap gap="sm">
            {(Object.keys(ICON_TONE_BACKGROUNDS) as IconTone[]).map((tone) => (
              <Stack key={tone} align="center" gap="xxs">
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: colors[ICON_TONE_BACKGROUNDS[tone]], borderRadius: radii.sm },
                  ]}
                >
                  <Icon name="layers" tone={tone} />
                </View>

                <Text variant="caption" tone="muted">
                  {tone}
                </Text>
              </Stack>
            ))}
          </Stack>

          <Text variant="caption" tone="muted">
            product: the icon in a product&apos;s colour, on its tile (ResourceCard)
          </Text>

          <Stack direction="row" wrap gap="sm">
            {(Object.keys(PRODUCT_ICON) as Product[]).map((product) => (
              <Stack key={product} align="center" gap="xxs">
                <View
                  style={[styles.chip, { backgroundColor: colors.products[product].tile, borderRadius: radii.sm }]}
                >
                  <Icon name={PRODUCT_ICON[product]} product={product} />
                </View>

                <Text variant="caption" tone="muted">
                  {product}
                </Text>
              </Stack>
            ))}
          </Stack>
        </Stack>
      );
    },
  },
  {
    name: 'Button',
    render: function ButtonSection() {
      const variants = Object.keys(BUTTON_USES) as ButtonVariant[];
      const demo = (variant: ButtonVariant) => {
        const { use, onPurple } = BUTTON_USES[variant];

        return (
          <Stack key={variant} gap="sm">
            <Text variant="headline" tone={onPurple ? 'onBrand' : 'default'}>
              {variant}
            </Text>

            <Text variant="subhead" tone={onPurple ? 'onBrand' : 'muted'}>
              {use}
            </Text>

            <Stack direction="row" wrap gap="xs">
              <Button label="Continue" size="md" variant={variant} onPress={noop} />

              <Button label="Confirm" icon="check" size="md" variant={variant} onPress={noop} />
            </Stack>

            <Stack direction="row" wrap gap="xs">
              <Button label="Continue" size="sm" variant={variant} onPress={noop} />

              <Button label="Confirm" icon="check" size="sm" variant={variant} onPress={noop} />

              <Button label="See all" icon="chevron-right" iconPosition="end" size="sm" variant={variant} onPress={noop} />
            </Stack>

            <Stack direction="row" wrap gap="xs">
              <Button label="Disabled" size="md" variant={variant} disabled onPress={noop} />

              <Button label="Loading" size="md" variant={variant} loading onPress={noop} />
            </Stack>
          </Stack>
        );
      };

      return (
        <Stack gap="lg">
          {variants.filter((variant) => !BUTTON_USES[variant].onPurple).map(demo)}

          <HeaderBackground>
            <Stack padding="lg" gap="lg">
              {variants.filter((variant) => BUTTON_USES[variant].onPurple).map(demo)}
            </Stack>
          </HeaderBackground>
        </Stack>
      );
    },
  },
  {
    name: 'Card',
    render: () => (
      <Stack gap="sm">
        <Card>
          <Text variant="body">Plain card, padding md.</Text>
        </Card>

        <Card raised>
          <Text variant="body">Raised card: soft shadow in light mode only.</Text>
        </Card>

        <Card onPress={noop}>
          <Text variant="body">
            Card with onPress: the whole card is one button. It dims while pressed. Screen readers hear its
            accessibilityLabel, or else its text.
          </Text>
        </Card>

        <Card onPress={noop} disabled>
          <Text variant="body">{"Disabled: faded, and it can't be pressed."}</Text>
        </Card>

        <Card padding="lg">
          <Text variant="body">Padding lg.</Text>
        </Card>
      </Stack>
    ),
  },
  {
    name: 'Stack',
    render: () => (
      <Stack gap="sm">
        <Text variant="subhead" tone="muted">
          A column (the default), gap md
        </Text>

        <Stack>
          <Card>
            <Text variant="body">First card</Text>
          </Card>

          <Card>
            <Text variant="body">Second card</Text>
          </Card>
        </Stack>

        <Text variant="subhead" tone="muted">
          A row of two md buttons, gap xs
        </Text>

        <Stack direction="row" gap="xs">
          <Button label="Cancel" size="md" fill variant="secondary" onPress={noop} />

          <Button label="Reboot" size="md" fill onPress={noop} />
        </Stack>

        <Text variant="subhead" tone="muted">
          {"overlapHeader: pulled 28 pt up over the header's rounded bottom"}
        </Text>

        <View>
          <HeaderBackground>
            <Stack paddingHorizontal="lg" paddingVertical="xxl">
              <Text variant="headline" tone="onBrand">
                Header
              </Text>
            </Stack>
          </HeaderBackground>

          <Stack paddingHorizontal="md" overlapHeader>
            <Card raised>
              <Text variant="body">November by product</Text>
            </Card>
          </Stack>
        </View>

        <Text variant="subhead" tone="muted">
          contained: centred at 560 pt on wide screens (iPad), for content under a full-bleed header
        </Text>

        <Stack contained>
          <Card>
            <Text variant="body">On a phone this fills the width; on an iPad it stays 560 wide.</Text>
          </Card>
        </Stack>
      </Stack>
    ),
  },
  {
    name: 'Screen',
    render: function ScreenSection() {
      const { colors, radii } = useTheme();
      const frame = [styles.screenFrame, { borderColor: colors.divider, borderRadius: radii.lg }];
      const [refreshing, setRefreshing] = useState(false);
      const [refreshingHeader, setRefreshingHeader] = useState(false);
      const [underStatusBar, setUnderStatusBar] = useState(true);

      useEffect(() => {
        if (!refreshing && !refreshingHeader) {
          return;
        }

        const done = setTimeout(() => {
          setRefreshing(false);
          setRefreshingHeader(false);
        }, DEMO_WAIT_MS);

        return () => clearTimeout(done);
      }, [refreshing, refreshingHeader]);

      return (
        <Stack gap="sm">
          <Text variant="subhead" tone="muted">
            The default: room for the status bar, 16 pt sides
          </Text>

          <View style={frame}>
            <Screen scroll={false} withTabBar={false}>
              <Text variant="body">
                The page background, the safe-area space at the top, a centred width on iPad, and
                room for the tab bar. This gallery is a Screen too.
              </Text>
            </Screen>
          </View>

          <Text variant="subhead" tone="muted">
            Account: topInset belowNotice. The content starts below the offline pill, whether it shows
            or not, so nothing moves when it comes and goes
          </Text>

          <View style={frame}>
            <Screen scroll={false} withTabBar={false} topInset="belowNotice">
              <Section title="Security">
                <ListRow title="First row" subtitle="Never under the pill" />
              </Section>

              <FloatingNotice>
                <Pill tone="inverse" icon="wifi-off" label="You're offline" />
              </FloatingNotice>
            </Screen>
          </View>

          <Text variant="subhead" tone="muted">
            Home: topInset none and padded off, with HeaderBackground insetTop. The purple starts at
            the very top and reaches both edges, its content below the status bar
          </Text>

          <View style={frame}>
            <Screen scroll={false} withTabBar={false} topInset="none" padded={false}>
              <HeaderBackground insetTop>
                <Stack paddingHorizontal="lg" paddingVertical="xxl">
                  <Text variant="headline" tone="onBrand">
                    Header under the status bar
                  </Text>
                </Stack>
              </HeaderBackground>

              <Stack paddingHorizontal="md" overlapHeader contained>
                <Card raised>
                  <Text variant="body">The cards use Stack paddingHorizontal md, overlapHeader and contained.</Text>
                </Card>
              </Stack>
            </Screen>
          </View>

          <Text variant="subhead" tone="muted">
            onRefresh and refreshing: pull this one down to refresh (a brand spinner on the page)
          </Text>

          <View style={[frame, styles.scrollFrame]}>
            <Screen withTabBar={false} topInset="belowNotice" onRefresh={() => setRefreshing(true)} refreshing={refreshing}>
              <Section title="Today">
                <ListRow title="Created an instance" subtitle="You · Instances" trailing={{ type: 'text', text: '10:42' }} />

                <ListRow title="Logged in" subtitle="You" trailing={{ type: 'text', text: '09:15' }} />
              </Section>
            </Screen>
          </View>

          <Text variant="subhead" tone="muted">
            rows: a list that can grow long, last on the screen (a product&apos;s resources, a cluster&apos;s nodes).
            It looks like a Section, and only the rows near the screen are drawn. This sample doesn&apos;t scroll (a
            list can&apos;t scroll inside the gallery&apos;s own scroll)
          </Text>

          <View style={[frame, styles.fullFrame]}>
            <Screen
              scroll={false}
              withTabBar={false}
              rows={{
                title: 'Production',
                data: GALLERY_SERVERS,
                rowKey: (server) => server.title,
                renderRow: (server) => (
                  <ListRow
                    title={server.title}
                    subtitle={server.subtitle}
                    trailing={{ type: 'status', ...server.status }}
                    onPress={noop}
                  />
                ),
              }}
            >
              <Text variant="title" accessibilityRole="header">
                Instances
              </Text>
            </Screen>
          </View>

          <Text variant="subhead" tone="muted">
            {`onHeaderUnderStatusBar: scroll this one. Header under the status bar: ${underStatusBar ? 'yes (light icons)' : 'no (the theme decides)'}. Pull it down: on purple the spinner is white (iOS).`}
          </Text>

          <View style={[frame, styles.scrollFrame]}>
            <Screen
              withTabBar={false}
              topInset="none"
              padded={false}
              onHeaderUnderStatusBar={setUnderStatusBar}
              onRefresh={() => setRefreshingHeader(true)}
              refreshing={refreshingHeader}
            >
              <HeaderBackground insetTop>
                <Stack paddingHorizontal="lg" paddingVertical="xxl">
                  <Text variant="headline" tone="onBrand">
                    Header under the status bar
                  </Text>
                </Stack>
              </HeaderBackground>

              <Stack paddingHorizontal="md" overlapHeader contained>
                {[1, 2, 3, 4].map((card) => (
                  <Card key={card} raised={card === 1}>
                    <Text variant="body">{`Card ${card}`}</Text>
                  </Card>
                ))}
              </Stack>
            </Screen>
          </View>

          <Text variant="subhead" tone="muted">
            Welcome: bottomInset none too, with HeaderBackground fill, insetTop, insetBottom and dots.
            The purple fills the screen (square corners), its content clear of the status bar and the
            home indicator, with a still grid of small dots behind it
          </Text>

          <View style={frame}>
            <Screen
              scroll={false}
              withTabBar={false}
              topInset="none"
              bottomInset="none"
              padded={false}
            >
              <HeaderBackground fill insetTop insetBottom dots>
                <Stack grow justify="between" padding="lg">
                  <LogoMark size={sizes.logoHero} />

                  <Stack gap="xs">
                    <Button label="Log in with Scaleway" size="md" variant="onBrand" onPress={noop} />
                  </Stack>
                </Stack>
              </HeaderBackground>
            </Screen>
          </View>
        </Stack>
      );
    },
  },
  {
    name: 'ListRow',
    render: function ListRowSection() {
      const [faceId, setFaceId] = useState(true);
      const [expiry, setExpiry] = useState<Expiry>('90d');
      const [downloading, setDownloading] = useState(false);

      useEffect(() => {
        if (!downloading) {
          return;
        }

        const done = setTimeout(() => setDownloading(false), DEMO_WAIT_MS);

        return () => clearTimeout(done);
      }, [downloading]);

      return (
        <Stack>
          <Section>
            <ListRow
              title="Account"
              subtitle="Profile and organization"
              icon="user"
              trailing={{ type: 'chevron' }}
              onPress={noop}
            />

            <ListRow title="Project" trailing={{ type: 'chevron', text: 'Production' }} onPress={noop} />

            <ListRow title="Version" trailing={{ type: 'text', text: '3.0.0' }} />

            <ListRow title="Source code on GitHub" icon="github" trailing={{ type: 'external' }} onPress={noop} />

            <ListRow
              title="Unlock with Face ID"
              icon="fingerprint"
              trailing={{ type: 'switch', value: faceId, onValueChange: setFaceId }}
            />

            <ListRow
              title="Activity log"
              subtitle="You're offline"
              trailing={{ type: 'chevron' }}
              onPress={noop}
              disabled
            />
          </Section>

          <Section title="Products">
            <ListRow
              title="Instances"
              product="instances"
              subtitle="1 failing · 2 OK · 1 stopped"
              subtitleHealth="error"
              trailing={{ type: 'chevron', text: '4', spokenText: '4 resources' }}
              onPress={noop}
            />

            <ListRow
              title="Databases"
              product="databases"
              subtitle="1 needs attention"
              subtitleHealth="warning"
              trailing={{ type: 'chevron', text: '1', spokenText: '1 resource' }}
              onPress={noop}
            />

            <ListRow
              title="Kubernetes"
              product="kubernetes"
              subtitle="1 OK"
              subtitleHealth="ok"
              trailing={{ type: 'chevron', text: '1', spokenText: '1 resource' }}
              onPress={noop}
            />
          </Section>

          <Section title="Instances">
            <ListRow
              title="web-prod-1"
              subtitle="DEV1-S · fr-par-1"
              trailing={{ type: 'status', label: 'Running', health: 'ok', pinned: true }}
              onPress={noop}
            />

            <ListRow
              title="api-prod-2"
              subtitle="GP1-XS · fr-par-1"
              trailing={{ type: 'status', label: 'Rebooting…', health: 'busy' }}
              onPress={noop}
            />

            <ListRow
              title="scw-nervous-bardeen-with-a-long-name"
              subtitle="DEV1-M · fr-par-2"
              trailing={{ type: 'status', label: 'Needs attention', health: 'warning' }}
              onPress={noop}
            />
          </Section>

          <Section title="Node pools">
            <ListRow
              title="pool-default"
              subtitle="3 × DEV1-M · autoscaling 1–5"
              trailing={{ type: 'status', label: 'Ready', health: 'ok' }}
            />
          </Section>

          <Section title="Recent runs">
            <ListRow
              title="7 Nov 12:00"
              subtitle="Running for 12 min"
              trailing={{ type: 'status', label: 'Running…', health: 'busy' }}
              accessibilityHint="Asks if you want to stop this run"
              onPress={noop}
            />
          </Section>

          <Section title="Values you can copy">
            <ListRow title="Access key" trailing={{ type: 'text', text: 'SCWXXXXXXXXXXXXXXXXX', onCopy: noop }} />

            <ListRow
              title="Fingerprint"
              trailing={{ type: 'text', text: '256 SHA256:3fVkC2xu0JmS2n3wQf9bY4X1 (ED25519)', onCopy: noop }}
            />
          </Section>

          <Section title="Network">
            {['51.15.12.34', '51.15.12.35'].map((ip) => (
              <ListRow
                key={ip}
                title="Public IPv4"
                trailing={{ type: 'text', text: ip, onCopy: noop, copyLabel: `Public IPv4 ${ip}` }}
              />
            ))}
          </Section>

          <Section title="Expires after">
            {EXPIRIES.map((option) => (
              <ListRow
                key={option.key}
                title={option.label}
                trailing={{ type: 'check', selected: option.key === expiry }}
                onPress={() => setExpiry(option.key)}
              />
            ))}
          </Section>

          <Section title="Today">
            <ListRow title="Stop server" subtitle="You · Instances" trailing={{ type: 'text', text: '14:05' }} />

            <ListRow
              title="Delete snapshot"
              subtitle="Someone else · Instances · Failed"
              subtitleTone="danger"
              trailing={{ type: 'text', text: '09:12' }}
            />
          </Section>

          <Section title="Invoices">
            <ListRow
              title="November 2026"
              subtitle="Invoice 2026-11-0042 · Paid"
              trailing={{ type: 'text', text: '€84.60' }}
              onPress={() => setDownloading(true)}
              loading={downloading}
            />
          </Section>

          <Section>
            <ListRow title="Log out" icon="log-out" destructive onPress={noop} />
          </Section>

          <Text variant="caption" tone="muted">
            Project: a row that opens something shows its value before the chevron. Copy: the value in the monospace
            font, and its own button, named &quot;Copy Access key&quot;; it turns into a check once copied (no toast). A
            long value wraps on its side. Network: rows that share a title name their copy buttons apart (copyLabel,
            &quot;Copy Public IPv4 51.15.12.34&quot;). Check: one choice of a list, the picked one marked. Today: an
            activity log; a failed event says so in words, and its subtitle is in the danger tone (subtitleTone).
            Loading: tap the invoice; a spinner stands in for the amount while it downloads, and presses wait. Products:
            the product&apos;s tile instead of an icon, the worst health&apos;s dot in front of the summary words
            (subtitleHealth), and the count as the chevron&apos;s value, heard as &quot;4 resources&quot; (spokenText).
            Instances: a resource&apos;s status as its Pill (status), the filled star before it when pinned, and a
            chevron when the row opens the resource; at most half the row, so a long name keeps its room. Node pools: a
            status that opens nothing has no chevron. Recent runs: a tap that asks a question says so to screen readers
            (accessibilityHint).
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'Section',
    render: () => (
      <Stack>
        <Section title="Security">
          <ListRow title="Lock after" trailing={{ type: 'text', text: '5 minutes' }} />

          <ListRow title="Activity log" trailing={{ type: 'chevron' }} onPress={noop} />
        </Section>

        <Section>
          <ListRow title="A section without a title" />
        </Section>

        <Section title="Loading" loading />

        <Section title="Organization" loading="one">
          <ListRow title="Switch organization" trailing={{ type: 'chevron' }} onPress={noop} />
        </Section>

        <Text variant="caption" tone="muted">
          loading: three row-shaped placeholders while the rows load (invoices, the activity log); &quot;one&quot;: one
          row still coming (the organization&apos;s name). Rows already known stay below them.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'Pill',
    render: () => (
      <Stack gap="sm">
        {(Object.keys(PILL_SAMPLES) as PillTone[]).map((tone) => (
          <Stack key={tone} direction="row" wrap align="center" gap="xs">
            {PILL_SAMPLES[tone].map((sample) => (
              <Pill key={sample.label} tone={tone} label={sample.label} icon={sample.icon} />
            ))}
          </Stack>
        ))}

        <Text variant="caption" tone="muted">
          White words on a dark shade of each colour, at least 4.5:1 in light and dark. The word is always there: the
          colour never speaks alone. In dark mode the inverse pill (offline, Demo, a Toast) has a light edge, so it
          shows on the page, on a card and on purple.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'EmptyState',
    render: () => (
      <Stack gap="sm">
        <EmptyState
          icon="layers"
          title="No resources yet"
          message="Your servers and databases show up here."
        />

        <EmptyState icon="alert" title="Couldn't load your invoices" action={{ label: 'Try again', onPress: noop }} />

        <EmptyState
          icon="alert"
          title="Couldn't load your SSH keys"
          action={{ label: 'Try again', onPress: noop, disabled: true, note: "You're offline" }}
        />

        <EmptyState
          icon="key"
          title="SSH keys aren't available"
          message="You don't have access to SSH keys in this project."
        />

        <Text variant="caption" tone="muted">
          Can&apos;t load: the alert icon, &quot;Couldn&apos;t load your …&quot; and Try again. Offline, the button is off
          and its note says why, right under it (action.note). No access: the area&apos;s icon, &quot;… isn&apos;t
          available&quot;, and no button: trying again can&apos;t help.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'Skeleton',
    render: () => (
      <Stack gap="sm">
        <Card>
          <Stack gap="sm">
            <Stack direction="row" align="center" gap="xs">
              <Skeleton width={40} height={40} radius="pill" />

              <Stack grow>
                <Skeleton width="100%" />
              </Stack>
            </Stack>

            <Skeleton width="100%" />

            <Skeleton width={180} />

            <Skeleton width="100%" height={96} radius="lg" />
          </Stack>
        </Card>

        <Text variant="subhead" tone="muted">
          tone onBrand: a soft white, for content loading on the purple header
        </Text>

        <HeaderBackground>
          <Stack padding="lg" gap="xs">
            <Skeleton width={180} tone="onBrand" />

            <Skeleton width="100%" height={40} radius="md" tone="onBrand" />
          </Stack>
        </HeaderBackground>

        <Text variant="subhead" tone="muted">
          {"variant: a line of another text style, grown with the text size (subhead, display, caption), as Home's header loads"}
        </Text>

        <HeaderBackground>
          <Stack padding="lg" gap="none">
            <Skeleton width={180} variant="subhead" tone="onBrand" />

            <Skeleton width="100%" variant="display" tone="onBrand" />

            <Skeleton width={120} variant="caption" tone="onBrand" />
          </Stack>
        </HeaderBackground>
      </Stack>
    ),
  },
  {
    name: 'HeaderBackground',
    render: function HeaderBackgroundSection() {
      const homeHeader = useHomeHeaderLayout();
      const [offline, setOffline] = useState(false);

      return (
        <Stack gap="sm">
          <Text variant="subhead" tone="muted">
            Sized by its content, padding lg
          </Text>

          <HeaderBackground>
            <Stack padding="lg" gap="xs">
              <Text variant="subhead" tone="onBrand">
                Spent in November so far
              </Text>

              <Text variant="display" tone="onBrand">
                €84.60
              </Text>
            </Stack>
          </HeaderBackground>

          <Text variant="subhead" tone="muted">
            insetTop: the content starts below the status bar (on a screen, the header sits at the
            very top)
          </Text>

          <HeaderBackground insetTop>
            <Stack padding="lg" gap="xs">
              <Text variant="subhead" tone="onBrand">
                Spent in November so far
              </Text>

              <Text variant="display" tone="onBrand">
                €84.60
              </Text>
            </Stack>
          </HeaderBackground>

          <Text variant="subhead" tone="muted">
            {`Home: minHeight from useHomeHeaderLayout (the splash lands on it), insetTop, overlapped (the content stops above the card that overlaps it) and noticeShown: turn Offline on and the content slides down to make room for the pill. Offline: ${offline ? 'on' : 'off'}`}
          </Text>

          <Section>
            <ListRow title="Offline" trailing={{ type: 'switch', value: offline, onValueChange: setOffline }} />
          </Section>

          <View>
            <HeaderBackground minHeight={homeHeader.height} insetTop noticeShown={offline} overlapped>
              <Stack paddingHorizontal="lg" gap="xxs">
                <Stack direction="row" justify="between" gap="sm">
                  <PickerChip label="Acme · Production" onPress={noop} />

                  <SegmentedControl options={RANGES} value="6M" onChange={noop} tone="onBrand" />
                </Stack>

                <SpendingSummary
                  label="Spent in November so far"
                  amount="€84.60"
                  comparison={{ title: 'October', value: '€141.20' }}
                  scope="All projects in Acme"
                />

                <LineChart
                  points={SIX_MONTHS}
                  unfinishedLast
                  projection={DEMO_PROJECTION}
                  selectedIndex={null}
                  onSelect={noop}
                  size="header"
                />
              </Stack>
            </HeaderBackground>

            {offline ? (
              <FloatingNotice>
                <Pill tone="inverse" icon="wifi-off" label="You're offline · showing data from 10:42" />
              </FloatingNotice>
            ) : null}

            <Stack paddingHorizontal="md" overlapHeader>
              <Card raised>
                <Text variant="headline">November by product</Text>
              </Card>
            </Stack>
          </View>

          <Text variant="subhead" tone="muted">
            fill, insetBottom and dots (a full-screen header, with square bottom corners and Welcome&apos;s
            dot grid) are shown in the Welcome preview of the Screen section. On wide screens the content is
            centred at 560 pt
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'LineChart',
    render: function LineChartSection() {
      const [sixMonths, setSixMonths] = useState<number | null>(null);
      const [twelveMonths, setTwelveMonths] = useState<number | null>(9);
      const [run, setRun] = useState(0);
      const now = sixMonths === null || sixMonths === SIX_MONTHS.length - 1;

      return (
        <Stack gap="sm">
          <Text variant="subhead" tone="muted">
            {"Home (size header): 6 months, this month still running (dotted, pulsing), with its projection while it's the one shown. Tap or drag to pick a month: the line doesn't move when the projection hides."}
          </Text>

          <HeaderBackground>
            <Stack key={run} padding="lg">
              <LineChart
                points={SIX_MONTHS}
                unfinishedLast
                projection={DEMO_PROJECTION}
                projectionVisible={now}
                selectedIndex={sixMonths}
                onSelect={setSixMonths}
                size="header"
              />
            </Stack>
          </HeaderBackground>

          <Text variant="subhead" tone="muted">
            Billing (size large): 12 months with initials, September selected
          </Text>

          <HeaderBackground>
            <Stack key={run} padding="lg">
              <LineChart
                points={TWELVE_MONTHS}
                unfinishedLast
                projection={null}
                selectedIndex={twelveMonths}
                onSelect={setTwelveMonths}
                size="large"
              />
            </Stack>
          </HeaderBackground>

          <Text variant="subhead" tone="muted">
            A new organization: every month at €0.00 is a flat line, 32 pt above the bottom, with the fill under it
          </Text>

          <HeaderBackground>
            <Stack key={run} padding="lg">
              <LineChart
                points={NO_SPENDING}
                unfinishedLast
                projection={null}
                selectedIndex={null}
                onSelect={noop}
                size="header"
              />
            </Stack>
          </HeaderBackground>

          <Text variant="subhead" tone="muted">
            Loading: soft white placeholders exactly as high as the chart, so nothing jumps when the months arrive
          </Text>

          <HeaderBackground>
            <Stack padding="lg">
              <LineChart
                points={[]}
                unfinishedLast
                projection={null}
                selectedIndex={null}
                onSelect={noop}
                size="header"
                loading
              />
            </Stack>
          </HeaderBackground>

          <Stack direction="row">
            <Button label="Replay" size="sm" variant="secondary" onPress={() => setRun(run + 1)} />
          </Stack>

          <Text variant="caption" tone="muted">
            The line draws itself, then the fill rises and the dots appear. With Reduce Motion everything shows at once and nothing pulses. Screen readers hear one adjustable chart: swipe up or down to move between months.
          </Text>
        </Stack>
      );
    },
  },
  ...HOME_SECTIONS,
  ...FORMS_SECTIONS,
  ...PRODUCT_SECTIONS,
  {
    name: 'FloatingTabBar',
    render: function FloatingTabBarSection() {
      const insets = useSafeAreaInsets();
      const [activeKey, setActiveKey] = useState<string>('home');
      const [entrance, setEntrance] = useState<SplashEntranceState>('shown');
      const [run, setRun] = useState(0);

      // The splash "leaves" a moment after Replay
      useEffect(() => {
        if (entrance !== 'hidden') {
          return;
        }

        const leave = setTimeout(() => setEntrance('enter'), DEMO_WAIT_MS);

        return () => clearTimeout(leave);
      }, [entrance, run]);

      return (
        <Stack gap="sm">
          <View style={[styles.clipped, { height: tabBarLayout(insets.bottom).clearance }]}>
            <FloatingTabBar key={run} items={TABS} activeKey={activeKey} onSelect={setActiveKey} entrance={entrance} />
          </View>

          <Stack direction="row" gap="xs">
            <Button
              label="Replay the entrance"
              size="sm"
              fill
              variant="secondary"
              onPress={() => {
                setEntrance('hidden');
                setRun(run + 1);
              }}
            />
          </Stack>

          <Text variant="caption" tone="muted">
            {"A compact capsule, as wide as its four tabs (282 × 54), centred on a phone and on an iPad. Tap a tab: its wide capsule (68 × 44, 4 pt inside the bar) jumps there, with no motion; its icon takes the active colour, the others stay muted. Each slot is the touch area."}
          </Text>

          <Text variant="caption" tone="muted">
            {"entrance: at start-up it waits below the screen under the splash, then slides up with Home's cards as the splash leaves. Opened later, it's simply there. With Reduce Motion it doesn't slide."}
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'FloatingNotice',
    render: function FloatingNoticeSection() {
      const { colors, radii } = useTheme();
      const frame = [styles.screenFrame, { borderColor: colors.divider, borderRadius: radii.lg }];

      return (
        <Stack gap="sm">
          <Text variant="subhead" tone="muted">
            Over the purple header
          </Text>

          <View style={frame}>
            <Screen scroll={false} withTabBar={false} topInset="none" padded={false}>
              <HeaderBackground insetTop>
                <Stack paddingHorizontal="lg" paddingVertical="xxl">
                  <Text variant="headline" tone="onBrand">
                    Header under the status bar
                  </Text>
                </Stack>
              </HeaderBackground>

              <FloatingNotice>
                <Pill tone="inverse" icon="wifi-off" label="You're offline" />
              </FloatingNotice>
            </Screen>
          </View>

          <Text variant="subhead" tone="muted">
            Over the plain page
          </Text>

          <View style={frame}>
            <Screen scroll={false} withTabBar={false}>
              <Text variant="body">The notice floats above the content and takes no room.</Text>

              <FloatingNotice>
                <Pill tone="success" icon="check" label="Back online" />
              </FloatingNotice>
            </Screen>
          </View>
        </Stack>
      );
    },
  },
  {
    name: 'Overlay',
    render: function OverlaySection() {
      const { colors, radii } = useTheme();
      const frame = [styles.screenFrame, { borderColor: colors.divider, borderRadius: radii.lg }];

      return (
        <Stack gap="sm">
          <Text variant="subhead" tone="muted">
            Dimmed, with a card in the middle
          </Text>

          <View style={frame}>
            <Screen scroll={false} withTabBar={false}>
              <Text variant="body">The screen behind the prompt.</Text>

              <Overlay visible>
                <Card>
                  <Stack gap="sm">
                    <Text variant="headline">Use Face ID to unlock?</Text>

                    <Button label="Use it" size="md" onPress={noop} />
                  </Stack>
                </Card>
              </Overlay>
            </Screen>
          </View>

          <Text variant="subhead" tone="muted">
            Not dimmed, the content fills the screen. It announces its title, which is also on screen
          </Text>

          <View style={[styles.fullFrame, { borderColor: colors.divider, borderRadius: radii.lg }]}>
            <Overlay visible dimmed={false} announcement="Scaleway Manager is locked">
              <HeaderBackground fill insetTop insetBottom>
                <Stack grow justify="between" padding="lg">
                  <Stack gap="lg">
                    <LogoMark size={sizes.logoHero} />

                    <Text variant="title" tone="onBrand" accessibilityRole="header">
                      Scaleway Manager is locked
                    </Text>
                  </Stack>

                  <Button label="Unlock" size="md" variant="onBrand" onPress={noop} />
                </Stack>
              </HeaderBackground>
            </Overlay>
          </View>
        </Stack>
      );
    },
  },
  {
    name: 'ScreenReaderShield',
    render: function ScreenReaderShieldSection() {
      const [hidden, setHidden] = useState(false);

      return (
        <Stack gap="sm">
          <Section>
            <ListRow
              title="Hide from screen readers"
              trailing={{ type: 'switch', value: hidden, onValueChange: setHidden }}
            />
          </Section>

          <ScreenReaderShield hidden={hidden}>
            <Card>
              <Text variant="body">
                {hidden
                  ? 'Hidden: VoiceOver and TalkBack skip this card.'
                  : 'Reachable: screen readers read this card.'}
              </Text>
            </Card>
          </ScreenReaderShield>
        </Stack>
      );
    },
  },
  {
    name: 'LogoMark',
    render: function LogoMarkSection() {
      const { colors, radii } = useTheme();

      return (
        <Stack gap="xs">
          <View
            style={[
              styles.logoStrip,
              { backgroundColor: colors.splashBackground, borderRadius: radii.lg },
            ]}
          >
            <LogoMark size={32} />

            <LogoMark size={sizes.logoHero} onTripleTap={noop} />

            <LogoMark size={96} />
          </View>

          <Text variant="caption" tone="muted">
            The middle logo has the optional hidden triple tap (three quick taps, Welcome uses it for the demo). It looks the same and screen readers skip it.
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'AnimatedSplash',
    render: function AnimatedSplashSection() {
      const { colors, radii } = useTheme();
      const { width, height } = useWindowDimensions();
      const insets = useSafeAreaInsets();
      const homeHeader = useHomeHeaderLayout();
      const [phase, setPhase] = useState<'waiting' | 'leaving'>('waiting');
      const [run, setRun] = useState(0);
      const [toWelcome, setToWelcome] = useState(false);
      // Off: Welcome never said where its logo is, so the logo fades out instead of gliding
      const [knowsPlace, setKnowsPlace] = useState(true);
      // Where Welcome's logo sits: below the status bar, inside its padding
      const welcomeLogo = {
        x: spacing.lg,
        y: insets.top + spacing.lg + spacing.xl,
        width: sizes.logoHero,
        height: (sizes.logoHero * 233) / 198,
      };
      const replay = () => {
        setPhase('waiting');
        setRun(run + 1);
      };

      return (
        <Stack gap="sm">
          <View
            style={[
              styles.centred,
              {
                width: width * SPLASH_PREVIEW_SCALE,
                height: height * SPLASH_PREVIEW_SCALE,
                borderRadius: radii.lg,
                backgroundColor: colors.background,
              },
            ]}
          >
            <View style={[styles.scaledPhone, { width, height }]}>
              {toWelcome ? (
                <HeaderBackground fill insetTop insetBottom />
              ) : (
                <HeaderBackground minHeight={homeHeader.height} insetTop />
              )}

              <AnimatedSplash
                key={run}
                phase={phase}
                target={toWelcome ? 'screen' : 'header'}
                headerHeight={homeHeader.height}
                logoTarget={toWelcome && knowsPlace ? welcomeLogo : undefined}
                onFinished={noop}
              />
            </View>
          </View>

          <Section>
            <ListRow
              title="Lands on Welcome"
              trailing={{
                type: 'switch',
                value: toWelcome,
                onValueChange: (next) => {
                  setToWelcome(next);
                  replay();
                },
              }}
            />

            {toWelcome ? (
              <ListRow
                title="Knows where Welcome's logo is"
                trailing={{
                  type: 'switch',
                  value: knowsPlace,
                  onValueChange: (next) => {
                    setKnowsPlace(next);
                    replay();
                  },
                }}
              />
            ) : null}
          </Section>

          <Stack direction="row" gap="xs">
            <Button label="Hand over" size="sm" fill onPress={() => setPhase('leaving')} />

            <Button label="Replay" size="sm" fill variant="secondary" onPress={replay} />
          </Stack>

          <Text variant="caption" tone="muted">
            {"The logo rises and the name writes itself in, then it holds. Hand over: the purple shrinks into Home's header, or (Lands on Welcome) the logo glides into Welcome's logo spot. Without that spot, the logo glides up and fades instead. The purple left behind stands in for the screen it lands on."}
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'AnimatedSplashEntrance',
    render: function AnimatedSplashEntranceSection() {
      const [state, setState] = useState<SplashEntranceState>('hidden');
      const [run, setRun] = useState(0);

      return (
        <Stack gap="sm">
          <HeaderBackground>
            <Stack key={run} gap="xs" padding="lg">
              <AnimatedSplashEntrance state={state} order="first">
                <Text variant="title" tone="onBrand">
                  Scaleway Manager
                </Text>
              </AnimatedSplashEntrance>

              <AnimatedSplashEntrance state={state} order="second">
                <Text variant="body" tone="onBrand">
                  Check on your Scaleway cloud from your phone.
                </Text>
              </AnimatedSplashEntrance>

              <AnimatedSplashEntrance state={state} order="third">
                <Button label="Log in with Scaleway" size="md" variant="onBrand" onPress={noop} />
              </AnimatedSplashEntrance>
            </Stack>
          </HeaderBackground>

          <Stack direction="row" gap="xs">
            <Button label="Play" size="sm" fill onPress={() => setState('enter')} />

            <Button label="Show at once" size="sm" fill variant="secondary" onPress={() => setState('shown')} />

            <Button
              label="Replay"
              size="sm"
              fill
              variant="secondary"
              onPress={() => {
                setState('hidden');
                setRun(run + 1);
              }}
            />
          </Stack>

          <Text variant="caption" tone="muted">
            {"Welcome's and the lock screen's content, and Home's cards: hidden under the splash, then each block fades and rises in, one after the other, as the splash leaves (Play). Without a splash it shows at once (Show at once). With Reduce Motion it always shows at once."}
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'AnimatedSplashLogoSlot',
    render: function AnimatedSplashLogoSlotSection() {
      const { colors, radii } = useTheme();
      const [hidden, setHidden] = useState(false);
      const [place, setPlace] = useState<WindowRect | null>(null);

      return (
        <Stack gap="sm">
          <View style={[styles.logoStrip, { backgroundColor: colors.splashBackground, borderRadius: radii.lg }]}>
            <AnimatedSplashLogoSlot hidden={hidden} onPlace={setPlace}>
              <LogoMark size={sizes.logoHero} />
            </AnimatedSplashLogoSlot>
          </View>

          <Section>
            <ListRow title="Hidden" trailing={{ type: 'switch', value: hidden, onValueChange: setHidden }} />
          </Section>

          <Text variant="caption" tone="muted">
            {place === null
              ? 'Not laid out yet.'
              : `Laid out at x ${Math.round(place.x)}, y ${Math.round(place.y)}, ${Math.round(place.width)} × ${Math.round(place.height)} pt. On Welcome and the lock screen, the splash's logo glides to this place, and this logo stays hidden until the splash is gone.`}
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'StatusBar',
    render: function StatusBarSection() {
      const [onBrand, setOnBrand] = useState(false);

      return (
        <Stack gap="sm">
          <Text variant="subhead" tone="muted">
            {"The phone's clock and icons at the very top. Light on purple; otherwise it follows the theme. The app draws only one, in the root layout; this demo takes over while the gallery is open."}
          </Text>

          <Section>
            <ListRow
              title="On purple"
              trailing={{ type: 'switch', value: onBrand, onValueChange: setOnBrand }}
            />
          </Section>

          <StatusBar onBrand={onBrand} />
        </Stack>
      );
    },
  },
];

// A product's resources, for the Screen rows sample
const GALLERY_SERVERS = [
  { title: 'web-prod-1', subtitle: 'PRO2-S · fr-par-1', status: { label: 'Running', health: 'ok', pinned: true } },
  { title: 'api-prod-2', subtitle: 'GP1-XS · nl-ams-1', status: { label: 'Rebooting…', health: 'busy' } },
  { title: 'worker-1', subtitle: 'DEV1-M · pl-waw-1', status: { label: 'Standby', health: 'stopped' } },
] as const;

const styles = StyleSheet.create({
  chip: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs },
  logoStrip: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xl, padding: spacing.lg },
  // Tall enough for the lock screen preview (insets, padding, logo, title and button)
  fullFrame: { height: 360, borderWidth: 1, overflow: 'hidden' },
  // Grows with its content; overflow only clips the rounded corners
  screenFrame: { minHeight: 180, borderWidth: 1, overflow: 'hidden' },
  centred: { alignSelf: 'center', overflow: 'hidden' },
  // The tab bar slides in from below this edge
  clipped: { overflow: 'hidden' },
  // Too narrow for its sample, so shrinkToFit shows
  narrow: { width: 160 },
  // Short enough that its content scrolls inside it
  scrollFrame: { height: 220 },
  scaledPhone: { transform: [{ scale: SPLASH_PREVIEW_SCALE }], transformOrigin: 'top left' },
});
