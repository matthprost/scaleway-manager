import { useState } from 'react';
import type { ComponentProps } from 'react';

import { AlertRow } from '../components/AlertRow';
import { BreakdownBar } from '../components/BreakdownBar';
import { Card } from '../components/Card';
import { Carousel } from '../components/Carousel';
import { HeaderBackground } from '../components/HeaderBackground';
import { NoticeCard } from '../components/NoticeCard';
import { PickerChip } from '../components/PickerChip';
import { ResourceCard } from '../components/ResourceCard';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { SpendingSummary } from '../components/SpendingSummary';
import { Stack } from '../components/Stack';
import { StatusLine } from '../components/StatusLine';
import { Text } from '../components/Text';
import { sizes } from '../tokens';
import type { GallerySection } from './sections';

// The pieces of Home's header, cards and sections, and their sample data.

const noop = () => {};

// Short labels, said in full to screen readers
export const RANGES = [
  { key: '6M', label: '6M', accessibilityLabel: '6 months' },
  { key: '12M', label: '12M', accessibilityLabel: '12 months' },
] as const;
type Range = (typeof RANGES)[number]['key'];

// Billing's breakdown switch: longer words, which share the width at the largest text sizes
const VIEWS = [
  { key: 'products', label: 'Products' },
  { key: 'projects', label: 'Projects' },
] as const;
type View = (typeof VIEWS)[number]['key'];

const BY_PRODUCT = [
  { label: 'Instances', value: 4630, formatted: '€46.30' },
  { label: 'Kubernetes', value: 2110, formatted: '€21.10' },
  { label: 'Databases', value: 1120, formatted: '€11.20' },
  { label: 'Other', value: 600, formatted: '€6.00' },
];

// One card per product, every health, a pin and a name too long for the card (Live resources order)
const RESOURCES: readonly Omit<Extract<ComponentProps<typeof ResourceCard>, { title: string }>, 'onPress' | 'loading'>[] = [
  {
    product: 'instances',
    title: 'web-prod-1',
    subtitle: 'Instance · Ubuntu',
    meta: 'fr-par-1 · 51.15.12.34',
    statusLabel: 'Running',
    health: 'ok',
    pinned: true,
  },
  {
    product: 'containers',
    title: 'frontend',
    subtitle: 'Serverless container',
    meta: 'fr-par · 2 errors',
    statusLabel: 'Error',
    health: 'error',
  },
  {
    product: 'databases',
    title: 'db-main',
    subtitle: 'PostgreSQL',
    meta: 'fr-par · CPU 92%',
    statusLabel: 'Warning',
    health: 'warning',
  },
  {
    product: 'instances',
    title: 'scw-nervous-bardeen',
    subtitle: 'Instance · Windows Server 2022',
    meta: 'fr-par-2 · 163.172.168.100',
    statusLabel: 'Rebooting',
    health: 'busy',
  },
  {
    product: 'kubernetes',
    title: 'k8s-main',
    subtitle: 'Kubernetes',
    meta: 'fr-par · 3/3 nodes ready',
    statusLabel: 'Healthy',
    health: 'ok',
  },
  {
    product: 'elastic-metal',
    title: 'bm-storage-1',
    subtitle: 'Elastic Metal · EM-A115X',
    meta: 'fr-par-2 · 51.159.24.7',
    statusLabel: 'Running',
    health: 'ok',
  },
  {
    product: 'functions',
    title: 'resize-images',
    subtitle: 'Serverless function',
    meta: 'nl-ams · Node 22',
    statusLabel: 'Ready',
    health: 'ok',
  },
  {
    product: 'jobs',
    title: 'nightly-backup',
    subtitle: 'Serverless job',
    meta: 'fr-par · Last run 03:00',
    statusLabel: 'Succeeded',
    health: 'ok',
  },
  {
    product: 'load-balancers',
    title: 'lb-front',
    subtitle: 'Load balancer',
    meta: 'fr-par-1 · 2 backends',
    statusLabel: 'Ready',
    health: 'ok',
  },
  {
    product: 'instances',
    title: 'worker-1',
    subtitle: 'Instance · Ubuntu',
    meta: 'fr-par-2 · 10.0.0.12',
    statusLabel: 'Stopped',
    health: 'stopped',
  },
];

export const HOME_SECTIONS: readonly GallerySection[] = [
  {
    name: 'PickerChip',
    render: function PickerChipSection() {
      const [staging, setStaging] = useState(false);
      const [range, setRange] = useState<Range>('6M');

      return (
        <Stack gap="sm">
          <Text variant="subhead" tone="muted">
            On the header, next to the 6M / 12M switch: a row with no align, so both stretch to the same height.
            Tap it: here it switches the project, in the app it opens the picker.
          </Text>

          <HeaderBackground>
            <Stack padding="lg" gap="md">
              <Stack direction="row" justify="between" gap="sm">
                <PickerChip label={staging ? 'Acme · Staging' : 'Acme · Production'} onPress={() => setStaging(!staging)} />

                <SegmentedControl options={RANGES} value={range} onChange={setRange} tone="onBrand" />
              </Stack>

              <Stack direction="row" justify="between" gap="sm">
                <PickerChip label="Acme International Holdings · Production Europe" onPress={noop} />

                <SegmentedControl options={RANGES} value={range} onChange={setRange} tone="onBrand" />
              </Stack>
            </Stack>
          </HeaderBackground>

          <Text variant="caption" tone="muted">
            A long name wraps inside the chip instead of pushing the switch off the screen. The chip looks 28 high and is 44 to tap.
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'SegmentedControl',
    render: function SegmentedControlSection() {
      const [onPurple, setOnPurple] = useState<Range>('6M');
      const [onPage, setOnPage] = useState<Range>('12M');
      const [view, setView] = useState<View>('products');

      return (
        <Stack gap="sm">
          <Text variant="subhead" tone="muted">
            tone onBrand, on the header: a see-through white track, the picked one a white pill with a bold purple label
          </Text>

          <HeaderBackground>
            <Stack padding="lg" align="end">
              <SegmentedControl
                options={RANGES}
                value={onPurple}
                onChange={setOnPurple}
                tone="onBrand"
                accessibilityLabel="Range"
              />
            </Stack>
          </HeaderBackground>

          <Text variant="subhead" tone="muted">
            tone default, straight in a card: a grey track, the picked one a white pill with a bold label. It keeps
            its own width; it doesn&apos;t stretch across the card
          </Text>

          <Card>
            <SegmentedControl options={RANGES} value={onPage} onChange={setOnPage} accessibilityLabel="Range" />
          </Card>

          <Text variant="subhead" tone="muted">
            Billing&apos;s Products | Projects, on its &quot;by product&quot; card (&quot;Breakdown: Products&quot;).
            At the two largest text sizes its words are wider than the card: the choices share the width and a word
            may break inside itself
          </Text>

          <Card>
            <SegmentedControl options={VIEWS} value={view} onChange={setView} accessibilityLabel="Breakdown" />
          </Card>

          <Text variant="caption" tone="muted">
            With two choices it is a toggle: tap anywhere on it and the white pill slides to the other side. It is at
            least 44 high to tap. Screen readers hear one button (&quot;Range: 6 months&quot;, hint &quot;Double-tap
            to show 12 months&quot;). With three choices it is a tab list, each choice a tab.
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'BreakdownBar',
    render: () => (
      <Stack gap="sm">
        <Card raised>
          <Stack gap="sm">
            <Text variant="headline">November by product</Text>

            <BreakdownBar segments={BY_PRODUCT} />
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="headline">Two products</Text>

            <BreakdownBar segments={BY_PRODUCT.slice(0, 2)} />
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="headline">A product at €0.00</Text>

            <BreakdownBar
              segments={[
                { label: 'Instances', value: 4630, formatted: '€46.30' },
                { label: 'Other', value: 0, formatted: '€0.00' },
              ]}
            />
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="headline">Two parts with the same label</Text>

            <BreakdownBar
              segments={[
                { label: 'Unknown project', value: 6000, formatted: '€60.00' },
                { label: 'Production', value: 2000, formatted: '€20.00' },
                { label: 'Unknown project', value: 460, formatted: '€4.60' },
              ]}
            />
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="headline">Nothing spent yet</Text>

            <BreakdownBar segments={[]} />
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="headline">loading</Text>

            <BreakdownBar segments={[]} loading />
          </Stack>
        </Card>

        <Text variant="caption" tone="muted">
          At most 4 segments (the three biggest, then Other), in the series colours. A part at €0.00 keeps its
          legend row but takes no room in the bar. Two parts may share a label (two projects this user can&apos;t
          see): each keeps its own part and row. The bar is a hint; the legend says it in words. While
          loading: placeholders in its own shape (the bar, then four legend lines), so the card doesn&apos;t grow when
          the amounts arrive.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'SpendingSummary',
    render: () => (
      <Stack gap="sm">
        <HeaderBackground>
          <Stack padding="lg">
            <SpendingSummary
              label="Spent in November so far"
              amount="€84.60"
              comparison={{ title: 'October', value: '€141.20' }}
              scope="All projects in Acme"
            />
          </Stack>
        </HeaderBackground>

        <HeaderBackground>
          <Stack padding="lg">
            <SpendingSummary
              label="Spent in September"
              amount="€118.60"
              comparison={{ title: 'vs August', value: '+19%' }}
              scope="All projects in Acme"
            />
          </Stack>
        </HeaderBackground>

        <HeaderBackground>
          <Stack padding="lg">
            <SpendingSummary
              label="Spent in March"
              amount="€12,345.67"
              comparison={{ title: 'vs February', value: '—', valueLabel: 'Nothing to compare' }}
              scope="All projects in Acme"
            />
          </Stack>
        </HeaderBackground>

        <HeaderBackground>
          <Stack padding="lg">
            <SpendingSummary label="Spent in November so far" amount={null} comparison={null} scope={null} />
          </Stack>
        </HeaderBackground>

        <Text variant="caption" tone="muted">
          The label, the amount with its comparison at the end of its row (it drops under the amount when the line is
          full, and always at accessibility text sizes), then who it covers. The amount stays on one line and shrinks
          only when it doesn&apos;t fit. A sign (—) is said in words. Loading: placeholders in the same shapes.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'AlertRow',
    render: () => (
      <Stack gap="sm">
        <AlertRow title="High CPU on db-main" detail="CPU above 90% for 12 minutes" />

        <AlertRow title="Disk almost full on db-main" detail="fr-par · 85% used" tone="warning" />

        <AlertRow
          title="Memory above the limit on every node of k8s-main"
          detail="The cluster may slow down until the load drops or more nodes are added"
        />

        <AlertRow
          title="Upgrade available"
          detail="A newer Kubernetes version is available. Upgrade from the Scaleway console."
          tone="info"
        />

        <Text variant="caption" tone="muted">
          Screen readers hear &quot;Alert&quot; (or &quot;Warning&quot;, or &quot;Note&quot;) first, then the title and
          the detail. info: a note about a resource on its screen, calmer than a warning.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'StatusLine',
    render: () => (
      <Stack gap="sm">
        <StatusLine label="All Scaleway services running normally" />

        <Text variant="caption" tone="muted">
          One slim line when all is well. A problem shows as a NoticeCard instead.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'NoticeCard',
    render: () => (
      <Stack gap="sm">
        <NoticeCard
          title="Slower block storage in fr-par-1"
          message="We're looking into slower reads and writes on some volumes."
          meta="Minor issue · Investigating · Block Storage, fr-par-1"
          tone="warning"
          onPress={noop}
        />

        <NoticeCard title="Instances unavailable" meta="Major outage · Instances, nl-ams-1" tone="danger" onPress={noop} />

        <Text variant="caption" tone="muted">
          The meta always starts with how serious it is, in words: the dot&apos;s colour only repeats it. It opens the
          incident&apos;s page in the browser: the external mark, and screen readers hear &quot;Opens in your
          browser&quot;.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'ResourceCard',
    // Direct children of the gallery's padded column, as on a screen
    render: () => (
      <>
        <SectionHeader title="Live resources" action={{ label: 'See all', onPress: noop }} />

        <Carousel itemWidth={sizes.resourceCard}>
          {RESOURCES.map((resource) => (
            <ResourceCard key={resource.title} {...resource} onPress={noop} />
          ))}
        </Carousel>

        <Text variant="caption" tone="muted">
          One tile colour and icon per product; every health (the status word is a Pill in the health colour, the dot
          repeats it); a pinned resource shows a filled star; a long name is cut with &quot;…&quot;. Every card is
          as tall as the tallest, with Status lined up at the bottom. No switch: tap the card to open the resource.
        </Text>

        <Carousel itemWidth={sizes.resourceCard}>
          {['first', 'second', 'third'].map((key) => (
            <ResourceCard key={key} loading />
          ))}
        </Carousel>

        <Text variant="caption" tone="muted">
          loading: the card&apos;s own shape (the tile, three lines, the divider, Status and a pill) while the resources
          load. Nothing to press, and screen readers skip it.
        </Text>
      </>
    ),
  },
  {
    name: 'Carousel',
    // Direct children of the gallery's padded column, as on a screen
    render: () => (
      <>
        <Text variant="subhead" tone="muted">
          gap sm (the default): stops on a card, and runs to the screen edges. The cards use Card grow, so they are as
          tall as the tallest
        </Text>

        <Carousel itemWidth={sizes.resourceCard}>
          {['One', 'Two, with a few more words that wrap', 'Three', 'Four'].map((name) => (
            <Card key={name} grow>
              <Text variant="body">{name}</Text>
            </Card>
          ))}
        </Carousel>

        <Text variant="subhead" tone="muted">
          gap md
        </Text>

        <Carousel itemWidth={sizes.resourceCard} gap="md">
          {['One', 'Two', 'Three', 'Four'].map((name) => (
            <Card key={name} grow>
              <Text variant="body">{name}</Text>
            </Card>
          ))}
        </Carousel>

        <Text variant="caption" tone="muted">
          Items are 150 wide at the default text size and grow with it, up to the width of the content.
        </Text>
      </>
    ),
  },
  {
    name: 'SectionHeader',
    // Direct children of the gallery's padded column, as on a screen
    render: () => (
      <>
        <SectionHeader title="Live resources" action={{ label: 'See all', onPress: noop }} />

        <Card>
          <Text variant="body">{'"See all ›" ends at this card\'s right edge.'}</Text>
        </Card>

        <SectionHeader title="Invoices" />

        <Card raised>
          <SectionHeader title="September by product" action={{ label: 'Back to now', onPress: noop, chevron: false }} />

          <Text variant="body">
            {'chevron false: an action that stays on the screen. In a card, "Back to now" ends at the card\'s content edge, and the row is as high without it.'}
          </Text>
        </Card>
      </>
    ),
  },
];
