# Scaleway Manager design system

This is the design "bible". Every screen of the app follows it. If a screen and this page disagree, the screen is wrong. If this page is wrong, fix this page first (with the owner's OK), then the code.

- **The code:** `packages/ui` (`@scaleway-manager/ui`). `src/tokens/` holds every colour and size (and the contrast maths), `src/theme/` the light and dark themes, `src/components/` the building blocks, `src/charts/` the spending chart and its maths, `src/layout/` the layout maths (where the tab bar and the offline pill sit, how tall Home's header is), `src/gallery/` the gallery.
- **The gallery:** a hidden screen, in development builds only, that shows every building block in light and dark. Open it with `xcrun simctl openurl booted scalewaymanager://gallery` (iOS Simulator) or `adb shell am start -a android.intent.action.VIEW -d scalewaymanager://gallery` (Android emulator). In a release build, the route just goes back to the start.
- **The reviewer:** the `design-reviewer` agent (`.claude/agents/design-reviewer.md`) checks every UI change against this page.
- **The mockups:** the approved mockups are not in the repo. This page holds every value taken from them (timings, sizes, colours).

**Contents:** 1. Principles · 2. Colour · 3. Typography · 4. Spacing · 5. Radii · 6. Elevation · 7. Motion · 8. Icons · 9. Components · 10. Patterns · 11. Copy · 12. Accessibility · 13. Rules · 14. How to add a component

---

## 1. Principles

1. **Bold brand.** A purple gradient header with rounded bottom corners, white rounded cards on a very light lavender-grey page, and one colour per product. The purple is the app's signature: the splash, the header, the main button and the active tab.
2. **Modern and pure.** Few elements, plenty of space, nothing that doesn't help. A screen answers "is everything OK?", "what changed?" or lets you take one quick, safe action. No grid lines, no borders where space does the job, one main (primary) button per screen.
3. **Motion only with meaning.** Things move only to explain what is happening: the chart drawing itself, the current month pulsing, the start-up splash handing over to the first screen, screen transitions, loading placeholders. Never for decoration.
4. **Reduce Motion is always respected.** When the phone's "Reduce Motion" setting is on, every animation becomes a plain fade of 250 ms or less, or doesn't play at all. No exceptions.
5. **Plain words.** Anyone should understand every word on screen without knowing cloud jargon (see [Copy](#11-copy)).
6. **Safe by default.** A stray tap never stops a server. Anything that stops, restarts or replaces something asks first and names the resource.
7. **One source of truth.** Every colour, size and building block lives in `packages/ui` and is described here. Screens only put the pieces together.

---

## 2. Colour

**How it works.** Components get their colours from the theme with `useTheme().colors`. The theme follows the phone's light or dark setting, unless the preference saved on Account says otherwise (Appearance: follow phone, light or dark). A new choice applies to the whole app at once: the root layout's `AppearanceProvider` holds it and feeds `ThemeProvider` (`useSetAppearance()` in `apps/mobile/src/features/appearance/`). Colour values (hex or `rgba`) exist **only** in `packages/ui/src/tokens/`; lint blocks them everywhere else. The one exception is `apps/mobile/app.config.ts` (native config can't use the theme). Today it holds three colours: the Android adaptive-icon background and the two native splash colours (`#4F0599` light, `#2B0961` dark). `apps/mobile/app.config.test.ts` checks them against the theme tokens, so they can't drift from `AnimatedSplash`.

### Theme colours

Both themes always have exactly the same names (a test checks it).

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `background` | `#F6F5FA` | `#0E0C14` | The page behind everything (`Screen`, and the inside of a `Sheet`). |
| `surface` | `#FFFFFF` (white) | `#1A1724` | Cards, sections, the secondary button, the box of a `TextField`. |
| `text` | `#14121A` (ink) | `#F2F0F7` | Main text and default icons. |
| `textMuted` | `#6B6878` | `#9A97A6` | Second-level text: subtitles, labels, amounts in a legend, row icons, a `TextField`'s placeholder, a `ListRow`'s spinner, a `MetricChart`'s title and scale captions, a `DetailHero`'s subtitle and `Pinned`. Also an on/off icon button that is off (the pin, `ScreenHeader action selected={false}`). |
| `divider` | `#EEECF3` | `#262233` | Thin lines between rows, the secondary button's border, Skeleton shapes on the page, the track of a `SegmentedControl` on the page, an empty `BreakdownBar`. |
| `brand` | `#4F0599` (purple500) | `#A47BFF` | Brand text and links (the `brand` tone), the labels of `secondary` and `ghost` buttons, a switch that is on, the filled pinned star (`ResourceCard`, a `ListRow` status, `DetailHero`), icon buttons (a `Sheet`'s Close, a `ScreenHeader`'s Back and action, a `ListRow`'s copy), the mark on a picked choice, a `TextField`'s border while you type, the pull-to-refresh spinner on the page, the icon of an `AlertRow tone="info"`, a `MetricChart`'s line, end dot and fill (from 18% to nothing). |
| `onBrand` | `#FFFFFF` (white) | `#FFFFFF` (white) | Text, icons and the logo on purple (the header, the splash, `ghostOnBrand` buttons, the `PickerChip`), and the white background of `onBrand` buttons and of the picked segment of a `SegmentedControl` on purple. |
| `primaryButton` | `#4F0599` (purple500) | `#7B54D9` (purple400) | The `primary` button's background, the label of the white `onBrand` button and of the picked segment on purple, and a busy resource (starting, stopping): its `brand` Pill and its status dot, in the same purple. Dark mode uses a deeper purple than `brand`, so white text on it stays readable. |
| `onPrimaryButton` | `#FFFFFF` (white) | `#FFFFFF` (white) | The `primary` button's label, icon and spinner. |
| `headerGradient` | `#3D0480` → `#4F0599` → `#6A1FD0` | `#22074F` → `#4A0A95` | The header (`HeaderBackground`) and the splash, from its intro on (it comes in over the flat `splashBackground` as the logo rises). Drawn at 165°. |
| `series` | 1 `#4F0599`, 2 `#8A5CF0`, 3 `#C4B0F5`, 4 `#E3DDF5` | 1 `#A47BFF`, 2 `#7B54D9` (purple400), 3 `#4E3A86`, 4 `#342A55` | Product colours in charts and the breakdown bars ("by product", "by project", a project's products), in order: the three biggest, then "Other". |
| `alertBackground` | `#FFECEC` | `#2A1214` | Background of an alert (`AlertRow`, for example a firing monitoring alert). |
| `alertText` | `#B3261E` | `#FF8A80` | Alert text, error text and destructive rows (the `danger` text tone); the status dot of a resource in error; a `TextField`'s border and message when it has an error. |
| `warningBackground` | `#FFF3D6` | `#2A2210` | Background of a calmer alert (`AlertRow tone="warning"`), with `text` and `textMuted` on it. |
| `infoBackground` | `#F0E8FF` | `#33295A` | Background of a note to read (`AlertRow tone="info"`: an upgrade is available), with `text`, `textMuted` and a `brand` icon on it. The same values as `highlightBackground` and `tabActiveBackground`, kept apart because the role is different. |
| `success` | `#22B573` | `#3DD68C` | The status dot of something healthy ("Running", "Healthy"). Too light for white words: its Pill uses `successBadge`. |
| `warning` | `#F5A524` | `#F7B547` | The status dot of something that needs attention ("Needs attention", "Pending") and of a Scaleway incident. Its Pill uses `warningBadge`. |
| `neutral` | `#B9B6C4` | `#5E5A6E` | The status dot of something stopped ("Stopped", "Inactive"). Its Pill uses `neutralBadge`. |
| `successBadge` | `#137A4E` | `#137A4E` | The `success` Pill: "Running", "Healthy", "Back online". A darker shade of the `success` green, so its white words pass. |
| `warningBadge` | `#A15800` | `#A15800` | The `warning` Pill: "Needs attention", "Pending". A darker shade of the `warning` amber, so its white words pass. |
| `dangerBadge` | `#B3261E` | `#B3261E` | The `danger` Pill: "Error", "Failed". The red of light mode's `alertText`, in both themes. |
| `neutralBadge` | `#6B6878` | `#5E5A6E` | The `neutral` Pill: "Stopped", "Inactive". A darker grey than `neutral` in light mode; the same grey in dark mode. |
| `inverseBadge` | `#14121A` (ink) | `#4A4558` | The `inverse` Pill: the offline notice, the "Demo" badge, a `Toast`. Ink in light mode, a dark grey in dark mode, so its words are white in both. |
| `inverseBadgeEdge` | `#14121A` (ink) | `#8F8AA0` | The 1 pt edge of the `inverse` Pill. In dark mode a light grey, so the pill's shape shows on the page, on a card and on the purple header (at least 3:1 on each). In light mode it is the pill's own ink: no edge to see, nothing changes. |
| `onBadge` | `#FFFFFF` (white) | `#FFFFFF` (white) | The words and icon of every Pill (the `onBadge` tone): on the five badge colours above, and on `primaryButton` for the `brand` Pill. |
| `tabBarBackground` | `rgba(255,255,255,0.82)` | `rgba(32,28,44,0.82)` | The see-through floating tab bar, over a blur. |
| `tabBarBorder` | `rgba(20,18,26,0.06)` | `rgba(255,255,255,0.08)` | The tab bar's hairline border. |
| `tabActiveBackground` | `#F0E8FF` | `#33295A` | The wide capsule behind the active tab, filling its slot. |
| `tabActiveIcon` | `#4F0599` (purple500) | `#D9C8FF` | The active tab's icon. |
| `tabIdleIcon` | `#858293` | `#7D7A8C` | The other tabs' icons. |
| `splashBackground` | `#4F0599` (purple500) | `#2B0961` (purple900) | The first frame of `AnimatedSplash`. The native splash in `app.config.ts` uses the same two colours, checked by `app.config.test.ts`. |
| `chartFill` | `#FFFFFF` (white) | `#C9A8FF` | The gradient fill under the chart line, on the header. |
| `skeletonOnBrand` | `rgba(255,255,255,0.12)` | `rgba(255,255,255,0.12)` | Skeleton shapes on the purple header (`Skeleton tone="onBrand"`): a soft white, like the chart it stands for. |
| `controlOnBrand` | `rgba(255,255,255,0.16)` | `rgba(255,255,255,0.16)` | The see-through white of the controls on the purple header: the `PickerChip` and the track of `SegmentedControl tone="onBrand"`. The mockup has 16% for the chip and 14% for the track; one value keeps them alike. |
| `chartDotRing` | `#5A0FB0` | `#3A0A78` | The thin ring around the chart's white dots, which sets them apart from the white line. A deep purple in both themes, as in the approved mockup. |
| `fieldBorder` | `#8A8798` | `#6E6A80` | A `TextField`'s border at rest: a grey you can see (at least 3:1 on `surface` and on `background`), so the field shows where to type before you tap it. |
| `highlightBackground` | `#F0E8FF` | `#33295A` | A soft purple behind a value to look at closely: the box of a `SecretBox`, with `text` on it. The same values as `tabActiveBackground`, kept apart because the role is different. |
| `shadow` | `rgba(40,10,90,0.10)` | `rgba(0,0,0,0.5)` | The raised card's shadow (light mode only, see [Elevation](#6-elevation)). |
| `scrim` | `rgba(20,18,26,0.5)` | `rgba(0,0,0,0.6)` | The dimming behind an `Overlay` prompt. |

### Product colours (`products`)

One colour per product (principle 1): a soft tile and its icon, on a `ResourceCard`, a product's or resource's `ListRow` (`product`) and a `DetailHero`. The three draw the same tile (`sizes.productTile`, 30, radius `sm`, a `sm` icon; 44, radius `md`, a `md` icon in a `DetailHero`), so a product looks the same everywhere. `colors.products[product]` gives `{ tile, icon }`; `Icon product="…"` draws an icon in it. The keys are the same as core's products (the `Product` type, exported from the tokens). Light mode takes the approved mockup's colours where it shows them (the containers' green is a little darker, so the icon reaches 3:1); dark mode keeps the same hues, a deep tile and a light icon. Every icon is measured on its tile in [Contrast](#contrast-wcag-aa).

- **Easy to tell apart.** Each icon colour is at least 29 apart from every other product's (CIE Lab ΔE, where under about 25 looks "alike at a glance": 31.6 in light, 29.8 in dark). Load balancers are olive, not a second blue next to Kubernetes. In dark mode the databases icon is yellow, not the amber of the `warning` dot (ΔE 23.5, it was 4.2).
- **Close to a status colour on purpose.** In light mode a few products sit near a status colour, as in the mockup: databases' amber and `warning` (18.5), containers' green and `success` (16.6), elastic-metal's red and `alertText` (17.7). That's fine: a status always comes with its word (rule 11), so the colour never has to say it alone.
- **A product ui doesn't know yet** (core added one before ui got its colour): the tile is neutral (`background`) with the `layers` icon in `textMuted` (4.99 / 6.80), instead of crashing, in a `ResourceCard`, a `ListRow` and a `DetailHero` alike. `Icon product` falls back to its `tone`.

| Product | Icon (`Icon` name) | Light tile / icon | Dark tile / icon |
| --- | --- | --- | --- |
| `instances` | `server` | `#FFE9DE` / `#E95420` (orange) | `#3A2219` / `#FF8A5C` |
| `elastic-metal` | `server` | `#FBE3EC` / `#A80030` (red) | `#3A1A26` / `#FF7AA0` |
| `kubernetes` | `cube` | `#E6F0FF` / `#3F6ED8` (blue) | `#1C2A45` / `#7FA6FF` |
| `databases` | `database` | `#FFF3D6` / `#C77700` (amber) | `#3A2E14` / `#F2DD6E` (yellow) |
| `containers` | `box` | `#E8F8F2` / `#16996F` (green) | `#133229` / `#4FD1A5` |
| `functions` | `zap` | `#E0F4F8` / `#0B7C93` (teal) | `#12313A` / `#4FC8DE` |
| `jobs` | `play` | `#F9E6F5` / `#A3348F` (magenta) | `#36193A` / `#E07ACF` |
| `load-balancers` | `split` | `#EEF5DC` / `#5E7D12` (olive) | `#283214` / `#9CC94E` |

They are not the `series` colours: those rank the biggest products in a chart; these say which product a resource belongs to.

### Palette

The raw named colours the themes are built from (`palette.ts`). Components and screens use the theme colours above, never the palette directly.

| Name | Value |
| --- | --- |
| `purple400` | `#7B54D9` |
| `purple500` | `#4F0599` |
| `purple900` | `#2B0961` |
| `white` | `#FFFFFF` |
| `ink` | `#14121A` |

### Colour rules

- **Status colours never work alone. Never show a status dot without its text label.** A green, orange or grey dot or pill always comes with the word ("Running", "Stopped"). Some people can't tell the colours apart, and the dots are under 3:1 on light backgrounds (the grey one in dark mode too), so they must never be the only signal (see [Accessibility](#12-accessibility)).
- **Text on a colour uses its "on" partner:** `onBrand` on the header and the splash, `onPrimaryButton` on `primaryButton`, `onBadge` on every Pill colour. Components pick these for you through the text `tone`.
- **A badge has white words.** Every Pill draws white words (`onBadge`) on a colour dark enough for them, at least 4.5:1 in both themes: a darker shade of its status colour (`successBadge`, `warningBadge`, `dangerBadge`, `neutralBadge`), `inverseBadge` or the busy purple (`primaryButton`). The status dots keep their brighter colours: white words on them would fail (2.65:1 on the `success` green).
- **A new colour** goes into `ThemeColors` and into **both** `lightColors` and `darkColors` in `packages/ui/src/tokens/colors.ts`, with its contrast measured with `contrastRatio` and added to the table in [Accessibility](#12-accessibility), and a row in the table above.

---

## 3. Typography

The app uses the phone's own font (San Francisco on iOS, Roboto on Android). Every piece of text is a `Text` with one of these six variants. There are no other sizes, except the splash's name below.

| Variant | Size / line height | Weight | Letter spacing | Used for |
| --- | --- | --- | --- | --- |
| `display` | 34 / 40 | 700 (bold) | -1 | The one big number of a screen (spending this month). |
| `title` | 22 / 28 | 700 (bold) | -0.4 | Screen titles, empty-state titles, a big name on a detail screen, a project's amount in its Billing sheet. |
| `headline` | 16 / 22 | 600 (semibold) | | Card titles, button labels, a resource's name in a card. |
| `body` | 15 / 20 | 400 (regular) | | Row titles and values, paragraphs. |
| `subhead` | 13 / 18 | 400 (regular) | | Subtitles, second lines, small explanations. |
| `caption` | 11 / 14 | 500 (medium) | 0.2 | Section titles (shown in capitals by `Section`), pill labels, chart month labels. |

**The splash's name** (`brandTypography`, not `Text` variants: only `AnimatedSplash` uses them). The name "Scaleway Manager" written under the logo at start-up is part of the brand mark, drawn like the logo:

| Token | Size / line height | Weight | Letter spacing | Used for |
| --- | --- | --- | --- | --- |
| `splashName` | 40 / 48 | 700 (bold) | -0.6 | "Scaleway" |
| `splashNameLight` | 40 / 48 | 300 (light) | 4.3 | "MANAGER", in spaced capitals |

**The monospace font** (`Text mono`, `TextField monospace`): the phone's own (Menlo on iOS, `monospace` on Android, from `monoFont` in the tokens), at the variant's size. Only for things read character by character: keys, fingerprints, secrets. It is not a seventh variant: the size, line height and weight stay the variant's.

**Text tones** (the `tone` prop) set the colour: `default`, `muted`, `brand`, `danger`, `onBrand`, plus `primaryButton`, `onPrimaryButton` and `onBadge`, which only `packages/ui` components use (the labels of `Button` and the picked segment of a `SegmentedControl` on purple; the words of every `Pill`). See [Text](#text).

**Rules**

- Text follows the phone's text size setting (Dynamic Type on iOS, font size on Android). Never turn that off. Layouts must survive larger text: use minimum heights, never fixed heights, around text. Home's header is no exception: its `minHeight` comes from `homeHeaderLayout`, which counts each of its lines at the phone's text size, and it still grows if its words need more (a long organization name at a large text size), so nothing is ever cut. The splash lands on its real, measured height (see [HeaderBackground](#headerbackground) and [AnimatedSplash](#animatedsplash)).
- **Accessibility text sizes** start above `accessibilityTextScale` (1.4, in the tokens): iOS's accessibility sizes, AX1 and up (1.79 to 3.57 as React Native gives them; iOS's largest normal size is 1.35), and Android's 150% and up (its largest normal size is 130%). Things that sit side by side and would break mid-word there change layout instead: a confirmation's two buttons stack, primary first (`ConfirmSheet`); a resource's actions go one per row (`ActionGrid`). One accepted exception, the `SegmentedControl`, is below.
- **One named exception: the splash's name.** It's part of the logo, so it keeps its size whatever the text size setting, never bigger and never smaller (`allowFontScaling={false}`): at large sizes it would no longer fit the screen, and at small ones it would no longer match the logo. It's hidden from screen readers, like the logo, and only shows for about two seconds at start-up. Nothing else may do this.
- **A second named exception: the chart's labels.** `LineChart`'s month labels and its projection label must stay on one line, so they use `Text shrinkToFit`. They still grow with the text size like everything else; only when one no longer fits its room, at the largest sizes, does it shrink, just enough to fit, instead of being cut off with "…".
- **A third named exception: the big amount of a `SpendingSummary`.** A number is read as one piece, so at the largest text sizes, where `€84.60` no longer fits the width, it shrinks just enough to stay on one line instead of breaking mid-number ("€84.6" / "0"). It still grows with the text size up to that point. Nothing else uses `shrinkToFit`.
- **An accepted exception, until the owner confirms it: a word broken inside itself in a `SegmentedControl`.** When its words are wider than the room, its choices share the room and their words wrap, and a word longer than its half breaks inside itself. Today that only happens to Billing's **Products | Projects**, at the two largest accessibility sizes (AX4 and AX5): "Product" / "s". The other way would be one choice per line above `accessibilityTextScale`, a bigger change. 6M / 12M never wrap.
- Screen titles get `accessibilityRole="header"` so screen-reader users can jump between them.
- Amounts are written with the currency sign and two decimals: `€84.60`. All amounts exclude tax.

---

## 4. Spacing

All gaps, paddings and margins come from `spacing` (or `useTheme().spacing`). Screens pick them by name through `Stack` (`gap="md"`, `paddingHorizontal="md"`), never as numbers.

| Token | Value | Typical use |
| --- | --- | --- |
| `xxs` | 4 | Icon to label inside a pill; very tight stacks; the small padding above and below a button's label. |
| `xs` | 8 | Icon to label inside a button; a section title to its card; between side-by-side buttons. |
| `sm` | 12 | Between the parts of a row (icon, text, trailing item); between the lines of an empty state. |
| `md` | 16 | Screen side margins (`Screen` adds them); card padding (the default); between cards and sections on a screen (`Stack`'s default gap); side padding of a small button; the least space between the offline notice and the screen sides. |
| `lg` | 20 | Padding inside the purple header (`<Stack padding="lg">` inside `HeaderBackground`). |
| `xl` | 24 | Side padding of a medium button; padding around an empty state. |
| `xxl` | 32 | Between big groups on a long screen. |

### Fixed sizes (`sizes`)

| Token | Value | What it is |
| --- | --- | --- |
| `buttonMd` / `buttonSm` | 48 / 36 | Button heights, as a minimum (`size="md"` / `size="sm"`): at very large text sizes the pill grows so its label never spills out. Side by side (`fill`), both buttons grow to the taller one. A button alone keeps its own height: its pill never grows into the free space below it (in a column it still fills the width; a centred button in a scrolling page would otherwise stretch down the screen). |
| `listRowMin` | 52 | Minimum height of a `ListRow`. |
| `touchMin` | 44 | Minimum touch area of anything tappable. Every `Button` has a touch box at least this high (its visible pill sits centred in it); each tab of the tab bar is a 68 × 44 slot, its own touch area. Icon buttons (a `Sheet`'s Close, a `ScreenHeader`'s Back and action, a `ListRow`'s copy) are 44 × 44 boxes. Also the least height of a one-line `TextField`. |
| `iconSm` / `iconMd` / `iconLg` | 16 / 21 / 24 | Icon sizes. |
| `tabBarHeight` | 54 | Floating tab bar height: the active tab's 44 pt capsule, 4 pt (`xxs`) of padding and the 1 pt border, above and below. |
| `tabBarInset` | 36 | The least space between the tab bar and the screen's sides. The bar is as wide as its tabs, so only a very narrow window (an iPad split view) brings it this close; its slots then narrow, never under 44. |
| `tabBarMinBottom` | 18 | Lowest the tab bar sits on phones without a home indicator. |
| `tabItemWidth` / `tabItemHeight` | 68 / 44 | One tab's slot: its touch area, and the active tab's capsule, which fills it (from the owner's reference). Four tabs make the bar 282 wide (4 × 68, 4 pt of padding and the 1 pt border on each side), on a phone and on an iPad. |
| `contentMaxWidth` | 560 | Content is centred at this width on wide screens (iPad): a padded `Screen`, the content of a `HeaderBackground`, a `Stack contained`, the card of a dimmed `Overlay`, the offline notice. Purple backgrounds still reach the screen edges. |
| `logoHero` | 72 | The logo on Welcome and the lock screen (`<LogoMark size={sizes.logoHero} />`). |
| `logoSplash` | 96 | The splash's logo, and the privacy cover's: centred on the whole screen, like the splash's first frame (`<LogoMark size={sizes.logoSplash} />`). |
| `chartHeader` / `chartLarge` | 88 / 168 | The line's area of a `LineChart`: `size="header"` (Home) and `size="large"` (Billing). Its labels add one caption line above, then 4 pt and one caption line below (the caption lines grow with the text size), so at the default size the whole chart is 120 / 200 high (88 + 14 + 4 + 14). While loading, `LineChart loading` draws its own placeholders at that exact height. |
| `resourceCard` | 150 | A `ResourceCard`'s width in its `Carousel`, at the default text size (`<Carousel itemWidth={sizes.resourceCard}>`). The items grow with the text size, up to the width of the content. |
| `productTile` / `productTileLarge` | 30 / 44 | A product's icon tile (see [Product colours](#product-colours-products)): 30 in a `ResourceCard` and a `ListRow` (from the approved mockup), 44 in a `DetailHero`. |
| `chartMetric` | 72 | The line's area of a `MetricChart`, as a minimum: its scale captions grow with the text size and may make it taller. With its card's padding and the title row above it, the whole chart is 134 high at the default size (16 + 22 + 8 + 72 + 16). |
| `compactControl` | 28 | The visible height (a minimum) of the `PickerChip` and the `SegmentedControl`. Each sits in the middle of a 44 pt touch box. |
| `dot` | 7 | A status dot (`ResourceCard`, `StatusLine`, `NoticeCard`, `ListRow subtitleHealth`) and a legend dot (`BreakdownBar`). Always next to its words. |

**Home's header height** isn't a token: it grows with the text size, so `homeHeaderLayout(insetTop, fontScale)` (in `src/layout/`) works it out, and `useHomeHeaderLayout()` gives it for the phone it runs on. Online it's the mockup's layout, with no room kept for a pill that isn't there. From the top: the status bar (`insetTop`), the chip and 6M/12M row (`pickerChipHeight` / `segmentedControlHeight`: 44, or the chip's `subhead` line + 24 when that's taller), 12, the `SpendingSummary` (`spendingSummaryHeight`: the label, the amount with its comparison beside it, or under it at accessibility text sizes, and the organization line), 16, the chart (`lineChartHeight('header')`: `sizes.chartHeader` + 4 + two `caption` lines), then 28 under the overlapping card (`radii.xl`) and 16 above it. Each part's height comes from the component that draws it, so the sum follows them. On a phone with a 47 pt status bar at the default text size that's 355: about 27 pt above the mockup's 295 once its drawn 34 pt status bar is swapped for a real 47 pt one, for the 44 pt touch boxes of the chip and the switch and the organization line. Home's `HeaderBackground` takes it as its `minHeight` (a floor). While a notice floats over it (offline, the Demo badge), the content slides down by the notice's room and the header grows by that much (`HeaderBackground noticeShown`). The splash's first guess is this height; it lands on the header's measured height as soon as Home reports it (`Screen onHeaderHeight`), so it lands exactly, offline or with a long name too.

**Rule:** never type a spacing or size number in a component when a token exists. If a value is needed again and again, it becomes a token. Screens never type a size at all: they pass the token (`sizes.logoHero`, `sizes.compactControl`), and `Skeleton` has a default height so it needs no number. Lint checks it in `apps/mobile` (`app/` and `src/features/`): a number typed directly in a prop, including inside a condition, is an error (`size={72}`, `size={big ? 72 : 60}`, also inside an object or an `as` cast). Lint can't see a number kept in a `const` first (`const HERO = 72`), so don't do that either: add a token.

---

## 5. Radii

| Token | Value | Used for |
| --- | --- | --- |
| `sm` | 10 | Small shapes: Skeleton lines (the default), small icon tiles (`ResourceCard`). |
| `md` | 14 | Medium shapes inside a card (a tile); the box of a `TextField` and of a `SecretBox` (a field is smaller than the `lg` Sections next to it). |
| `lg` | 18 | Cards and sections, an `AlertRow`, big Skeleton blocks. |
| `xl` | 28 | The header's bottom corners, the splash's last frame when it lands on Home. A header that fills the screen (`fill`) has square corners, and so has the splash when it lands on a full-height screen: round corners there would show the page colour. |
| `pill` | 999 | Fully round ends: buttons, pills, the `PickerChip`, the `SegmentedControl` (its track and its picked segment, so it stays round next to the chip at every text size), the `BreakdownBar`, dots, the tab bar and the active tab's capsule, round placeholders. |

**Rule:** a shape inside another shape uses a smaller radius than its parent (inside a `lg` card: `sm` or `md`).

---

## 6. Elevation

Depth is used sparingly. Most things are flat.

| Level | How | When |
| --- | --- | --- |
| Flat (default) | No shadow. A card stands out by its colour: white on lavender (light), `#1A1724` on `#0E0C14` (dark). | Almost everything. |
| Raised | `Card raised`: shadow colour `shadow`, 4 down, 12 blur, Android elevation 3. **Light mode only.** | A card that overlaps the purple header's rounded bottom (in a `Stack overlapHeader`, for example "by product" on Home) or sits over other content. One or two per screen at most. |
| Floating | Blur, the see-through `tabBarBackground` and a hairline `tabBarBorder`. | The floating tab bar only. |

**Rules**

- Dark mode has no shadows; the difference between `surface` and `background` does the job.
- No custom shadows, no stacked shadows, no borders to fake depth.

---

## 7. Motion

All animation timings come from `motion` (or `useTheme().motion`), with no exceptions. Animations use Reanimated.

How long the app **waits** is not an animation timing: it's app logic, so it stays with the feature that waits, not in `motion`. The splash hands over at 1.35 s at the earliest (the name is written by then; 0.8 s with Reduce Motion), once the app is ready, and at 2.5 s at the latest; until then the finished name simply holds, with no loading dots (`SplashGate`). "Back online" stays for 2 s (`useOfflineNotice`).

| Duration token | Value | Used for |
| --- | --- | --- |
| `fast` | 150 ms | Small feedback: a press, a toggle. |
| `base` | 250 ms | Most changes: something appearing or leaving. **Also the longest allowed Reduce Motion fade.** |
| `slow` | 400 ms | Bigger moves; one Skeleton pulse; the chart's dots fading in. |

**The chart** (`LineChart`, from the approved mockup). Times are counted from the moment the chart first appears:

| Duration token | Value | Used for |
| --- | --- | --- |
| `chartDraw` | 1400 ms | The chart line drawing itself. The dotted piece and the projection start fading in when it's done. |
| `chartFillDelay` | 700 ms | When the fill under the line starts coming in. |
| `chartFillRise` | 900 ms | The fill fading in while it rises `chartRise` (8 pt) into place. |
| `chartDotsDelay` | 1200 ms | When the dots fade in (over `slow`). The current month's pulse starts then too. |
| `chartDottedFade` | 600 ms | The current month's dotted piece and the projection fading in. |
| `chartPulse` | 2400 ms | One pulse of the current month's dot, out and back, looping. |

| Distance token | Value | Used for |
| --- | --- | --- |
| `chartRise` | 8 pt | How far the chart's fill rises as it fades in (`motion.distance.chartRise`). |

**Sheets and toasts:**

- A `Sheet` slides up and down with the platform's own animation (a page sheet on iOS, React Native's `animationType="slide"`): its timing is the system's, not a token. With Reduce Motion it uses the system's cross-fade instead (`animationType="fade"`). Hidden because the lock screen came up, it goes at once, with no animation, so nothing slides down over the lock screen.
- A `Toast` fades in over `base` (250 ms, `enter`) while it rises `toastRise` into place, and fades out over `base`. With Reduce Motion it only fades, where it stands (`base`).

| Distance token | Value | Used for |
| --- | --- | --- |
| `toastRise` | 8 pt | How far a `Toast` rises as it fades in (`motion.distance.toastRise`). |

**The start-up splash** (`AnimatedSplash`, from the approved mockup). Times are counted from the moment the splash appears, or from the start of the hand-over:

| Duration token | Value | Used for |
| --- | --- | --- |
| `splashRiseDelay` | 150 ms | The wait before the logo rises. |
| `splashRise` | 600 ms | The logo rising and shrinking a little, with a soft spring (`overshoot`). The header gradient comes in over the flat purple at the same time. |
| `splashNameDelay` | 380 ms | When the first letter of "Scaleway" starts. |
| `splashLineDelay` | 240 ms | "MANAGER" starts this long after "Scaleway". |
| `splashLetter` | 420 ms | One letter writing itself in: it fades in, rises and comes out of a blur (`enter`). |
| `splashLetterStagger` | 36 ms | The wait between one letter and the next. |
| `splashHandOver` | 600 ms | The hand-over glide (`glide`): the purple shrinking into Home's header, or the logo gliding into Welcome's or the lock screen's logo. |
| `splashFadeOutDelay` | 100 ms | The name (and the logo, when it doesn't glide) starts fading this long into the hand-over. |
| `splashFadeOut` | 300 ms | The name (and that logo) fading out. |
| `splashPurpleFade` | 200 ms | The splash's purple fading over the screen it landed on, at the very end. |
| `splashEntranceDelay` | 250 ms | Welcome's or the lock screen's content starts coming in this long into the hand-over. |
| `splashEntrance` | 420 ms | One block of that content fading and rising in (`enter`). |
| `splashEntranceStagger` | 90 ms | The wait between one block and the next. |

| Easing token | Curve | Used for |
| --- | --- | --- |
| `standard` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Almost everything: starts quickly, settles gently. The chart line drawing itself. |
| `emphasized` | `cubic-bezier(0.7, 0, 0.2, 1)` | Big moves across the screen. |
| `overshoot` | `cubic-bezier(0.33, 1.73, 0.67, 1)` | A soft spring: goes a little past the end, then settles back (the splash's logo rising). |
| `enter` | `cubic-bezier(0.33, 1, 0.67, 1)` | Something arriving, gently: the splash's letters, Welcome's and the lock screen's content after the splash, the chart's fill, dots, dotted piece and projection. |
| `glide` | `cubic-bezier(0.65, 0, 0.35, 1)` | Starts slowly, speeds up, then slows to a stop: the splash hand-over, each half of the chart's pulse. |

**What may move:** the spending chart drawing itself, then its fill rising and its dots appearing (a `MetricChart` stays still); the current month's dot pulsing gently; the start-up splash (the logo rising, the name writing itself in, the hand-over) and Welcome's or the lock screen's content coming in after it; Home's cards rising and the tab bar sliding in after the splash (with the splash entrance timings: 250 ms into the hand-over, over 420 ms, `enter`; Home's chart waits under the splash and draws itself in once it's gone, so the whole drawing is seen); a purple header's content sliding down to make room for the offline pill, and back (`base`, `standard`; with Reduce Motion it's in its new place at once and fades in over `base`); screen transitions; a sheet sliding up and down; a toast fading and rising in; the white pill of a two-choice `SegmentedControl` sliding to the other side (`base`, `standard`; at once with Reduce Motion); Skeleton pulsing; the phone's own spinners (a busy button or row, pull to refresh), which keep turning with Reduce Motion, as the system's do. Nothing else.

**The Reduce Motion rule.** Every animation reads `useReducedMotion()` from Reanimated. When it's on, the animation is replaced by a plain fade of at most `motion.duration.base` (250 ms), or doesn't play at all (Skeleton stays still). Every animated component has a test for its Reduce Motion path.

**Screen transitions follow it too.** The navigator in `apps/mobile/app/_layout.tsx` uses `animation: reduceMotion ? 'fade' : 'default'` and `animationDuration: motion.duration.base`. `apps/mobile` doesn't import Reanimated, so it reads both from `useTheme()`: `reduceMotion` is the same setting as `useReducedMotion()`.

**No iOS edge effects anywhere.** iOS 26 and later draw their own band, line or fade at the edges of a scrolling view; iOS 27 showed a hard band under the status bar over the purple header, and lines along the sides. The app turns this off in all three places it can appear: every native Stack (the root, Account's, Resources') takes its options from `useStackOptions()`, which sets `scrollEdgeEffects` `hidden` on all four edges; the tabs navigator sets `detachInactiveScreens={false}` (a native tab screen would set iOS's own edge effect on its page and win); and every scrolling view in `packages/ui` (`Screen`'s `ScrollView` and `FlatList`, `Sheet`'s `ScrollView`, `Carousel`) is wrapped in `NoEdgeEffects`, which turns the same four edges off with react-native-screens' experimental `ScrollViewMarker`. **Rule:** a new scrolling view added to `packages/ui` goes inside `NoEdgeEffects` too; it takes exactly one child.

```tsx
const reduceMotion = useReducedMotion();

useEffect(() => {
  if (reduceMotion) {
    opacity.value = withTiming(0, { duration: motion.duration.base });

    return;
  }

  height.value = withTiming(target, { duration: motion.duration.splashHandOver });
}, [reduceMotion, opacity, height, target, motion]);
```

---

## 8. Icons

Icons come from [lucide](https://lucide.dev) through the `Icon` component only. They are outline icons drawn with a stroke of **1.9** (set by `Icon`, never changed). The one exception is `star-filled`: the same star, filled in its colour (the stroke stays, so it has the outline's size and corners).

| Size | Value | Used for |
| --- | --- | --- |
| `sm` | 16 | Inside buttons and pills, row chevrons. |
| `md` | 21 | The default: list rows, the tab bar. |
| `lg` | 24 | Empty states. |

| Name | lucide icon | Meaning |
| --- | --- | --- |
| `home` | House | Home tab |
| `layers` | Layers | Resources tab |
| `chart` | ChartColumn | Billing tab |
| `user` | User | Account tab |
| `chevron-right` | ChevronRight | A row that opens something in the app (another screen, a sheet); after "See all" (`SectionHeader`) |
| `chevron-left` | ChevronLeft | Back |
| `chevron-down` | ChevronDown | Opens a picker (`PickerChip`) |
| `wifi-off` | WifiOff | Offline |
| `check` | Check | Done, back online, copied (a copy button once it has copied) |
| `circle-check` | CircleCheck | The picked choice in a list (`ListRow` `check`) |
| `lock` | Lock | App lock |
| `log-out` | LogOut | Log out |
| `fingerprint` | Fingerprint | Face ID or fingerprint |
| `alert` | TriangleAlert | Warning or alert |
| `close` | X | Close |
| `server` | Server | Instances, Elastic Metal |
| `cube` | Box (a cube) | Kubernetes |
| `database` | Database | Databases |
| `box` | Container | Serverless containers |
| `zap` | Zap | Serverless functions |
| `play` | Play | Serverless jobs |
| `split` | Split | Load balancers |
| `star` | Star | Pin to Home: the pin while it's off (outline, `textMuted`) |
| `star-filled` | Star, filled | Pinned: the mark on a pinned resource (`ResourceCard`, a `ListRow` status, `DetailHero`) and the pin while it's on, in `brand` |
| `plus` | Plus | Add or create |
| `trash` | Trash2 | Delete |
| `key` | Key | SSH keys, API keys |
| `activity` | Activity | Activity log |
| `file` | FileText | Invoice |
| `copy` | Copy | Copy |
| `github` | Code | Source code (lucide has no brand icons anymore, so no GitHub logo) |
| `appearance` | SunMoon | Appearance: follow phone, light or dark |
| `info` | Info | Information: About the app; a note to read (`AlertRow tone="info"`); a resource that no longer exists (its `EmptyState`) |
| `external` | ExternalLink | Opens outside the app, in the browser (a `ListRow`'s `external` trailing, a `NoticeCard`) |
| `power` | Power | Power on or off, start or stop a server (Instances, Elastic Metal) |
| `moon` | Moon | Standby |
| `restart` | RotateCw | Reboot, restart |
| `backup` | Archive | Back up |
| `redeploy` | RefreshCw | Redeploy (containers, functions) |
| `replace` | Replace | Replace a node |
| `run` | CirclePlay | Run a job now |
| `stop` | CircleStop | Stop a job's run (kept for a future action button; a run is stopped from its row today) |

**Rules**

- One meaning per icon. Don't reuse `alert` for "info" or `check` for "select" (a picked choice is `circle-check`).
- No emoji as icons, no other icon set, and no filled icons except `star-filled` (owner's decision: a pinned star is filled). A pinned resource's star is `star-filled` in `brand`; the pin while it's off is the outline `star`. To fill another icon, add its name to `filled` in `Icon.tsx`, only when the owner asks.
- **A new icon:** import it from `lucide-react-native` in `packages/ui/src/components/Icon.tsx`, give it a plain name in the `icons` map, add it to `ICON_USES` in the gallery (TypeScript fails until you do) and to the table above.

---

## 9. Components

Every component below has a section in the gallery with the same name. Import them from `@scaleway-manager/ui`. Props marked **required** must always be given.

**Anything tappable dims to 80% while pressed** (`Button`, a `ListRow` with `onPress`, a `Card` with `onPress`, a tab of the `FloatingTabBar`), and fades to 50% when disabled. A new tappable component does the same.

### Text

Every piece of text in the app.

- **Use it for:** all text, always.
- **Don't:** use React Native's `Text`, or set a font size, weight or colour yourself. The one exception is the splash's name, drawn letter by letter by `AnimatedSplash` with `brandTypography` (see [Typography](#3-typography)).
- **Props that matter:**
  - `variant` (**required**): `display`, `title`, `headline`, `body`, `subhead`, `caption` (see [Typography](#3-typography)).
  - `tone`: `default` (normal text), `muted` (second-level), `brand` (purple text, links), `danger` (alerts, errors inside the content, destructive actions; never the quiet failure line, see [Errors in plain words](#errors-in-plain-words)), `onBrand` (on purple). Default `default`. `primaryButton`, `onPrimaryButton` and `onBadge` also exist, but only `packages/ui` components use them (`Button`'s labels, the picked segment on purple, every `Pill`'s words); screens never do.
  - `numberOfLines`: cut long text with "…" (names, IP addresses).
  - `align`: `start` (the default: lines start on the reading side), `center` (every line centred, wrapped ones too, as in `EmptyState`) or `end` (every line lined up on the other side: a value at the end of a row, a number in a right-hand column).
  - `bold`: the variant in bold (700), same size. Only to pick one item out of a row of the same labels (the chart's selected month), never for emphasis in a sentence.
  - `shrinkToFit`: keeps a short label on one line; at the largest text sizes, if it doesn't fit its room, it shrinks just enough (see [Typography](#3-typography)). For chart labels and the amount of a `SpendingSummary` only.
  - `mono`: the variant in the phone's monospace font, same size (see [Typography](#3-typography)). For keys, fingerprints and secrets only.
  - `accessibilityRole="header"` on screen titles.
  - `accessibilityLabel`: what screen readers say, only when it must differ from what is shown (`Section` uses it so its capitals title is read in its own case).
  - `accessibilityLiveRegion`: `polite` makes Android read the text when it appears or changes (an error message). iOS ignores it: also call `AccessibilityInfo.announceForAccessibility` there, as `FloatingNotice` does.

```tsx
<Text variant="title" accessibilityRole="header">
  Billing
</Text>

<Text variant="subhead" tone="muted">
  All amounts exclude tax.
</Text>
```

### Icon

One icon from the list in [Icons](#8-icons).

- **Use it for:** icons inside your own `packages/ui` components, or next to text.
- **Don't:** import `lucide-react-native` anywhere else; use an icon alone as a button without a label on the button.
- **Props that matter:**
  - `name` (**required**): an `IconName`. `star-filled` is drawn filled in its colour; every other icon is an outline.
  - `size`: `sm` 16, `md` 21 (default), `lg` 24.
  - `tone`: any text tone, plus `active` and `idle` (tab bar). Default `default`. The gallery shows each tone on the background it is made for.
  - `product`: draws the icon in that product's colour instead of a tone (see [Product colours](#product-colours-products)). For a product's tile (`ResourceCard`), on that product's `tile` colour. A product with no colour yet falls back to `tone`. The gallery's Icon section shows all eight.
- Icons are decoration for screen readers. When an icon is the only thing inside a control, the control carries the label (`accessibilityLabel`).

### Button

A pill-shaped button.

- **Use it for:** actions (save, confirm, try again, log in).
- **Don't:** use it to open another screen from a list (use a `ListRow` with a chevron), or to make a whole card tappable (use `Card onPress`).
- **Props that matter:**
  - `label` (**required**): the words on the button, also read by screen readers. Start with a verb ("Log in with Scaleway", "Try again").
  - `onPress` (**required**).
  - `size` (**required**): `md` (48 high, minimum) or `sm` (36 high, minimum). There is no default, so every button states its height. At normal text sizes the pill is exactly 48 or 36; at the largest text sizes it grows, so the label never spills out.
  - `variant`, on the page background:
    - `primary` (the default): `primaryButton` purple with a white label. The main action.
    - `secondary`: the `surface` colour with a thin border and a `brand` label. The second action.
    - `ghost`: no background, a `brand` label. A quiet action, **on the page background only**: its purple label can't be read on the purple header.
  - `variant`, on purple (`HeaderBackground`, the splash):
    - `onBrand`: white with a `primaryButton` purple label. The main action on purple, like Welcome's "Log in with Scaleway".
    - `ghostOnBrand`: no background, a white label and icon. A quiet action on purple, like Welcome's "Try the demo".
  - `disabled`: faded to 50%, can't be pressed.
  - `loading`: a spinner is drawn over the label, which is hidden but keeps its room, so the button never changes size (even at large text sizes, where the label made it taller). Presses are ignored and screen readers hear "busy". Use it while the action runs.
  - `icon`: a small icon before the label.
  - `iconPosition`: `'start'` (the default) or `'end'`, which puts the icon after the label. Only for a chevron that says "more" (`SectionHeader`'s "See all ›").
  - `accessibilityLabel`: what screen readers say, only when the label alone needs more context: two `Copy` buttons are "Copy Access key" and "Copy Secret key" (`SecretBox`). It starts with the visible words, so voice control still finds the button.
  - `fill`: in a row of buttons, they share the row equally and end on the content's edges (a confirmation's `Cancel` and verb). Only in a `Stack direction="row"`: in a column a button already fills the width. Buttons side by side always use it: it is also what makes both pills the same height.
  - The label is centred, line by line, so a label that wraps at a large text size stays a centred block.
- **Rules:**
  - One `primary` button per screen.
  - Buttons on purple are only `onBrand` or `ghostOnBrand`.
  - Buttons side by side always use the **same explicit `size`** and `fill`, inside a `Stack direction="row"` with no `align` (the row stretches their touch boxes, and `fill` lets each pill follow). This is for a row of **only buttons**: a row that mixes a Button with other content (text, an icon) uses `align="center"`, or the button grows as tall as that content. Both buttons grow to the taller one, so when a long label wraps at a large text size, the two pills stay exactly the same height. A long label wraps inside its button instead of pushing the other one off the screen.
  - `md` is the normal size. Use `sm` only where the mockup asks for a compact button. Its pill looks 36 high, but the button takes 44 pt of height: the pill sits centred in a 44-high touch box (see [Accessibility](#12-accessibility)). So a row of `sm` buttons is 44 high, and you don't add anything.

```tsx
<Stack direction="row" gap="xs">
  <Button label="Cancel" size="md" variant="secondary" fill onPress={onCancel} />

  <Button label="Reboot" size="md" fill onPress={onReboot} />
</Stack>
```

### Card

A rounded box (radius 18) in the `surface` colour, on the page background.

- **Use it for:** grouping related content; a tappable summary (a resource card on Home).
- **Don't:** put a card inside a card; use it for a list of rows (use `Section`); put buttons inside a tappable card (two things to tap in the same place).
- **Props that matter:**
  - `children` (**required**).
  - `padding`: any spacing token, default `md` (16).
  - `raised`: a soft shadow in light mode (see [Elevation](#6-elevation)).
  - `onPress`: the whole card becomes one button. It dims to 80% while pressed.
  - `disabled`: with `onPress`, the card fades to 50% and can't be pressed.
  - `grow`: `true` makes the card fill the free space its parent gives it (`flex: 1`, like `Stack grow`). In a `Carousel`, every card uses it, so all are as tall as the tallest (`ResourceCard` does it for you). Default `false`.
  - `accessibilityLabel`: with `onPress`, the one phrase screen readers hear for the whole card. Without it they read the card's text. Give it when something on the card isn't text (the pinned star of a `ResourceCard`).
  - `accessibilityHint`: with `onPress`, what happens when it's pressed, when that isn't obvious: "Opens in your browser" (`NoticeCard`).

### Stack

The layout building block: it puts its children in a column or a row, with gaps and padding taken from the spacing tokens. Underneath it is a plain `View` styled from tokens only.

- **Use it for:** every arrangement on a screen: cards 16 pt from the sides, two buttons side by side, a title above a card, the padding inside the header. **It's the only way `apps/mobile` arranges things** (see [Layout](#layout)).
- **Don't:** use it to draw something (it has no background, border or radius: that's `Card`, `Section` or `HeaderBackground`); wrap a `Card` just to pad it (use the card's own `padding`).
- **Props that matter:**
  - `children` (**required**).
  - `direction`: `'column'` (the default) or `'row'`.
  - `gap`: the space between children, a spacing token or `'none'`. Default `md` (16).
  - `padding`, `paddingHorizontal`, `paddingVertical`: a spacing token or `'none'`. No padding by default.
  - `align`: how children line up across the direction: `start`, `center`, `end` or `stretch`. Not set by default, which stretches them.
  - `justify`: how children spread along the direction: `start`, `center`, `end` or `between` (pushed to both ends). Not set by default, which packs them at the start.
  - `grow`: `true` makes the stack fill the free space (`flex: 1`), for example the text next to an icon in a row. Default `false`.
  - `wrap`: `true` lets a row continue on the next line (pills, chips). Default `false`.
  - `overlapHeader`: `true` pulls the stack 28 pt up (`radii.xl`, the header's corner radius), so its cards overlap the bottom of the `HeaderBackground` above it, as on Home. The header must leave at least 28 pt free at its bottom (`HeaderBackground overlapped`). Only while its first child is a `Card`, in every state (loading, empty, error, 403): words or a `SectionHeader` there would sit on purple. When no card can come first (Home without its spending), turn it off on both, and start the stack 16 pt below the header (`paddingVertical="md"`). Default `false`.
  - `contained`: `true` centres the stack at 560 pt (`contentMaxWidth`) on wide screens (iPad); on a phone it changes nothing. Use it for the content under a full-bleed header (`Screen padded={false}`), like Home's cards, so they line up with the header's content instead of stretching across an iPad. Default `false`.
- **Not the router's `Stack`.** This `Stack` (from `@scaleway-manager/ui`) arranges content. expo-router also has a `Stack`, the screen navigator: route layout files (`_layout.tsx`) keep `import { Stack } from 'expo-router'`, and screens import the layout one from `@scaleway-manager/ui`.

```tsx
<Stack paddingHorizontal="md">
  <Card>…</Card>

  <Stack direction="row" gap="xs">
    <Button label="Cancel" size="md" variant="secondary" fill onPress={onCancel} />

    <Button label="Reboot" size="md" fill onPress={onReboot} />
  </Stack>
</Stack>
```

### Screen

The root of every screen.

- **Use it for:** the outside of every route in `apps/mobile/app`.
- **What it gives you:** the page background, space for the status bar and notch at the top, 16 pt (`md`) on both sides of the content, content centred at 560 pt on iPad (when `padded`), and room at the bottom so the floating tab bar never hides the last item.
- **The lock screen isn't a `Screen`:** it's an `<Overlay dimmed={false}>` with a `<HeaderBackground fill insetTop insetBottom>` inside (see [Overlay](#overlay)).
- **Props that matter:**
  - `children` (**required**).
  - `scroll`: scrolls by default; `scroll={false}` for screens that fit (Welcome, a tab whose only content is a centred `EmptyState`).
  - `withTabBar`: `true` by default; `false` on screens without the tab bar (Welcome, the gallery).
  - `topInset`:
    - `'safe'` (the default) leaves room for the status bar.
    - `'belowNotice'` leaves room for the status bar **and** the offline pill that floats under it, so the pill never covers the first row. The room is always there, pill or not, so nothing moves when the pill comes and goes. For tab screens without a purple header whose content starts at the top (Account). It leaves room for the pill's longest label, which wraps onto more lines at larger text sizes: as many caption lines as the text size rounded up (one at normal size, two from just above it up to twice the size, three up to three times, four at iOS's two largest sizes), so it is enough even at the largest text size. On an iPad, where the pill is wider, this leaves some blank space at large text sizes.
    - `'none'` leaves no room, so a `HeaderBackground` placed first starts at the very top, under the status bar (Home, Welcome). That header then uses `insetTop` to keep its own content clear of the status bar. When the screen scrolls (Home), `Screen` also continues the header's gradient above its top (same colours, same slant, worked out from the header's real height, so there is no colour edge, even on an iPad), so pulling it down past the top (the iOS bounce) shows purple, not the page, and the light status bar stays readable.
  - `bottomInset`: only matters without the tab bar. `'safe'` (the default) leaves room for the home indicator. `'none'` leaves no room, so a full-height header (Welcome) reaches the very bottom; that header then uses `insetBottom`. With the tab bar, `Screen` always leaves room for it.
  - `padded`: `true` (the default) puts 16 pt on both sides and centres the content at 560 pt on iPad. `padded={false}` is for full-bleed layouts like Home and Welcome, whose purple touches the screen edges, on an iPad too: nothing is capped. The `HeaderBackground` centres its own content at 560 pt, and the cards below it sit in a `<Stack paddingHorizontal="md" contained>`.
  - `onRefresh` and `refreshing`: pull to refresh, on a scrolling screen (Activity). Pulling down calls `onRefresh`; the spinner shows while `refreshing` is `true`, and the screen sets it back to `false` once the data is in. On the page the spinner is `brand`; on a purple header (`topInset="none"`) it's white (iOS). Android draws it as a `brand` arrow on a small `surface` disc. Both platforms start it below the status bar, and below the offline pill wherever the pill floats over the content's top (`belowNotice`, and `none` under a purple header: `noticeLayout().clearance`), so it never sits under the notch or covers "Back online". On a `safe` screen it starts just below the status bar. It's the phone's own spinner: it follows the finger and keeps turning with Reduce Motion. **Not offered while offline:** the screen passes `onRefresh` only while online (`onRefresh={isOnline ? refresh : undefined}`), because the request would wait for the network with the spinner up; the offline pill already says why. A refresh that fails (pulled or not) keeps the data on screen and shows the quiet failure line above it, until a later one works.
  - `onHeaderUnderStatusBar`: with a `HeaderBackground` first, under the status bar (`topInset="none"`: Home). It's called with `true` while the header's purple is under the status bar, `false` once the screen has scrolled it away, and `true` again when it comes back (the iOS bounce counts), only when that changes. The switch happens when the header's bottom edge passes the middle of the status bar, where its icons are; `Screen` works that out (the header tells it where its edge is), so the app types no number. The root layout's status bar decider listens to it (see [The status bar](#the-status-bar)).
  - `onHeaderHeight`: with a `HeaderBackground` first, its real height, each time it changes (it grows with a long name, and while it makes room for the offline pill). Home passes it to the splash, which lands on exactly that height, only while the splash is up (then it passes nothing, so the slide for the offline pill doesn't report every frame for nothing).
  - `rows`: a list that can grow long, last on the screen (a product's resources, a cluster's nodes): `{ title?, data, rowKey, renderRow }`. The screen then scrolls as a `FlatList`: `children` come first, then the rows, drawn exactly like a `Section` of `ListRow`s (its `title` in capitals, heard as a header in its own case, then one `surface` card with radius `lg`, 16 pt inside and a divider between rows), and **only the rows near the screen are drawn**, however many there are. The insets, the room for the tab bar and pull to refresh are the same as on any screen. With nothing in `data` (still loading, empty, failed), no title and no card are drawn, and the screen stays the same list, so what's above it isn't drawn again when the rows arrive (a sheet in it keeps its state). With `scroll={false}` the list doesn't scroll (the gallery's sample). `renderRow` gets one item and returns its `ListRow`; `rowKey` is a stable key (the resource's key).

### ListRow

One row of a list: a title, an optional subtitle and icon, and something on the right.

- **Use it for:** settings, details ("Zone" → "fr-par-1"), lists of things that open, the products of the Resources tab and the resources of a product.
- **Don't:** use it outside a `Section` (rows have no background or padding of their own); give a row with a switch or a copy button an `onPress` too (two controls in one row); show a secret in it (use `SecretBox`); show a value with `text` on a row that opens something (it would look read-only: use the chevron's `text`); build a product or resource row of your own (use `product`, `subtitleHealth` and the `status` trailing).
- **Props that matter:**
  - `title` (**required**), `subtitle`, `icon` (muted; red when destructive).
  - `product`: the product's tile (30 pt, in its colours, the same as a `ResourceCard`'s) instead of an `icon`: a product of the Resources tab ("Instances"). A product ui doesn't know yet gets the neutral tile.
  - `subtitleTone`: `muted` (the default) or `danger`, for a subtitle that says something went wrong (an event that failed, in the activity log). Only the subtitle turns red, and it says so in words too ("… · Failed"): colour is never the only signal.
  - `subtitleHealth`: a health dot (`ok`, `busy`, `warning`, `error`, `stopped`, the same colours as a `ResourceCard`'s) in front of the subtitle, centred on its first line. Its words must say the same thing: a product's summary, worst health first ("1 failing · 2 OK · 1 stopped", with the `error` dot). No subtitle, no dot (rule 11).
  - `trailing`:
    - `{ type: 'chevron', text?, spokenText? }`: opens something (another screen, a sheet). `text` is its current value, shown before the chevron like any value ("Project" → "Production ›", "Appearance" → "Follow phone ›", as in the phone's own Settings), so the row looks tappable, not read-only. `spokenText`: what screen readers hear instead of `text`, when the value alone would be unclear (a product's count, "4", is heard as "4 resources").
    - `{ type: 'text', text }`: a value. A long one (a key, a fingerprint) wraps on its side of the row, lined up at the end, and takes at most half the row, so the title keeps its room.
    - `{ type: 'text', text, onCopy, copyLabel? }`: a value you can copy, in the monospace font like a `SecretBox`'s (it's read character by character). A copy button follows it, a control of its own: the `copy` icon in `brand`, 44 × 44, its icon on the row's end edge like a chevron, named "Copy {title}" ("Copy Fingerprint"). When several rows share a title (a server's IPs), `copyLabel` names each button apart: `copyLabel: 'Public IPv4 203.0.113.34'` gives "Copy Public IPv4 203.0.113.34" (it still starts with the visible words, so voice control finds it). These values are never secret. Pressed, it calls `onCopy(text, { sensitive: false })`; the screen passes both on to its clipboard and returns its promise (`(text, options) => clipboard.copy(text, options)`). Once that's done the button turns into a `check`, is named "Copied {title}" (or "Copied {copyLabel}"), and screen readers hear "Copied". A new value starts again at "Copy". No toast (see [Sheets](#sheets)). In a `disabled` row the words and the button each fade to 50% (once, not twice).
    - `{ type: 'switch', value, onValueChange }`: an on/off setting; the switch is labelled with the title.
    - `{ type: 'external' }`: opens something outside the app (a web page in the browser, like Account's "Source code on GitHub"). A small `external` icon in `textMuted` at the end, and screen readers hear the hint "Opens in your browser", so nobody is surprised to leave the app. Such a row always has an `onPress` (the hint comes with it). A browser that can't open shows the quiet failure line.
    - `{ type: 'check', selected }`: one choice of a list (a project, an expiry, the appearance). The picked one shows the `circle-check` icon in `brand`; screen readers hear it as `selected` (also on a row without `onPress`, which only shows the choice). A choice row normally has an `onPress` that picks it.
    - `{ type: 'status', label, health, pinned? }`: a resource's status, as its `StatusPill` ("Running", "Needs attention"), at most half the row so a long name keeps its room. `pinned` puts the filled star (`star-filled`) in `brand` before it. With an `onPress` (the row opens the resource, or a sheet), a chevron follows the Pill; without, nothing does (a node pool, a backend server). Screen readers hear "web-prod-1, DEV1-S · fr-par-1, Running, Pinned".
  - **A product's count** is the chevron's `text`, heard with its word (`{ type: 'chevron', text: '4', spokenText: '4 resources' }`, "1 resource" for one): "Instances, 1 failing · 2 OK · 1 stopped, 4 resources".
  - `onPress`: the row becomes a button. It dims to 80% while pressed.
  - `accessibilityHint`: with `onPress`, what a tap does when the row's words don't say it: a run that can be stopped ("Asks if you want to stop this run": its chevron looks like it opens the run). A row with the `external` trailing gets "Opens in your browser" without it.
  - `destructive`: red text, for "Log out" or "Exit demo". Destructive rows go last, in their own `Section`.
  - `disabled`: faded to 50% and can't be pressed. Say why in the `subtitle` (offline: `You're offline`).
  - `loading`: something runs for this row (an invoice downloading): a small `textMuted` spinner stands in for the trailing item, presses wait, and screen readers hear "busy". It isn't faded: busy isn't unavailable.
- Minimum height 52.
- Screen readers hear the row as one phrase: the title, then the subtitle, then the trailing text ("Zone, fr-par-1"). A row with a switch or a copy button is the exception: that control stays separate (the switch is labelled with the title, the copy button "Copy {title}", then "Copied {title}", or its `copyLabel`).

```tsx
<Section title="Security">
  <ListRow
    title="Unlock with Face ID"
    icon="fingerprint"
    trailing={{ type: 'switch', value: enabled, onValueChange: setEnabled }}
  />

  <ListRow title="Activity log" trailing={{ type: 'chevron' }} onPress={openActivity} />
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

<Section>
  <ListRow title="Access key" trailing={{ type: 'text', text: accessKey, onCopy: copy }} />
</Section>

<Section>
  <ListRow
    title="Instances"
    product="instances"
    subtitle="1 failing · 2 OK · 1 stopped"
    subtitleHealth="error"
    trailing={{ type: 'chevron', text: '4', spokenText: '4 resources' }}
    onPress={openInstances}
  />
</Section>

<Section>
  <ListRow
    title="web-prod-1"
    subtitle="DEV1-S · fr-par-1"
    trailing={{ type: 'status', label: 'Running', health: 'ok', pinned: true }}
    onPress={openServer}
  />
</Section>
```

### Section

A card of rows with a thin line between each row, and an optional small title above.

- **Use it for:** any group of `ListRow`s.
- **Don't:** use it for free content (use `Card`); use it for a list that can grow long (a product's resources, a cluster's nodes): that's the screen's `rows` (see [Screen](#screen)), which looks the same and draws only the rows near the screen.
- **Props that matter:**
  - `title`: written in sentence case in the code ("Security"); `Section` shows it in capitals ("SECURITY"). Screen readers hear it as a header, in its own case ("Security"), so a short word isn't spelled out letter by letter.
  - `children` (**required**, except while `loading`): the rows.
  - `loading`: while the rows load, row-shaped placeholders take their place, each a `body` line above a `subhead` line, at least a row high (52), with the usual dividers. `true` for a list: three placeholders (Billing's invoices, the activity log, the picker's projects). `'one'` for a single row still coming: one placeholder (the picker's organization name). The title stays. Rows already known (children) stay below the placeholders: the picker's "Switch organization" doesn't wait for the organization's name. Screens never build placeholder rows themselves.

### FloatingNotice

Holds a short notice at the top of the screen, centred just under the status bar, above the content and the tab bar. It takes no room in the layout, and keeps at least 16 pt from the screen sides, so a long notice never touches them.

- **Use it for:** the offline `Pill` ("You're offline", "Back online"), drawn once, by the tabs layout. In demo mode it holds the `Demo` badge instead (see [The offline Pill](#the-offline-pill)).
- **Don't:** put actions or long text in it; use it for errors that replace content (use `EmptyState`); animate it.
- **Props that matter:**
  - `children` (**required**): the notice, usually a `Pill`.
  - `announcement`: the text screen readers read aloud when it changes (iOS announces it; Android reads the live region).
- Touches pass through everywhere except on the notice itself.
- It never covers content: a tab screen without a purple header leaves room for it with `Screen topInset="belowNotice"`, or centres a lone `EmptyState` (see [The offline Pill](#the-offline-pill)).

### Overlay

Covers the whole screen, above everything, and blocks touches to what is behind it.

- **Use it for:** the "Use Face ID to unlock?" prompt (dimmed, with a `Card` in the middle), the lock screen (a full-height `HeaderBackground` inside) and the privacy cover (the same purple, see [The lock screen](#screen-layout-with-header-and-floating-tab-bar)). Each is drawn once, by the root layout.
- **Don't:** use it for a message that should not block the app (use `FloatingNotice`), or for a confirmation (see [Confirmations](#confirmations)).
- **Props that matter:**
  - `visible` (**required**): shows or hides it. Hidden, it draws nothing.
  - `children` (**required**).
  - `dimmed`: `true` (default) dims the screen with the `scrim` colour and centres the content, 20 pt from the sides and at most 560 pt wide. `false`: no dimming, the page colour behind the content, and the content fills the screen, so nothing of the app shows through (the lock screen). The overlay itself always covers the whole screen; for the lock screen put a `<HeaderBackground fill insetTop insetBottom>` inside: the purple reaches every edge, and the header centres its content at 560 pt on an iPad, so the Unlock button doesn't stretch across it.
  - `announcement`: iOS reads this text aloud when the overlay appears. On Android the string itself isn't spoken: TalkBack reads the overlay's content through its live region, so put the same words on screen. The lock screen says "Scaleway Manager is locked" (its title); the Face ID prompt says its question (its title, "Use Face ID to unlock?").
- **Every `Overlay` hides the app behind it and announces itself:** wrap the app in `ScreenReaderShield` while it is up, and pass an `announcement`. On iOS, screen readers only reach what is inside it while it is shown; on Android, only `ScreenReaderShield` stops TalkBack from reaching the app behind. **The one exception is the privacy cover:** it only shows while the app is away (inactive or in the background), so it says nothing, and its own content sits in a hidden `ScreenReaderShield` (screen readers never reach it); the app behind keeps its place, so VoiceOver is where it was when you come back.
- Prompt buttons stack, primary first, same size.
- It appears and disappears at once (no animation, so no Reduce Motion path).

### ScreenReaderShield

Hides everything inside it from screen readers (VoiceOver and TalkBack) while `hidden`. It draws nothing of its own and fills its parent.

- **Use it for:** wrapping the whole app in the root layout while an `Overlay` is up, so TalkBack can't reach the app behind it: the lock screen (or the "deciding" cover) and the "Use Face ID to unlock?" prompt. Also while the splash is up. Inside the privacy cover's `Overlay`, around its content, so screen readers never reach the cover itself.
- **Don't:** use it to hide something from everyone: it only affects screen readers.
- **Props that matter:** `hidden` (**required**), `children` (**required**).

### Pill

A small rounded label that shows a status.

- **Use it for:** the state of something, in one or two words (a resource's status, through `StatusPill`); the offline notice; the "Demo" badge.
- **Don't:** make it tappable, or put more than one short phrase in it.
- **Props that matter:**
  - `label` (**required**).
  - `tone` (**required**): `success` (running, healthy, back online), `warning` (needs attention, pending), `danger` (error, failed), `brand` (busy: starting, stopping, rebooting), `neutral` (stopped, inactive), `inverse` (app notices: offline, demo).
  - `icon`: a small icon before the label.
- The words and icon are always white (`onBadge`), on a background dark enough for them (at least 4.5:1, in light and dark, see [Contrast](#contrast-wcag-aa)): `successBadge` (green), `warningBadge` (amber), `dangerBadge` (red), `neutralBadge` (grey), `inverseBadge` (ink; a dark grey in dark mode), and the busy purple `primaryButton` for `brand`. They are darker shades of the status dots' colours, so a dot and its Pill still look alike.
- The word is always there: a Pill never says something by its colour alone.
- **The `inverse` Pill has an edge** (`inverseBadgeEdge`, 1 pt), because it floats over anything (the page, a card, the purple header). In dark mode it is a light grey; in light mode it is the pill's own ink, so you don't see it. The edge sits inside the pill (its padding is 1 pt smaller), so every Pill keeps the same size. The other tones have no edge: they sit on cards and rows.
- **About the name `inverse`:** it means "an app notice" (offline, Demo, a `Toast`), not "the opposite of the theme". In dark mode it is no longer light: it is a dark grey with white words, like every Pill.
- A long label wraps onto more lines inside the pill, next to its icon, instead of running past its edge (the offline label does at large text sizes).

```tsx
<Pill tone="inverse" icon="wifi-off" label="You're offline · showing data from 10:42" />
```

### StatusPill

A resource's status: its word in a `Pill` of its health's tone. The one place that turns a health into a Pill tone.

- **Use it for:** a resource's status wherever it shows: a `ResourceCard`, a `DetailHero` and a `ListRow`'s `status` trailing draw it for you; on its own, for a status in a sheet's row of facts.
- **Don't:** pick a `Pill` tone for a health yourself; draw the status word in the health's colour (green on white is 2.65:1).
- **Props that matter** (both **required**):
  - `label`: the status word, from core ("Running", "Rebooting…", "Needs a node pool").
  - `health`: `ok` → `success`, `busy` → `brand` (the same purple as a busy dot), `warning` → `warning`, `error` → `danger`, `stopped` → `neutral` (the `Health` type).
- Its words are white and readable on every tone (see [Contrast](#contrast-wcag-aa)); a long label wraps inside the pill.

```tsx
<StatusPill label="Running" health="ok" />
```

### EmptyState

A centred icon, title, message and optional button, for when there is nothing to show. The title and message are centred line by line, even when they wrap.

- **Use it for:** an empty list ("No resources yet"); content that can't load ("Couldn't load your invoices" with "Try again"); no access ("Billing isn't available"). The two shared states are in [Errors in plain words](#errors-in-plain-words).
- **Don't:** use it while loading (use `Skeleton`), or for a small problem in an otherwise working screen.
- **Props that matter:**
  - `icon` (**required**), `title` (**required**): says what is missing.
  - `message`: says why, or what to do.
  - `action`: `{ label, onPress, disabled?, note? }`, shown as a `md` primary button. Only when there is a useful next step. `disabled` while offline, with `note: "You're offline"`: a centred `caption` `muted` line right under the button, 8 pt below it (`xs`), the same on every screen. Screens never add the caption themselves.

### Skeleton

A placeholder shape that pulses gently while content loads: grey on the page, a soft white on the purple header. It stays still with Reduce Motion.

- **Use it for:** any content that is loading. Draw the shapes of the real content (a line where the title will be, a block where the chart will be), so nothing jumps when it arrives.
- **Don't:** use it for an action in progress (use `Button loading`), or show a spinner instead of it.
- **Props that matter:**
  - `width` (**required**): a number or `'100%'`.
  - `height`: leave it out for a line of text: the default is one line of `body` text (`typography.body.lineHeight`, 20), grown with the phone's text size like the line it stands for. A block (a chart) or a round shape needs a `height`; screens pass it as a size token, never as a number (add the token to `sizes` first if it's missing).
  - `variant`: the text style of the line it stands for, when it isn't `body`: `display` for the big amount on Home's header, `subhead`, `caption`… It is that style's line height, grown with the text size, so screens still pass no number. Default `body`.
  - `radius`: a radius token, default `sm`; `pill` for round shapes.
  - `tone`: `default` (grey `divider`, on the page and in cards) or `onBrand` (`skeletonOnBrand`, white at 12%, on the purple header). Default `default`. A grey shape on purple is too heavy in light mode and almost invisible in dark mode.

### HeaderBackground

The purple gradient header with rounded bottom corners (radius 28).

- **Use it for:** the top of Home (`minHeight` from `useHomeHeaderLayout()`) and of Billing (no `minHeight`: no splash lands there, so it fits its content); full-height purple screens (Welcome, the lock screen).
- **Don't:** use it as a coloured box or a card background.
- **Props that matter:**
  - `minHeight`: the least height, only when something else depends on it: Home (`useHomeHeaderLayout().height`, the splash's first guess, and the height its loading, error and 403 states keep). It includes the status bar area when `insetTop` is on. The header is exactly that tall while its content fits, and grows when it doesn't, so no word is ever cut (see [Typography](#3-typography)). Leave it out everywhere else: the header then fits its content.
  - `fill`: `true` makes the header fill the screen instead of having a height (Welcome, the lock screen). Its bottom corners are then square: it reaches the bottom of the screen, where round corners would show the page colour. Default `false`.
  - `insetTop`: `false` by default. `true` pads the content at the top by the status bar's height (the safe-area top inset), so the logo, text or chip stay clear of the status bar and the Dynamic Island while the purple still starts at the very top. Use it whenever the header sits under the status bar (`Screen topInset="none"`).
  - `noticeShown`: `false` by default. On a header with controls at its top (Home, Billing), pass `true` while the floating notice is up (the offline pill, "Back online", the Demo badge; the app asks `useNoticeShown()`, in `src/features/connectivity/`, the one place that decides): the content slides down by the notice's room (`noticeLayout(...).clearance` minus the status bar), so the pill never covers the chip or the switch, and the purple grows with it; it slides back up when the notice goes (`base`, `standard`). Opened while the notice is already up (offline at launch), it starts in that place, with no slide. **With Reduce Motion** it doesn't slide: the content is in its new place at once and fades in (`base`, 250 ms; that fade is the Reduce Motion path itself, so it runs with `ReduceMotion.Never`, or Reanimated would skip it). Going offline and back mid-slide turns it around from where it is. This is the purple header's exception to "nothing jumps when the pill comes and goes" (see [The offline Pill](#the-offline-pill)).
  - `insetBottom`: `false` by default. `true` pads the content at the bottom by the home indicator's height (the safe-area bottom inset), so the buttons of a full-height header stay clear of it while the purple reaches the very bottom (`Screen bottomInset="none"`).
  - `dots`: `false` by default. `true` draws a still grid of small `onBrand` dots behind the content, as in the approved mockup: radius 1.5, 20 pt apart (`spacing.lg`), the same size on an iPad. They are strongest (42%, 34% in dark mode) in the middle of an oval centred 50% across and 60% down, reaching 56% of the width and 29% of the height, and fade to nothing at its edge, so there are none under the title and its line and only faint specks near the buttons. Not touchable and hidden from screen readers; nothing moves, so nothing changes with Reduce Motion. It's laid out on the window, so it's only for a header that fills the screen: Welcome only.
  - `overlapped`: `false` by default. `true` when cards overlap its bottom (`Stack overlapHeader`, as on Home): the content stops 28 pt (`radii.xl`, what the cards cover) plus 16 pt above the bottom, so a card never covers it, even when the header grows. Only while a card is there to do it: Home without its spending passes `false`, so no empty strip is kept for a card that isn't coming.
  - `children`: the content, inside a `<Stack padding="lg">` (20 pt), or on Home and Billing a `<Stack paddingHorizontal="lg" gap="sm">` (12 pt between the top row and the spending summary below it). It uses the `onBrand` text tone and `onBrand` or `ghostOnBrand` buttons.
- **Wide screens:** the purple always reaches the screen edges, and the header centres its content at 560 pt (`contentMaxWidth`), so the logo, text and buttons line up with the content below and don't stretch across an iPad.

### LineChart

The spending chart, drawn white on the purple header: a soft line through one dot per month, with a fill fading down from the line. It follows an approved mockup.

- **Use it for:** money over the last 6 or 12 months, on a purple header: Home's header (`size="header"`) and Billing's (`size="large"`).
- **Don't:** put it on the page background or in a card (it's white, made for purple); draw a chart of your own in a feature.
- **Props that matter** (all **required** except `projectionVisible`, `animate` and `loading`):
  - `points`: one `ChartPoint` per month, oldest first: `{ key, label, value, description }`. `label` is shown under the dot (`Nov` for 6 months, `N` for 12). `description` is what screen readers say for that month (`November 2026, €84.60`). `value` is any number (the app passes cents).
  - `unfinishedLast`: `true` while the last month is still running (this month). Its piece of the line is dotted (dash `1 5`, 2.2 wide, at 80%), the fill under it is lighter, its dot is a little bigger, and it pulses gently.
  - `projection`: where this month is heading, `{ value, label }` (`≈ €149.29 by month end`), or `null`. It's drawn above the last month: a faint dotted line up from it, a hollow dot, and the label, right-aligned, on top. The scale always includes it, so it stays inside the chart.
  - `projectionVisible`: `true` by default. `false` hides the projection's marks and label but keeps it in the scale. Screens always pass the projection, and set this to "the current month is the one shown": picking a past month then hides the projection without moving the line.
  - `selectedIndex` and `onSelect`: the picked month, or `null` (then the last month is the one shown). A tap picks the nearest month when the finger lifts; a drag sideways moves along the months; a drag up or down scrolls the screen and picks nothing. Each new month calls `onSelect(index)` once; the screen keeps it and passes it back as `selectedIndex`. The picked month gets a soft halo, a bigger dot and a thin line down to the bottom.
  - `size`: `header` (the line's area is `sizes.chartHeader`, 88 high) or `large` (`sizes.chartLarge`, 168). Screens never type a height.
  - `animate`: `true` (the default) draws the chart in when it first appears; `false` shows it at once (the pulse still plays).
  - `loading`: `true` while the months load. The chart then draws two `Skeleton tone="onBrand"` shapes (the line's area and the labels' line) at its exact height, so nothing jumps when the months arrive, and it draws itself in only once they're there. Screens never build the chart's placeholder themselves.
- **The look** (values from the mockup, colours from the theme):
  - The line: `onBrand`, 2.4 wide, round ends. It's a smooth curve that never bulges above or below two neighbouring months (a "monotone" curve, the same as d3's `curveMonotoneX`), so it never shows a month higher or lower than it was.
  - The dots: radius 3, `onBrand` with a 1.6 `chartDotRing` ring (deep purple). The running month's dot (while `unfinishedLast`): radius 4 with a 2 ring. The picked month: a halo of radius 9 (`onBrand` at 25%), a dot of radius 4.5 with a 2 ring, and a guide line (`onBrand` at 55%).
  - The fill: `chartFill`, from 38% (45% in dark mode) at the top of the line down to 0 at the bottom; 16% (18% in dark mode) under the dotted piece. The stronger dark fill makes the lavender glow a little, as in the dark mockup.
  - The solid line, the dotted piece and their two fills are four separate shapes that meet at the last-but-one month. Never cut one shape in two with a clip: when 6M/12M moves the cut, the phone can keep drawing the old one.
  - The labels: `caption`, `onBrand` at 75% (measured, see [Contrast](#contrast-wcag-aa)). The picked month's label (or the last one's) is bold and at 100%.
- **The scale:** the smallest value sits 32 pt (`spacing.xxl`) above the bottom, so the fill shows under every month; the largest sits at the top (the projection counts too). Months all at the same amount make a flat line in the middle; all at zero (a brand-new organization), a flat line where the smallest month sits, 32 pt above the bottom.
- **Its height:** one caption line on top (room for the projection's label), the line's area (the `size` token), 4 pt, then one caption line of month labels. Both caption lines grow with the text size, so at the default size the chart is 120 (`header`) or 200 (`large`) high. Labels stay on one line, with at least 4 pt between neighbours: at the largest text sizes, one that doesn't fit shrinks just enough (`Text shrinkToFit`). The first and last labels may reach up to 16 pt past the chart's sides, so give the chart at least 16 pt of room on each side (the header's `lg` padding is 20).
- **Motion** (the tokens are in [Motion](#7-motion)): the line draws itself (`chartDraw`, 1.4 s, `standard`). At 700 ms (`chartFillDelay`) the fill fades in while rising 8 pt (`chartFillRise`, 900 ms, `enter`). At 1.2 s (`chartDotsDelay`) the dots fade in (`slow`, `enter`). When the line is drawn, the dotted piece and the projection fade in (`chartDottedFade`, 600 ms, `enter`). From 1.2 s on, the current month's dot pulses: a white disc behind it, as big as the dot (radius 4), grows to 2.3 times its size while fading from 60% to nothing, then comes back (`chartPulse`, 2.4 s, `glide`), again and again.
- **With Reduce Motion:** everything shows at once, and nothing pulses.
- **Screen readers** hear one control: "Spending chart", adjustable, whose value is the month shown: its `description`, plus the projection's label for the current month while it's visible ("November 2026, €84.60, ≈ €149.29 by month end"). Swiping up or down moves to the next or the previous month (through `onSelect`), so every month can be heard. The drawing and its labels are not read one by one.
- It doesn't dim when pressed: the halo on the picked month is the feedback.
- **Touch area:** the whole chart is one touch area, well over 44 × 44. With 12 months, each month's slice is narrower than 44 pt on a phone (about 27 to 30 pt); that's fine, because a drag snaps to the nearest month and screen readers swipe between months.
- While `loading`, there is nothing to adjust yet: screen readers hear "Spending chart" as a busy progress bar.

```tsx
<HeaderBackground minHeight={homeHeader.height} insetTop noticeShown={noticeShown} overlapped>
  <Stack paddingHorizontal="lg" gap="sm">
    <LineChart
      points={months}
      unfinishedLast
      projection={projection}
      projectionVisible={showsCurrentMonth}
      selectedIndex={selectedIndex}
      onSelect={setSelectedIndex}
      size="header"
    />
  </Stack>
</HeaderBackground>
```

### MetricChart

A small, still line chart on its own card: one metric of a resource over time (CPU, memory, disk, reachability), with its latest value.

- **Use it for:** the charts of a resource's screen (a database's CPU, memory and disk; an Elastic Metal server's reachability over 24 h), with its facts, before the actions.
- **Don't:** put it in a `Card` (it is one) or on purple (use `LineChart`); use it for money (use `LineChart`); draw a chart of your own in a feature.
- **Props that matter:**
  - `title` (**required**): what it measures, and over when when it helps: "CPU", "Reachability (24 h)". In `subhead` `muted`.
  - `points` (**required**): `{ value }[]`, oldest first, evenly spaced in time (core's `MetricSeries.points` fit as they are; pings are mapped to 100 when up, 0 when down). A long series (a day of pings, about 1 440) is thinned to the chart's width: at most one point every 2 pt, each the average of its slice, the last one always the latest value. A short dip looks shallower once thinned; the value top-right and the spoken lowest and highest are the real ones.
  - `unit` (**required**): `'%'`, the only one for now: the scale runs from 0 to 100, whatever the values (one above or below stays inside the chart). Screens never pass a scale or a height.
  - `valueLabel`: the words top-right instead of the latest value. Leave it out to show the latest value ("92%").
  - `loading`: `true` while the points load: `Skeleton`s in the value's and the line's place, in the same frame, so nothing moves when they arrive. Screen readers hear the title as a busy progress bar.
- **The look:** a `Card` (16 pt padding). The title on the left and the latest value in `headline` on the right; under them, the line's area (at least `sizes.chartMetric`, 72) with the scale's ends as `caption` `muted` captions on its right ("100%" at the top, "0%" at the bottom). The line: `brand`, 2 wide, round ends, the same smooth monotone curve as `LineChart`'s (it never bulges past two neighbouring points), ending on a `brand` dot (radius 3) at the latest value. Under it, a `brand` fill from 18% down to nothing. No grid lines, no dates. One point is a dot; no points, a "—" and no line.
- **It doesn't move:** no drawing in, no pulse, so there's nothing for Reduce Motion, and nothing to tap.
- **Screen readers** hear one image: "CPU, 92%, lowest 12%, highest 92%" (or "CPU, No data").
- **Its height** grows with the text size: the title row and the captions grow, and the line's area grows with the captions instead of cutting them.

```tsx
<MetricChart title="CPU" points={cpu.points} unit="%" />
```

### SpendingSummary

The money part of a purple header: what was spent, compared with the month before, and who it covers. From an approved mockup.

- **Use it for:** Home's header (and Billing's), between the chip row and the chart.
- **Don't:** put it on the page background (it's white text, made for purple); build the label, amount and comparison by hand in a screen.
- **Props that matter** (all **required**):
  - `label`: "Spent in November so far", "Spent in September" (`subhead`).
  - `amount`: "€84.60" (`display`), or `null` while it loads.
  - `comparison`: `{ title, value, valueLabel? }`: "October" / "€141.20", or "vs August" / "+19%" (`caption` above `headline`, lined up at the end of the amount's row). `valueLabel` says a sign in words for screen readers ("—" is heard as "Nothing to compare"). `null` while it loads.
  - `scope`: who the amount covers, "All projects in Acme" (`caption`), or `null` while it loads.
- **Layout:** the amount and its comparison share a row, lined up at the bottom. When the line is full (a big amount at a large text size), the comparison drops under the amount instead of running off the screen. At accessibility text sizes it always goes under it, lined up at the start.
- **The amount stays on one line** (`Text shrinkToFit`, the third named exception in [Typography](#3-typography)): it grows with the text size, and only when it no longer fits the width does it shrink, just enough.
- **Loading:** while `amount`, `comparison` or `scope` is `null`, `Skeleton tone="onBrand"` placeholders take their exact place and line heights (the label shows at once: it's known before the amounts), so nothing jumps when they arrive.
- **Its height** is `spendingSummaryHeight(fontScale)`: the label, the amount (with the comparison's two lines under it at accessibility sizes) and the last line. `homeHeaderLayout` counts it.

```tsx
<SpendingSummary
  label="Spent in November so far"
  amount="€84.60"
  comparison={{ title: 'October', value: '€141.20' }}
  scope="All projects in Acme"
/>
```

### PickerChip

A see-through white chip on the purple header that opens a picker: "Acme · Production ▾".

- **Use it for:** the organization and project on Home's header. It opens the project picker.
- **Don't:** put it on the page background (it's white, made for purple); use it for an action (use `Button`).
- **Props that matter:**
  - `label` (**required**): the words on the chip, also read by screen readers ("Acme · Production").
  - `onPress` (**required**).
- **The look** (from the mockup): `controlOnBrand` (white at 16%), fully round, the label in `subhead` `onBrand`, then a `chevron-down` (`sm`). A long name wraps inside the chip instead of pushing its neighbour off the screen.
- **Touch:** the chip looks 28 pt high (`sizes.compactControl`) and sits in the middle of a 44 pt touch box, like a small `Button`. It dims to 80% while pressed. Screen readers hear a button with its label.
- **Next to a `SegmentedControl`** (Home's header): put both in a `Stack direction="row" justify="between"` with **no `align`**. The row stretches both touch boxes to the taller one, and both shapes fill their box minus the same 8 pt above and below, so they always look exactly the same height, at every text size. At the default text size the row is 44 high; it only grows when the words no longer fit (the chip is its `subhead` line plus 24, a segment its `caption` line plus 28).

```tsx
<HeaderBackground minHeight={homeHeader.height} insetTop noticeShown={noticeShown} overlapped>
  <Stack paddingHorizontal="lg" gap="sm">
    <Stack direction="row" justify="between" gap="sm">
      <PickerChip label="Acme · Production" onPress={openProjectPicker} />

      <SegmentedControl options={RANGES} value={range} onChange={setRange} tone="onBrand" />
    </Stack>
  </Stack>
</HeaderBackground>
```

### SegmentedControl

A row of two or three short choices, one of them picked: `6M` / `12M`.

- **Use it for:** switching what a chart or a card shows, right where it is: 6 or 12 months on Home's and Billing's headers (`onBrand`); Products or Projects on Billing's "by product" card (`default`, "Breakdown: Products").
- **Don't:** use it to go to another screen (tabs, rows), for an on/off setting (a switch row), or for more than three choices or long words (a list of choices).
- **Props that matter:**
  - `options` (**required**): `{ key, label, accessibilityLabel? }[]`, in order. `accessibilityLabel` is what screen readers say when the label is too short to be heard right: `[{ key: '6M', label: '6M', accessibilityLabel: '6 months' }, { key: '12M', label: '12M', accessibilityLabel: '12 months' }]`.
  - `value` (**required**): the picked key.
  - `onChange` (**required**): called with the tapped key. With two choices the switch is a toggle: a tap anywhere on it, on the picked side too, calls it with the other key. With three, tapping the picked one does nothing.
  - `accessibilityLabel`: with two choices, the name of the whole switch ("Range"); screen readers hear "Range: 6 months".
  - `tone`: `default` (on a card or the page: a `divider` track; the picked one a `surface` pill with a bold `default` label; the others `muted`) or `onBrand` (on purple: a `controlOnBrand` track; the picked one a white `onBrand` pill with a bold `primaryButton` label; the others white). Default `default`.
- **The look:** the track looks 28 pt high (`sizes.compactControl`) and the picked pill sits 2 pt inside it, both fully round (`pill`), so the switch stays round next to the chip at every text size; `caption` labels. On purple, the labels that aren't picked are full white: the mockup's 75% falls under 4.5:1 on the lightest header colour (3.88).
- **Its width:** always as wide as its choices, even straight in a `Card` or a `Stack` that stretches its children (no `align` needed). In a row it still fills the row's height, so it matches the `PickerChip` beside it. When its words are wider than the room (Products / Projects at the two largest accessibility text sizes), the choices share the room and their words wrap, so nothing runs off the card. A word can then break inside itself ("Product" / "s"): an accepted exception, see [Typography](#3-typography).
- **Touch:** with two choices the whole switch is one touch box and dims as one; with three, each choice is its own touch box, at least 44 × 44; the track is drawn behind them, in the middle. It dims to 80% while pressed. Side by side with a `PickerChip`, see above.
- **Screen readers:** with two choices they hear one `button`: "Range: 6 months" and the hint "Double-tap to show 12 months" (the other choice's `accessibilityLabel`, or its label); the words change after the tap, and the new choice is also announced once (`announceForAccessibility`, "Range: 12 months"), because a screen reader may stay silent when the label of the focused control changes. With three they hear one tab list, like the `FloatingTabBar`: each choice a `tab` ("6 months, tab, 1 of 3"), the picked one `selected`. The picked label is bold too, so the choice never rests on colour alone.
- **Motion:** with two choices the white pill slides to the other side (`motion.duration.base`, `motion.easing.standard`). With Reduce Motion it simply appears there. With three it moves at once.

### BreakdownBar

A stacked bar of amounts, then one legend row per amount: where the money went.

- **Use it for:** "{Month} by product" on Home and Billing, "{Month} by project" on Billing, and a project's products in its Billing sheet, inside a `Card`.
- **Don't:** give it more than 4 segments (group the rest in "Other", as core's `topParts` does); use it for anything but parts of one total.
- **Props that matter:**
  - `segments` (**required**): `{ label, value, formatted }[]`, biggest first, "Other" last. `value` is any number (the app passes cents): it sets the segment's share of the bar. `formatted` is the amount written in the legend (`€46.30`).
- **The look** (from the mockup): a bar 8 high with round ends and 2 pt gaps, the segments in the `series` colours 1 to 4, in order. Then one row per segment: its series dot (`sizes.dot`), the label (`body`) and the amount (`body`, `muted`), 8 pt between rows. A long label wraps; the dot stays on its first line.
- A segment at 0 takes no room in the bar (its legend row still shows). With nothing above 0, the bar is an empty `divider` track.
- Two segments may share a label (two projects this user can't see are both "Unknown project"): each keeps its own part and legend row.
- More than 4 segments: only the first 4 show, and development builds log an error.
- `loading`: `true` while the amounts load. It draws placeholders in its own shape (the bar, then four legend lines, the most it ever has), so the card doesn't grow when the amounts arrive. Pass `segments={[]}`.
- **Screen readers** skip the bar (the legend says the same) and hear each legend row as one phrase: "Instances, €46.30".
- The lighter series colours are under 3:1 on a card: the bar and its dots are a hint, the words carry the meaning (see [Contrast](#contrast-wcag-aa), Accepted item 6).

```tsx
<Card raised>
  <Stack gap="sm">
    <Text variant="headline">November by product</Text>

    <BreakdownBar segments={[{ label: 'Instances', value: 4630, formatted: '€46.30' }, …]} />
  </Stack>
</Card>
```

### AlertRow

A rounded row that says something needs attention now (a firing monitoring alert), or a note about a resource.

- **Use it for:** alerts on Home, one row per alert, below the "by product" card. On a resource's screen, its notices, right under the `DetailHero`: what went wrong on Scaleway's side (a node's error, a failed deployment: `danger`), or a note to read (an upgrade is available: `info`).
- **Don't:** use it for an error of the app (use `EmptyState` or the quiet failure line), for a resource that no longer exists (an `EmptyState`), for a Scaleway incident (use `NoticeCard`), or inside a `Card` or `Section`.
- **Props that matter:**
  - `title` (**required**): what's wrong, in `headline` ("High CPU on db-main").
  - `detail` (**required**): one more line, in `caption` (the alert's summary, or its region).
  - `tone`: `danger` (the default: `alertBackground`, the `alert` icon, title and detail in `alertText`), `warning` (calmer: `warningBackground`, the icon and title in `default`, the detail `muted`) or `info` (a note: `infoBackground`, the `info` icon in `brand`, the title in `default`, the detail `muted`).
- At least 52 high (`listRowMin`), radius `lg`, 16 pt on the sides and 12 above and below. Long words wrap.
- It isn't tappable. **Screen readers** hear one phrase that starts with what it is (the row's colour says it only to the eye): "Alert, High CPU on db-main, CPU above 90% for 12 minutes" (`danger`), "Warning, …" (`warning`), "Note, …" (`info`).

### StatusLine

One slim line that says all is well: a green dot and its words.

- **Use it for:** Scaleway status on Home when nothing affects the project ("All Scaleway services running normally").
- **Don't:** use it for a problem (use `NoticeCard`) or for a resource's status (`ResourceCard` shows it).
- **Props that matter:** `label` (**required**).
- **The look:** a `success` dot (`sizes.dot`), centred on the first line of the words, then the label in `subhead` `muted`. No card. Screen readers hear the label.

### NoticeCard

A card about something outside the app that opens for more: a Scaleway incident.

- **Use it for:** each Scaleway incident that affects the project (Home). It opens the incident's page in the browser.
- **Don't:** use it for a monitoring alert (`AlertRow`), or put a button in it (the whole card is one button).
- **Props that matter:**
  - `title` (**required**): in `headline`.
  - `message`: the latest update, in `subhead` `muted`. Leave it out when there's none.
  - `meta` (**required**): how serious it is, its state and what it touches, in `caption` `muted` ("Minor issue · Investigating · Block Storage, fr-par-1"). It **always starts with the words for the `tone`** (for example "Minor issue" for `warning`, "Major outage" for `danger`; the exact words are the screen's): the dot's colour can't say it alone (rule 11).
  - `tone` (**required**): `warning` (an orange `warning` dot) or `danger` (a red `alertText` dot).
  - `onPress` (**required**).
- **The look:** a `Card` (16 pt padding): the dot centred on the title's first line, the `external` mark on the right (it leaves the app, like a `ListRow`'s `external`), then the message and the meta. The dot is a hint; the meta says the same thing in words.
- **Screen readers** hear one button: "title, message, meta", with the hint "Opens in your browser". It dims to 80% while pressed.
- **A browser that can't open** shows the quiet failure line under the cards (the screen's `ActionFailed`): never a tap that does nothing.

### ResourceCard

A resource at a glance, for Home's Live resources: what it is, where, and how it's doing. It follows an approved mockup.

- **Use it for:** one resource in a `Carousel` (`itemWidth={sizes.resourceCard}`).
- **Don't:** add a switch or any action to it (owner's decision: a stray tap never stops a server; people act from the resource's screen); use it outside a `Carousel` (it has no width of its own, and it fills its slot's height).
- **Props that matter** (all **required** except `pinned`, or only `loading`):
  - `loading`: `true` while the resources load, and nothing else: the card's own shape (the tile, the title and two lines, the divider, `Status` and a pill), in `Skeleton`s, as tall as a real card. Nothing to press, and screen readers skip it. Screens never build a placeholder card themselves (`<ResourceCard key={key} loading />`).
  - `product`: which product it is (`instances`, `kubernetes`, `databases`…, the `Product` type, exported; the same keys as core's). It sets the tile's colour and icon (see [Product colours](#product-colours-products)), so the two always match.
  - `title`: its name. `subtitle`: what kind ("Instance · Ubuntu"). `meta`: where, and a key detail ("fr-par-1 · 203.0.113.34").
  - `statusLabel`: the status word ("Running").
  - `health`: `ok`, `busy`, `warning`, `error` or `stopped` (the `Health` type, exported; the same words as core's, which ui can't import).
  - `pinned`: `true` adds the filled star (`star-filled`) in `brand`. Default `false`.
  - `onPress`: opens the resource.
- **The look** (from the mockup): a `Card` with 12 pt padding. A 30 pt icon tile in the product's colours (its `tile`, radius `sm`, the icon in its `icon` colour), with the star (when pinned) and the status dot on the right. The title (`headline`), subtitle and meta (`subhead`, `muted`), each on one line, cut with "…" when too long. A divider. Then `Status` (`caption`, `muted`) and the status word as a `Pill`.
- **Same height in a row:** it fills its Carousel slot's height (`Card grow`), and the free room goes above the divider, so every card of the row is as tall as the tallest and `Status` lines up at the bottom of each.
- **Health colours** (the dot, and the Pill in a darker shade of it): `ok` → `success` (Pill `success`, on `successBadge`), `busy` → `primaryButton` (Pill `brand`, the same purple), `warning` → `warning` (Pill `warning`, on `warningBadge`), `error` → `alertText` (Pill `danger`, on `dangerBadge`), `stopped` → `neutral` (Pill `neutral`, on `neutralBadge`). The status word is always a Pill (the `StatusPill`), never the status colour as text (green on white is 2.65:1). The tile is the same as a `ListRow`'s `product` tile.
- **Screen readers** hear one button: "web-prod-1, Instance · Ubuntu, fr-par-1 · 203.0.113.34, Running, Pinned". It dims to 80% while pressed.

### Carousel

A row of cards that scrolls sideways, stops on a card, and runs to the screen edges.

- **Use it for:** Live resources on Home (`ResourceCard`s).
- **Don't:** use it for a list people read through (use a `Section` of `ListRow`s); mix items of different kinds.
- **Props that matter:**
  - `children` (**required**): the cards: `ResourceCard`s, or `Card`s with `grow`. Give each a stable `key` (the resource's key): when the order changes, a card moves instead of being built again.
  - `itemWidth` (**required**): each card's width at the default text size, as a token (`sizes.resourceCard`), never a number.
  - `gap`: a spacing token. Default `sm` (12).
- It sits **directly** in the content column: a child of a padded `Screen`, or of Home's `Stack paddingHorizontal="md" contained` itself, not of a `Stack` inside it. The first card lines up with the content, and the row runs past it to both screen edges (on an iPad too, past the centred 560 pt column), so the next card peeks in. The part in the screen margin only gets touches while it stays inside its parent's bounds (see [Touch targets](#touch-targets)), and the padded column's bounds include its margin.
- Each swipe stops with a card at the start. The cards grow with the text size (`itemWidth` × the text size), so their words fit, but never get wider than the content: at the largest sizes one card fills it.
- **Cards in a row are always the same height,** like buttons side by side: the row stretches every slot to the tallest card, and each card fills its slot (`ResourceCard` does it itself; a plain `Card` needs `grow`). A card whose words wrap more makes the whole row taller, never one card alone.
- No scroll bar. Scrolling is the person's own move, so there's nothing for Reduce Motion.

### SectionHeader

The title of a part of a long screen, with an optional action on the right: "Live resources", "See all ›".

- **Use it for:** the title of a part of Home or Billing: over cards (Live resources), or over an untitled `Section` of rows (All products, All projects, Invoices); the title of a card that has an action ("{Month} by product" with "Back to now").
- **Don't:** use it for a screen title (`Text variant="title"` with the header role), or above a `Section` that has its own `title`.
- **Props that matter:**
  - `title` (**required**): in `headline`; screen readers hear it as a header.
  - `action`: `{ label, onPress, chevron? }`, a small `ghost` `Button` (`size="sm"`) with a `chevron-right` after the words. The label is the words only ("See all"): the chevron is drawn for you, so the copy has no "›". `chevron: false` for an action that stays on the screen ("Back to now"): a chevron says it opens something.
  - In a card, the title row is 44 high whether the action shows or not, so the card doesn't jump when "Back to now" comes and goes, and the button's padding reaches into the card's 16 pt padding, so its words end at the card's content edge.
- At least 44 high, with or without an action. The button is centred next to the title (a row that mixes text and a button uses `align="center"`, see [Button](#button)).
- **It lines up with the content,** as in the mockup: the title starts at the content's left edge and "See all ›" ends at its right edge, over the cards' edge. The ghost button's 16 pt side padding (invisible) reaches into the screen's 16 pt margin, so its touch box stays 44 high and wide enough. Like the `Carousel`, put it **directly** in the content column (a child of a padded `Screen` or of the `Stack paddingHorizontal="md"` itself), whose bounds include that margin, so the whole button gets touches.

```tsx
<Stack paddingHorizontal="md" overlapHeader contained>
  <Card raised>…</Card>

  <SectionHeader title="Live resources" action={{ label: 'See all', onPress: openResources }} />

  <Carousel itemWidth={sizes.resourceCard}>
    {resources.map((resource) => (
      <ResourceCard key={resource.key} … onPress={() => open(resource)} />
    ))}
  </Carousel>
</Stack>
```

### Sheet

A panel that slides up over the screen for one short task: pick something, fill a small form, read a new secret. A page sheet on iOS (the screen behind shrinks back a little), the whole screen on Android.

- **Use it for:** the project picker, the appearance choice, adding an SSH key, creating an API key, a key's details, a project's spending in a month (Billing, read-only).
- **Don't:** open a sheet from a sheet (see [Sheets](#sheets)); put a long screen in it (push a screen instead); use it for a message that shouldn't block (use `Toast` or `FloatingNotice`).
- **Props that matter:**
  - `visible` (**required**): `{ open, lockCovers }`. `open`: the screen wants it open. `lockCovers`: the lock screen covers the app (locked, or still deciding at launch), or the privacy cover is up (the app is away with the lock on). It shows only when `open` is `true` and `lockCovers` is `false`. A sheet is its own window, above the app and even above the lock screen, so it must hide itself while the lock is up. Screens never write this object: they pass their open state through the app's lock-aware hook, `useSheetVisible(open)` (see [Sheets](#sheets)).
  - `title` (**required**): what the sheet is for, in `title` style. Screen readers hear it as a header.
  - `onClose` (**required**): the Close button, a swipe down (iOS) and the Back button (Android) all call it; the screen then sets `open` to `false`. On Android, Back on a confirmation goes back one step instead (its `onCancel`), like Back everywhere on Android.
  - `children` (**required**): the content, which scrolls when it's long. Arrange it with `Stack`: `Section`s of `ListRow`s, `TextField`s, one `md` button.
  - `holdOpen`: while `true`, a swipe down (iOS) doesn't close the sheet by itself: it springs back and calls `onClose`, like Close and Back, so the screen can ask first (its `confirm`). For a sheet whose content would be lost for good: the new secret, until it's copied. Default `false`.
  - `confirm`: a question asked from this sheet, `{ title, message, confirmLabel, busy?, disabledReason?, onConfirm, onCancel }` (the same as `ConfirmSheet`'s props). The sheet shows it as its second step, in place of its content: the question as its title, the message at the top, `Cancel` and the verb at the bottom of the sheet (as in `ConfirmSheet`). `onCancel` goes back to the content, which kept its state (typed text, a picked choice). `null` or left out: the content. Its two buttons share the row (`Button fill`), and stack at accessibility text sizes, as in `ConfirmSheet`.
- **The look:** the page colour (`background`). The title on the left, a Close icon button (`close`, `brand`, 44 × 44, its cross on the content's right edge) on the right, then the content with 16 pt (`md`) around it, centred at 560 pt on an iPad. Room at the bottom for the home indicator (iOS) or the navigation bar (Android), keyboard up or down; on Android the sheet starts under the status bar, with room for it.
- **While a confirmation runs** (`confirm.busy`): nothing closes the sheet. Close is disabled; the swipe and the Back button do nothing.
- **Keyboard:** the content always scrolls above the keyboard, and a tap on a button works while the keyboard is up. iOS moves the content itself. On Android the sheet's window is asked to fit the system bars, so Android shrinks it above the keyboard; on a phone that still draws it under the keyboard (Android 15 and later draw every window edge to edge), the sheet makes room for the keyboard itself.
- **Its state:** hiding a sheet (for the lock, or when it closes) removes its content, so whatever the content kept in its own state is gone. Keep a sheet's state (typed text, its step, a new secret) in the component that draws the `Sheet`, never inside its children.
- **Screen readers** stay inside the sheet while it's up (it's its own window, and it says so with `accessibilityViewIsModal`). They start on its title, and move to the new title when it changes step (the confirmation, or back).
- **Motion:** the system's slide; its cross-fade with Reduce Motion; nothing at all when the lock hides it (see [Motion](#7-motion)).

```tsx
const sheet = useSheetVisible(open);

<Sheet
  visible={sheet}
  title={key.name}
  onClose={close}
  confirm={
    deleting
      ? {
          title: `Delete ${key.name}?`,
          message: "Servers created after this won't accept this key. Servers that already have it keep it.",
          confirmLabel: 'Delete',
          busy,
          onConfirm: remove,
          onCancel: () => setDeleting(false),
        }
      : null
  }
>
  <Stack>
    <Section>
      <ListRow title="Fingerprint" trailing={{ type: 'text', text: key.fingerprint, onCopy: copy }} />
    </Section>

    <Section>
      <ListRow title="Delete key" icon="trash" destructive onPress={() => setDeleting(true)} />
    </Section>
  </Stack>
</Sheet>
```

### ConfirmSheet

A sheet that asks before an action that stops, restarts, replaces, redeploys or deletes something, or a job's `Run now` (see [Confirmations](#confirmations)).

- **Use it for:** a confirmation asked from a screen (a resource's reboot, stop, replace or delete).
- **Don't:** open it from a sheet: there, use that sheet's `confirm` (the same look, as its second step); write "Are you sure?", "OK" or "Yes".
- **Props that matter** (all **required** except `busy` and `disabledReason`):
  - `visible`: `{ open, lockCovers }`, from `useSheetVisible(open)`, as for a `Sheet`.
  - `title`: the question, naming the resource: "Reboot web-prod-1?".
  - `message`: one plain sentence on what will happen.
  - `confirmLabel`: the action's verb ("Reboot", "Delete", "Replace").
  - `busy`: while the action runs. The verb's button shows a spinner, both buttons are disabled, and nothing closes the sheet. Default `false`.
  - `disabledReason`: the verb's button is off, and these words say why, once, in a centred `caption` `muted` line 8 pt under the buttons: `You're offline` (the phone went offline while the question was up). `Cancel` still works.
  - `onConfirm`, `onCancel`. Close, a swipe down and Back cancel too.
- **The layout:** the question (the title) and the Close button at the top, the message under them, and the buttons at the **bottom of the sheet**, above the home indicator (the safe-area bottom inset + 16 pt, like any sheet's content), where the thumb is. A spacer that takes the free room (`flexGrow: 1`, at least 20 pt) sits between the message and the buttons; the sheet's scroll content is at least as tall as the sheet (`flexGrow: 1`). A message taller than the sheet (a long one, or the largest text sizes) scrolls, and the buttons follow it, 20 pt under it: nothing floats over the message and nothing is cut.
- **The buttons:** `Cancel` (`secondary`) then the verb (`primary`), both `size="md"`, side by side in a `Stack direction="row"` with no `align`, so they are always the same height, and sharing the row equally (`fill`), so they end on the content's edge. At accessibility text sizes (above `accessibilityTextScale`) they stack, the verb first. There is no red button: the verb says what will happen.
- Screen readers hear the question as a header, then the message, then the two buttons.

```tsx
const asking = useSheetVisible(askingToReboot);

<ConfirmSheet
  visible={asking}
  title="Reboot web-prod-1?"
  message="It will be unavailable for a minute or two."
  confirmLabel="Reboot"
  onConfirm={reboot}
  onCancel={() => setAskingToReboot(false)}
/>
```

### TextField

A labelled box to type in: the label above, the field, and an error under it when there is one.

- **Use it for:** the short forms in sheets: an SSH key's name and public key, an API key's description.
- **Don't:** use it to pick from a list (use `ListRow` `check`); rely on the placeholder alone to say what to type.
- **Props that matter:**
  - `label` (**required**): above the field (`subhead`, `muted`), and the field's name for screen readers, who hear it once, on the field.
  - `value`, `onChangeText` (**required**).
  - `placeholder`: an example, in `textMuted` ("My laptop").
  - `multiline`: room for four lines (they grow with the text size), for a long value like a public key.
  - `monospace`: the monospace font (see [Typography](#3-typography)), with autocorrect and spell check off. For keys.
  - `error`: under the field, in `subhead` `danger`, and the border turns `alertText`. Screen readers hear it when it appears (a `polite` live region, plus an announcement on iOS), and again whenever they come back to the field (its hint). Use the task's exact words (`Paste your public key.`). Show it once the person leaves the field after typing or pasting, right after a paste, or when they try to send; never while they type (see [Forms](#forms)).
  - `autoCapitalize`: `sentences` (the default), `none` (keys), `words` or `characters`.
  - `maxLength`.
  - `disabled`: while the form is sent: faded to 50%, can't be edited, and screen readers hear "disabled".
  - `onBlur`: the person left the field. A form checks a field then (see [Forms](#forms)), not at every keystroke.
- **The look:** a `surface` box with radius `md` and a 1 pt `fieldBorder` border (a grey at 3:1 or more, so you see the field before you tap it) that turns `brand` while you type; `body` text, 16 pt in from the sides; at least 44 high. No Android underline inside it.

```tsx
<TextField
  label="Public key"
  value={publicKey}
  placeholder="ssh-ed25519 AAAA… you@example.com"
  onChangeText={setPublicKey}
  multiline
  monospace
  autoCapitalize="none"
  error={keyError}
/>
```

### SecretBox

A secret shown once, to copy now: its label, a `Copy` button, and the value in a highlighted box.

- **Use it for:** a new API key's access key and secret key, right after it's created.
- **Don't:** use it for a value that can be seen again (use a `ListRow` with `onCopy`); store or log the value, or send it anywhere but the clipboard.
- **Props that matter** (all **required** except `hidden`):
  - `label`: what it is ("Secret key"), in `subhead` `muted`.
  - `value`: the secret, in `body` and the monospace font, on `highlightBackground` (radius `md`, 16 pt inside). It wraps when it's long.
  - `onCopy`: called with `(value, { sensitive: true })`. The screen passes both straight on to its clipboard and returns its promise (`(text, options) => clipboard.copy(text, options)`); `sensitive` hides a secret from Android's clipboard preview. The flag comes from here, so a screen that passes both on can't get it wrong. `ClipboardPort.copy` requires the flag, so no copy can forget to say whether it's a secret.
  - `hidden`: the box shows a fixed row of dots instead of the secret, and `Copy` is disabled; screen readers hear "Hidden". The screen sets it while the app is inactive or in the background (from `useAppActive()`, never `AppState` in a screen: the app switcher, Control Center), so the phone's snapshot of the app never shows the secret, and once it has dropped the secret (its sheet slides away showing dots). Default `false`.
- **Screen readers never read the secret out** (in public, character by character): the box is one element named "Hidden. Use Copy to paste it.", without the value. The `Copy` button is how a screen reader user takes it.
- **The button:** `Copy` with the `copy` icon (`secondary`, `size="sm"`), at the end of the label's row. Once the screen's copy is done, it says `Copied` with the `check` icon and screen readers hear "Copied"; pressing again copies again, and a new value starts again at `Copy`. Screen readers hear it as "Copy Secret key" (then "Copied Secret key"), so two boxes are told apart. No toast (see [Sheets](#sheets)).

```tsx
<SecretBox
  label="Secret key"
  value={secret}
  onCopy={(text, options) => clipboard.copy(text, options)}
  hidden={away}
/>
```

### Toast

A short success that comes and goes by itself: an `inverse` `Pill` near the bottom, above the tab bar.

- **Use it for:** a success whose result isn't in sight: "SSH key added", "SSH key deleted".
- **Don't:** use it for a failure (failures show the quiet failure line under their action, see [Errors in plain words](#errors-in-plain-words)), for a copy (copy controls say `Copied` in place), for something to act on (it can't be tapped), or while a sheet is up (it would sit under the sheet: close the sheet first).
- **Props that matter** (all **required**):
  - `message`: a few words. Keep it while the toast fades out.
  - `visible`: shows or hides it. The app's `useToast` shows it for 2 s.
- **Where:** drawn once, by the root layout, inside the lock (under the lock screen and its `ScreenReaderShield`, never above them). It floats `tabBarLayout(insetBottom).clearance` above the bottom of the screen, centred, at most 560 pt wide, above the screens and below an `Overlay`. Taps go through it.
- **Motion:** it fades in while it rises 8 pt (`toastRise`, over `base`), and fades out (`base`). With Reduce Motion, only the fade.
- **Screen readers** hear the message when it appears: an announcement on both platforms (Android wouldn't re-read a live region for the same words twice in a row, "SSH key added" then "SSH key added"). Hidden, they can't reach it.

### ScreenHeader

The top of a screen without a purple header: a back chevron when the screen was pushed, the title, and an optional action on the right.

- **Use it for:** the first thing on every screen without a purple header: Account (the title alone) and the screens pushed from it (Activity, About, SSH keys, API keys, with Back); the Resources tab, a product's list and a resource's screen (its name, with Back and the pin).
- **Don't:** use it on Home or Billing (their title sits on the purple header); use `SectionHeader` as a screen title, or this for a part of a screen; give it more than one action.
- **Props that matter:**
  - `title` (**required**): in `title` style; screen readers hear it as a header. A long one wraps.
  - `onBack`: adds a `chevron-left` icon button, named "Back".
  - `action`: `{ icon, label, onPress, disabled?, selected? }`, one icon button on the right. `label` is what screen readers say ("Add SSH key"). `disabled` while offline, with the caption `You're offline` under the header, lined up at the end, under the button it explains.
  - `action.selected`: for an on/off action, the pin: `true` draws it in `brand` and screen readers hear `selected`; `false` draws it in `textMuted`. The screen passes the filled `star-filled` while it's on and the outline `star` while it's off, so the shape changes too. Its `label` says what a tap does ("Unpin from Home" / "Pin to Home"), and the screen says it in words too (`DetailHero pinned`), so the colour is never the only signal. Leave it out for a plain action. Pinning works offline (it's kept on the phone).
- **The look:** a row at least 44 high: the Back button, the title, the action. Both buttons are 44 × 44, their icons in `brand` (an on/off action that is off: `textMuted`), drawn on the content's edges (the chevron on the left edge, the action on the right edge, like "See all ›"); they dim to 80% while pressed and fade to 50% when disabled. When the title wraps, the buttons stay next to its first line.
- It comes first in a `Screen topInset="belowNotice"`, so the offline pill never covers it.

```tsx
<Screen topInset="belowNotice">
  <Stack>
    <Stack gap="xxs">
      <ScreenHeader
        title="SSH keys"
        onBack={router.back}
        action={{ icon: 'plus', label: 'Add SSH key', onPress: openAdd, disabled: !online }}
      />

      {online ? null : (
        <Text variant="caption" tone="muted" align="end">
          You're offline
        </Text>
      )}
    </Stack>

    <Section>…</Section>
  </Stack>
</Screen>
```

### DetailHero

The top of a resource's screen, right under its `ScreenHeader` (which holds the name): what the resource is, and how it's doing.

- **Use it for:** the first card of every resource's screen (a server, a cluster, a database…), in the order of [Detail screens](#detail-screens).
- **Don't:** repeat the name in it (the `ScreenHeader` title says it); put actions or facts in it (they come below: a `Section`, then the `ActionGrid`).
- **Props that matter** (all **required** except `pinned`):
  - `product`: which product it is (the `Product` type). It sets the tile's colours and icon, as on a `ResourceCard`.
  - `subtitle`: what it is and where, in `body` `muted` ("PRO2-S · fr-par-1"). A long one wraps.
  - `statusLabel` and `health`: the status, drawn as its `StatusPill`.
  - `pinned`: `true` adds the filled star (`star-filled`) in `brand` and the word `Pinned` (`caption`, `muted`) after the Pill, so being pinned is said in words, not only by the header's star colour. Default `false`.
- **The look:** a flat `Card` (it sits on the page, nothing overlaps: see [Elevation](#6-elevation)), the 44 pt tile (`sizes.productTileLarge`, radius `md`) on the left, then the subtitle above the Pill. At large text sizes the words wrap next to the tile; the Pill and `Pinned` go on the next line when they no longer fit side by side.
- **Screen readers** hear one phrase: "PRO2-S · fr-par-1, Running, Pinned".

```tsx
<ScreenHeader
  title={server.name}
  onBack={router.back}
  action={{
    icon: pinned ? 'star-filled' : 'star',
    label: pinned ? 'Unpin from Home' : 'Pin to Home',
    onPress: togglePin,
    selected: pinned,
  }}
/>

<DetailHero product="instances" subtitle="PRO2-S · fr-par-1" statusLabel="Running" health="ok" pinned={pinned} />
```

### ActionGrid

A resource's actions: equal buttons, two per row, at the bottom of its screen.

- **Use it for:** the actions of a resource's screen (Power off, Standby, Reboot, Back up…), or of a sheet about a part of it (a Kubernetes node: Reboot node, Replace node). Last on the screen (see [Detail screens](#detail-screens)).
- **Don't:** use it for a screen's one main action (a `primary` `Button`), for a form's button, or for create or delete actions (never on a resource, see [Detail screens](#detail-screens)); build a row of action buttons by hand.
- **Props that matter:**
  - `actions` (**required**): `{ key, label, icon, disabled? }[]`, in the order to show. `label` is a verb ("Power off"); `icon` one of the action icons (`power`, `moon`, `restart`, `backup`, `redeploy`, `replace`, `run`, `stop`: one meaning each, see [Icons](#8-icons); `stop` is kept for a future button). `disabled`: this action is off on its own: the status doesn't allow it right now, so it stays in the grid, off, never hidden (see [Detail screens](#detail-screens)).
  - `onPress` (**required**): called with the tapped action's `key`. The screen asks first (`ConfirmSheet`, or a sheet's `confirm`) for anything that stops, restarts, replaces or redeploys something, and for `Run now`, naming the resource (see [Confirmations](#confirmations)).
  - `disabledReason`: every button is off, and these words say why, once, in a centred `caption` `muted` line 8 pt under the grid: `You're offline`; or, when the status allows none of them, `Wait until the {server | node | database | container | function} is ready` (while it changes) or `Not available right now` (locked, in error, unknown). Offline wins. The screens build these words in one place (`statusReason`, in `apps/mobile/src/features/resources/`).
  - `note`: when the status allows some actions and not others, why the others are off, in the same caption line (`The server is stopped`, `The server is on standby`, `Some actions aren't available right now`). It turns nothing off itself (the buttons do it with `disabled`). A `disabledReason` is said instead when both are given: one caption at a time. An action is never off without its reason.
  - `busyKey`: the key of the action that runs: its button shows its spinner (and isn't faded: busy isn't unavailable), and every other button waits (disabled), so a second tap sends nothing. `null` or left out when nothing runs.
- **The look:** `secondary` buttons (the screen keeps its one `primary`), all `size="md"`, with their icon. Two per row in a `Stack direction="row"` with no `align`, sharing the row equally (`fill`): every button has the same width, and the two of a row the same height, also when a label wraps. A lone last button keeps half the width. 8 pt between buttons and between rows.
- **At accessibility text sizes** (above `accessibilityTextScale`) it's one button per row, in the order given, so "Power off" never breaks mid-word.
- **Screen readers** hear each button with its label and state (`disabled`, `busy`), then the caption.
- A failure shows the quiet failure line right under the grid (`ActionFailed`); a success, the screen's toast.

```tsx
<ActionGrid
  actions={[
    { key: 'poweroff', label: 'Power off', icon: 'power' },
    { key: 'stop_in_place', label: 'Standby', icon: 'moon' },
    { key: 'reboot', label: 'Reboot', icon: 'restart' },
    { key: 'backup', label: 'Back up', icon: 'backup' },
  ]}
  onPress={ask}
  busyKey={running}
  disabledReason={online ? undefined : "You're offline"}
/>
```

### FloatingTabBar

The icon-only tab bar that floats above the bottom of the screen: a compact, see-through, blurred capsule, from the owner's reference.

- **Use it for:** the four main tabs (Home, Resources, Billing, Account). It's drawn once, by the tabs layout.
- **Don't:** add it inside a screen; give it text labels; give it more than four tabs.
- **Props that matter:** `items` (**required**: `{ key, icon, label }`, the label is read by screen readers, not shown), `activeKey` (**required**), `onSelect` (**required**).
  - `entrance`: `'hidden'` under the start-up splash (it waits just below the screen's bottom edge), `'enter'` as the splash leaves (it slides up into place with Home's cards: `splashEntranceDelay`, then `splashEntrance`, `enter`), `'shown'` when no splash plays (the default: it's simply there). The tabs layout passes `useSplashEntrance()`. Once started, it slides to the end. **With Reduce Motion** it doesn't slide: it's simply there as the splash fades.
- **The look:** as wide as its tabs, not stretched across the screen, and centred (on an iPad too): one 68 × 44 slot per tab (`sizes.tabItemWidth` / `tabItemHeight`), inside 4 pt (`xxs`) of padding and the 1 pt `tabBarBorder`, so four tabs make it 282 × 54. Fully round (`pill`), over a blur with `tabBarBackground`, no shadow (see [Elevation](#6-elevation)). Icons only (`md`): the active one in `tabActiveIcon`, the others in `tabIdleIcon`.
- **The active tab** has a wide capsule behind its icon (`tabActiveBackground`, fully round) that fills its slot: 68 × 44, 4 pt inside the bar's border (5 pt from its outer edge). Tapped, the capsule jumps to the new tab, with no motion.
- It sits above the home indicator (at least 18 pt from the bottom) and is 54 high. `tabBarLayout(insetBottom)` gives its position and the space screens must leave under their content (`Screen` does this for you). Only a very narrow window (narrower than 354 pt, an iPad split view) brings it to 36 pt from the sides (`tabBarInset`); its slots then narrow, never under 44.
- Each slot is the tab's touch area, 68 × 44 (at least 44 × 44), so it needs no `hitSlop` (see [Accessibility](#touch-targets)). A tab dims to 80% while pressed, like everything tappable.
- Screen readers hear the row as a tab list (`tablist`) and each item as a `tab`, with the active one `selected`.

### LogoMark

The Scaleway Manager logo (the rounded shape with the gear), in white.

- **Use it for:** purple screens only: the splash and the privacy cover (`sizes.logoSplash`, 96, both centred), Welcome and the lock screen (`sizes.logoHero`, 72). On Welcome and the lock screen it sits in an `AnimatedSplashLogoSlot`, so the splash's logo can glide into it at start-up.
- **Don't:** recolour it, stretch it, or put it on a light background.
- **Props that matter:** `size` (**required**): the width; the height follows. Screens pass a token (`sizes.logoHero`), never a number.
  - `onTripleTap` (optional): a hidden triple tap, three taps each within half a second of the one before (slower taps start the count again). Welcome uses it to open the demo. The logo looks the same, can't be focused, and the tap area is just the logo.
- It's decorative: screen readers skip it, on iOS and Android alike. It does not dim when tapped: that is on purpose (no visual hint), an exception to "anything tappable dims". Screens show the name as text (Welcome's and the lock screen's title).

### AnimatedSplash

The start-up screen, called "Signature". It starts exactly like the phone's still splash (purple, the logo 96 pt wide in the middle), writes the app's name in under the logo, then hands over to the first screen. About two seconds, only when the app starts fresh. It follows an approved mockup.

- **Use it for:** app start, once, above everything else. `SplashGate` (in `apps/mobile/src/features/splash/`) draws it.
- **Don't:** use it anywhere else, or as a loading screen later on.
- **Props that matter:**
  - `phase` (**required**): `'waiting'` (it plays its intro, then holds), then `'leaving'` (the hand-over).
  - `target` (**required**): where it lands. `'header'`: Home's header. `'screen'`: a full-screen purple page (Welcome, the lock screen).
  - `headerHeight` (**required**): how tall Home's header is, so with `'header'` the purple lands on it exactly. `SplashGate` passes the header's measured height as soon as Home reports it (`Screen onHeaderHeight`; a long name that wraps, the room made for the offline pill), and `useHomeHeaderLayout().height` until then.
  - `logoTarget`: with `'screen'`, where that page's own logo sits (`{ x, y, width, height }`, in points from the top-left corner of the screen). The page tells it through `AnimatedSplashLogoSlot`. Without it, the logo fades out instead of gliding: it never goes to a wrong place.
  - `onFinished` (**required**): called once, when the hand-over ends.
- **The intro** (times from the moment it appears; the tokens are in [Motion](#7-motion)):
  1. After 150 ms (`splashRiseDelay`) the logo rises about 60 pt and shrinks to 82%, with a soft spring: it goes a little past its spot, then settles back (`splashRise`, 600 ms, `overshoot`). At the same time the header gradient comes in over the flat purple, so the name is written on the gradient, as in the mockup.
  2. The name writes itself in under the logo, on two centred lines: "Scaleway" in bold, then "MANAGER" in light, spaced capitals (`brandTypography`, 40 pt). Each letter fades in, rises 20 pt into place and comes out of a soft blur (`splashLetter`, 420 ms, `enter`), one letter every 36 ms (`splashLetterStagger`). "Scaleway" starts at 380 ms (`splashNameDelay`), "MANAGER" 240 ms later (`splashLineDelay`). The name is done at about 1.25 s.
  3. It holds. No separator line, no glint, no loading dots: if the app needs longer, the finished name simply stays (up to 2.5 s, see the waits in [Motion](#7-motion)).
- **The blur** is drawn on Android 12 and later (React Native's `filter: blur`). React Native can't draw it on iOS yet, so there the letters only fade and rise (the same on Android 11 and older).
- **The hand-over** (`splashHandOver`, 600 ms, `glide`) goes one of three ways:
  - **Home (signed in):** the purple shrinks into Home's header (`headerHeight` high, its bottom corners rounding to 28 pt), while the logo and the name glide up about 230 pt, shrink to 70% and fade out (from 100 to 400 ms into the hand-over: `splashFadeOutDelay`, `splashFadeOut`). Then the purple fades over Home's own header (`splashPurpleFade`, 200 ms).
  - **Welcome (signed out) and the lock screen (locked):** the logo glides from its spot into the exact place and size of that screen's logo, while the name fades and moves up. The purple then fades over the screen, which is the same gradient (the last 200 ms). The screen's own logo stays hidden until the splash is gone, so there is never a double logo, and its title, text and buttons fade and rise in one after the other (see [AnimatedSplashEntrance](#animatedsplashentrance)).
  - **No place for the logo** (the screen didn't say where its logo is in time): the logo glides up and fades out as on Home, while the purple fades over the screen. The screen's own logo stays visible under the fading purple.
- **Once started, the hand-over never goes back,** even if the app changes its mind mid-way. If the screen the logo glides to goes away (Face ID unlocks during the hand-over, so the lock screen is gone), the logo fades out where it is (`splashFadeOut`) instead of landing on an empty spot.
- **With Reduce Motion:** no rise, no letters, no blur. The logo stays still where the native splash put it, and, after 150 ms (`splashRiseDelay`), the whole name fades in under it (250 ms, `base`, with the gradient). It holds (the hand-over may start at 0.8 s), then the whole splash fades out (250 ms). The screens behind show normally.
- **The name** is part of the logo: it keeps its size whatever the phone's text size (`allowFontScaling={false}`, the one exception in [Typography](#3-typography)), and screen readers skip it, like the logo. The app behind is wrapped in `ScreenReaderShield` while the splash is up.
- While waiting it blocks taps, so none reaches the hidden screen behind it; while leaving it lets them through.

### AnimatedSplashLogoSlot

Holds the logo of a screen the splash can land on (Welcome, the lock screen), so the splash's logo can glide into its exact place.

- **Use it for:** around the `LogoMark` of Welcome and the lock screen, only.
- **Don't:** use it anywhere else: it only matters at start-up.
- **Props that matter** (all **required**):
  - `hidden`: `true` while the splash's logo stands in for this one, so there are never two logos. The logo keeps its place; it just isn't drawn.
  - `onPlace`: gets the logo's place on screen (`{ x, y, width, height }`) once it's laid out (React Native's `measureInWindow`). A failed measure (all zeros) is ignored: no place is better than a wrong one.
  - `children`: the `LogoMark`.
- It hugs the logo instead of stretching across the column, so the place it gives is the logo's own.
- Screens connect it with `useSplashHandOver('welcome')` or `useSplashHandOver('lock')` (`apps/mobile/src/features/splash/SplashHandOver.ts`): `<AnimatedSplashLogoSlot hidden={splash.logoHidden} onPlace={splash.onLogoPlace}>`.

### AnimatedSplashEntrance

One block of Welcome's or the lock screen's content (the title, the text, the buttons), or one of Home's cards, that comes in as the splash leaves.

- **Use it for:** each block of Welcome's and the lock screen's content, in reading order; Home's cards under the header (the "by product" card is `'first'`), which rise in while the splash's purple settles into the header. Home gets the state from `useSplashEntrance()`.
- **Don't:** use it on other screens, or for anything after start-up; wrap a `SectionHeader` or a `Carousel` in it (they must stay direct children of the content column, see [Carousel](#carousel)).
- **Props that matter** (all **required**):
  - `state`: `'hidden'` while the splash covers the screen, `'enter'` as the splash leaves, `'shown'` when no splash plays (after Log out, or a lock after five minutes away): the content is then simply there, with no animation. Screens pass `splash.entrance` from `useSplashHandOver`.
  - `order`: `'first'`, `'second'` or `'third'`: its turn. Each block fades in and rises 20 pt into place (`splashEntrance`, 420 ms, `enter`), 90 ms after the one before (`splashEntranceStagger`), starting 250 ms into the hand-over (`splashEntranceDelay`).
  - `children`.
- Once started, it plays to the end, even if the splash is gone before.
- **With Reduce Motion:** the content simply shows, with no wait and no rise (`SplashGate` gives `'shown'` then anyway).

### StatusBar

The phone's clock, battery and signal icons at the very top of the screen. It sets their colour.

- **Use it for:** the whole app, **once**, in the root `_layout.tsx`.
- **Don't:** draw it inside a screen or a feature: tabs stay mounted, so several would fight over the colour; or import `expo-status-bar` in `apps/mobile`. (The gallery has a demo of it, in development builds only.)
- **Props that matter:** `onBrand` (**required**): `true` while purple is under the status bar, which makes the icons light (white); `false` elsewhere, which makes them follow the theme: dark in light mode, light in dark mode. See [The status bar](#the-status-bar) for who decides.

### Theme and helpers (not in the gallery)

- `ThemeProvider({ preference })`: wraps the whole app once. `preference` is `'system'`, `'light'` or `'dark'`.
- `useTheme()`: gives `scheme`, `colors`, `spacing`, `radii`, `typography`, `motion`, `sizes` and `reduceMotion` (the phone's Reduce Motion setting, read from Reanimated's `useReducedMotion()`). Components in `packages/ui` style themselves with it; screens never use it for styling. `apps/mobile` reads `reduceMotion` and `motion` from it for screen transitions (see [Motion](#7-motion)).
- `tabBarLayout(insetBottom)`: `{ bottom, height, clearance }` for the floating tab bar.
- `noticeLayout(insetTop, fontScale)`: `{ top, clearance }` for the floating offline pill.
- `homeHeaderLayout(insetTop, fontScale)`: `{ height }`, Home's header online (see [Spacing](#4-spacing)); `useHomeHeaderLayout()` gives it for this phone (its status bar and text size). Home uses it as its floor and `SplashGate` as its first guess, until Home reports the header's measured height.
- `contrastRatio(foreground, background)`: the WCAG contrast between two colours, from 1 to 21. Colours are `#RRGGBB` or `rgba(r,g,b,a)`; a see-through foreground is laid over the background first, and the background must be opaque.
- `compositeOver(color, background)`: the `#RRGGBB` you see when a see-through colour sits on an opaque one (for example the tab bar over the page).
- The tokens (`spacing`, `radii`, `sizes`, `motion`, `typography`, `brandTypography`, `monoFont`, `accessibilityTextScale`, `palette`, `lightColors`, `darkColors`) and the two contrast functions are also exported from `@scaleway-manager/ui/tokens`.
- The types `SheetVisibility` (`{ open, lockCovers }`, a `Sheet`'s `visible`) and `SheetConfirm` (a `Sheet`'s `confirm`), for the app's lock-aware hook and its sheets.

---

## 10. Patterns

### Layout

**Screens arrange content only with `Stack`, never with styles.** `apps/mobile` has no `View` and no `style` (see [Rules](#13-rules), rule 2), so every gap, every side margin and every row of buttons is a `Stack` prop.

- `Screen` gives the page, the status bar space and the 16 pt sides. Inside it, a `Stack` sets the space between things (16 pt by default).
- Things side by side go in a `Stack direction="row"`; pills or chips that may run out of room add `wrap`.
- A part that should take the free space (the text next to an icon) is a `Stack grow`.
- Padding comes from `Stack` too (`paddingHorizontal="md"` under a full-bleed header, `padding="lg"` inside the header).
- **A purple header under the status bar** (Home, Welcome): `<Screen topInset="none" padded={false}>` with `<HeaderBackground insetTop>` first. The purple starts at the very top of the screen and reaches both edges (on an iPad too), and `insetTop` keeps the header's content below the status bar. Home's header is `<HeaderBackground minHeight={useHomeHeaderLayout().height} insetTop noticeShown={…} overlapped>` (its content slides below the offline pill while it shows, and stays clear of the card that overlaps it), and Home's cards sit in a `<Stack paddingHorizontal="md" overlapHeader contained>` (both overlap props only while the "by product" card is there: see [Home, below the header](#home-below-the-header)). Welcome fills the screen: `<Screen topInset="none" bottomInset="none" padded={false} withTabBar={false} scroll={false}>` with `<HeaderBackground fill insetTop insetBottom dots>` (see [Screen layout with header and floating tab bar](#screen-layout-with-header-and-floating-tab-bar)).
- **A tab without a purple header** starts its content below the offline pill: `<Screen topInset="belowNotice">`, with its `ScreenHeader` first (Account, Resources, and the screens they open); its loading, empty and failed states sit under the header, like any content. A screen whose only content is an `EmptyState`, with no header, may centre it instead: `<Screen scroll={false}>` with `<Stack grow justify="center">` (none does today).
- If `Stack` can't express a layout, the missing piece is added to `packages/ui` first (rule 3), never built in the screen.

```tsx
<Screen topInset="belowNotice">
  <Stack>
    <Section title="Security">…</Section>

    <Section>…</Section>
  </Stack>
</Screen>

<Screen
  topInset="belowNotice"
  rows={{
    title: project.name,
    data: servers,
    rowKey: (server) => server.key,
    renderRow: (server) => <ListRow title={server.name} trailing={{ type: 'status', … }} onPress={…} />,
  }}
>
  <ScreenHeader title="Instances" onBack={router.back} />
</Screen>
```

### Screen layout with header and floating tab bar

```
+------------------------------+
|  purple header (gradient)    |  HeaderBackground, under the status bar,
|  chip · big number · chart   |  rounded bottom corners (28)
+------------------------------+
   +------------------------+     cards: 16 from the sides,
   |  card                  |     16 between them
   +------------------------+
   +------------------------+
   |  card                  |
   +------------------------+
       ( o   o   o   o )         FloatingTabBar, floating
```

```tsx
const homeHeader = useHomeHeaderLayout();

<Screen topInset="none" padded={false} onHeaderUnderStatusBar={setHomeHeaderUnder} onHeaderHeight={reportHeaderHeight}>
  <HeaderBackground minHeight={homeHeader.height} insetTop noticeShown={noticeShown} overlapped>
    <Stack paddingHorizontal="lg" gap="sm">…</Stack>
  </HeaderBackground>

  <Stack paddingHorizontal="md" overlapHeader contained>
    <AnimatedSplashEntrance state={entrance} order="first">
      <Card raised>…</Card>
    </AnimatedSplashEntrance>

    <Card>…</Card>
  </Stack>
</Screen>
```

- Every tab screen is a `Screen` (with its default `withTabBar`), so the last card can scroll above the tab bar.
- The header comes first and starts at the very top: `Screen topInset="none"` and `padded={false}`. The header has `insetTop`, so its content starts below the status bar and the Dynamic Island. Content on it uses `onBrand` text and `onBrand` or `ghostOnBrand` buttons.
- The first cards overlap the header's rounded bottom by 28 pt (`Stack overlapHeader`), as in the mockups; the header leaves at least 28 pt free at its bottom for them (`HeaderBackground overlapped`). Only a card may overlap it, in every state: Home without its spending card overlaps nothing (see [Home, below the header](#home-below-the-header)).
- **Home's header, top to bottom** (from the approved mockup, with the sizes `homeHeaderLayout` counts): the `PickerChip` ("Acme · Production", it opens the project picker; "Couldn't load projects" when they failed, and the picker says why with Try again) and the 6M/12M `SegmentedControl` in a `Stack direction="row" justify="between"`; then a `SpendingSummary` (the label, the amount and its comparison, and the organization line "All projects in Acme": the spending is the whole organization's, whichever project is picked); then the `LineChart size="header"`. The `Stack` around them has `gap="sm"` (12 pt) between the chip/switch row and the `SpendingSummary`; the summary and the chart sit together in `SpendingOverview`'s own `Stack gap="md"` (16 pt). `noticeShown` is `true` while the offline pill or the Demo badge is up (`useNoticeShown()`, shared with Billing). Home passes `Screen onHeaderHeight` to the splash (`useHomeHandOver().reportHeaderHeight`) while it's up, so it lands on the real header.
- Content sits 16 pt (`md`) from the screen sides (`Screen` does it, or `Stack paddingHorizontal="md"` under a full-bleed header), with 16 pt between cards and sections (`Stack`'s default gap).
- **On an iPad** the purple header still reaches both edges, and its content is centred at 560 pt. The cards under it use `Stack contained`, so they are centred at the same 560 pt and line up with the header's content.

Welcome is one header that fills the screen, from the very top to the very bottom, with its dot grid behind the content:

```tsx
<Screen topInset="none" bottomInset="none" padded={false} withTabBar={false} scroll={false}>
  <HeaderBackground fill insetTop insetBottom dots>
    <Stack grow justify="between" padding="lg">
      <Stack gap="lg" paddingVertical="xl">
        <AnimatedSplashLogoSlot hidden={splash.logoHidden} onPlace={splash.onLogoPlace}>
          <LogoMark size={sizes.logoHero} onTripleTap={tryDemo} />
        </AnimatedSplashLogoSlot>

        <Stack gap="xs">
          <AnimatedSplashEntrance state={splash.entrance} order="first">
            <Text variant="title" tone="onBrand" accessibilityRole="header">
              Scaleway Manager
            </Text>
          </AnimatedSplashEntrance>

          <AnimatedSplashEntrance state={splash.entrance} order="second">
            <Text variant="body" tone="onBrand">
              Check on your Scaleway cloud from your phone.
            </Text>
          </AnimatedSplashEntrance>
        </Stack>
      </Stack>

      <AnimatedSplashEntrance state={splash.entrance} order="third">
        <Stack gap="xs">
          <Button label="Log in with Scaleway" size="md" variant="onBrand" onPress={logIn} />

          <Button label="Try the demo" size="md" variant="ghostOnBrand" onPress={tryDemo} />
        </Stack>
      </AnimatedSplashEntrance>
    </Stack>
  </HeaderBackground>
</Screen>
```

- **Two buttons in every build:** "Log in with Scaleway", then "Try the demo" (store reviewers and curious users open the demo with it).
- **The hidden triple tap.** Three quick taps on the logo also start the demo, the same way "Try the demo" does (a failure shows the same line). There is no visual hint. The logo stays decorative: screen readers skip it. It is the `LogoMark` `onTripleTap` prop.
- `fill` makes the purple fill the screen, with square bottom corners; `bottomInset="none"` lets it reach the very bottom.
- `insetTop` and `insetBottom` keep the logo and the buttons clear of the status bar and the home indicator.
- On an iPad the purple fills the whole screen, and the logo and buttons are centred at 560 pt (the header does it), so the buttons don't stretch.
- Screens without tabs (Welcome, the gallery) use `withTabBar={false}`.
- **At start-up** the splash's logo glides into Welcome's logo, then the title, the text and the buttons come in one after the other. `const splash = useSplashHandOver('welcome')` gives what the logo slot and the three blocks need (see [AnimatedSplash](#animatedsplash)). Opened later (after Log out), Welcome simply shows.

**The lock screen looks the same, but it isn't a `Screen`.** It's drawn once, by the root layout, above everything: an `Overlay` that isn't dimmed, with the same full-height header inside.

```tsx
<Overlay visible={locked} dimmed={false} announcement="Scaleway Manager is locked">
  <HeaderBackground fill insetTop insetBottom>
    <Stack grow justify="between" padding="lg">
      <Stack gap="lg" paddingVertical="xl">
        <AnimatedSplashLogoSlot hidden={splash.logoHidden} onPlace={splash.onLogoPlace}>
          <LogoMark size={sizes.logoHero} />
        </AnimatedSplashLogoSlot>

        <AnimatedSplashEntrance state={splash.entrance} order="first">
          <Text variant="title" tone="onBrand" accessibilityRole="header">
            Scaleway Manager is locked
          </Text>
        </AnimatedSplashEntrance>
      </Stack>

      <AnimatedSplashEntrance state={splash.entrance} order="second">
        <Button label="Unlock" size="md" variant="onBrand" onPress={unlock} />
      </AnimatedSplashEntrance>
    </Stack>
  </HeaderBackground>
</Overlay>
```

- The app behind it is wrapped in `ScreenReaderShield` while it's up (see [Overlay](#overlay)).
- **At start-up**, when the app opens locked, the splash's logo glides into the lock screen's logo, then the title and the Unlock button come in (`useSplashHandOver('lock')`), as on Welcome. Locking later (after five minutes away) shows it at once.
- **The privacy cover.** With the lock on, while the app is inactive or in the background, `LockGate` draws the same purple with only the logo, centred and splash-sized (`PrivacyCover`: `<Overlay dimmed={false}>`, a hidden `ScreenReaderShield`, `<HeaderBackground fill>` without insets, so the logo sits in the middle of the whole screen like the splash's, a centred `Stack` and `<LogoMark size={sizes.logoSplash} />`), so the app switcher's snapshot never shows any data. No words (the app isn't locked), no announcement, no animation: it comes and goes at once. Every open sheet hides with it (`useSheetVisible`), since a sheet is its own window above the cover, and comes back with the app. It's off when the lock is off, signed out and in demo mode; when the lock is already up, the lock screen is the cover.
- **Android blanks screenshots too.** Android takes its app-switcher snapshot as the app leaves, possibly before the JS cover is drawn. So while the lock is on (and the user is signed in), the lock feature also asks the phone to keep the screen private (`ScreenPrivacyPort.protect()`, Android's `FLAG_SECURE`): screenshots, screen recordings and the app switcher show a blank screen. It's lifted when the lock is turned off, on sign-out, and never set in demo mode (store screenshots come from there). iOS has no such switch; its cover is the JS one above.

### Home, below the header

In the order of the approved mockup, inside the `Stack paddingHorizontal="md" overlapHeader contained` under the header:

1. The "{Month} by product" `Card raised` (it overlaps the header), in an `AnimatedSplashEntrance order="first"`: a `SectionHeader` title (with "Back to now", `chevron: false`, while a past month is shown), then a `BreakdownBar` of the three biggest products and "Other" (core's `topParts`; `loading` while the month loads; a month with nothing spent says so in one `muted` line: "Nothing spent in November so far."). That line is shorter than the loading shape, so in that rare month (a new organization, a quiet past month) the card gets smaller when it arrives: accepted, a placeholder of one line would make every normal month grow instead.
2. One `AlertRow` per firing monitoring alert. None: nothing at all.
3. Scaleway status: a `StatusLine` when nothing affects the project, otherwise one `NoticeCard` per incident (it opens the incident's page in the browser; one that can't open shows the quiet failure line under the cards).
4. Live resources: a `SectionHeader` with "See all", then a `Carousel` of `ResourceCard`s, both direct children of that `Stack` (see [Carousel](#carousel)). While they load, three `ResourceCard loading`; can't load: "Couldn't load your resources" (`LoadFailed`); no access: `EmptyState` `server` "Resources aren't available"; none: "Nothing running yet".

**When a part of Home can't load:**

- **The spending, no access (403):** the header keeps its chip and says "Spending isn't available" and "You don't have access to billing in this organization." in `onBrand` words: no switch, no chart, nothing to try again. **Another failure:** "Couldn't load your spending" with an `onBrand` `Try again` (`md`), and `You're offline` under it while offline. Both sit in the middle of the header's `minHeight` (its content `Stack` has `grow`), so the splash still lands on it.
- **Without the "by product" card, nothing overlaps the header.** Only a card may sit on the purple curve (words there can't be read: the status line would be 1.43:1). So Home passes `HeaderBackground overlapped={false}` and drops `overlapHeader` from its column, which starts 16 pt below the header instead (`paddingVertical="md"`). The alerts, the status and Live resources still load.
- **The projects, can't load:** the chip says "Couldn't load projects" (the picker it opens says why, with Try again), and the alerts, the status and Live resources hide: they follow the project.
- **Offline, `You're offline` shows once:** when the header's Try again says it, Live resources' Try again doesn't (`offlineSaidAbove`).
- **Back from the background,** what is out of date refreshes by itself: this month's and last month's spending after 5 minutes, the alerts after a minute, the status and Live resources after 30 seconds. The alerts' one-minute refresh waits while the app is away, and a quick trip to another app (under 30 seconds) asks nothing again.

### Billing

The Home pattern, with the screen's title on the purple header instead of a `ScreenHeader`: `<Screen topInset="none" padded={false} onHeaderUnderStatusBar={setBillingHeaderUnder}>`.

1. **The header:** `<HeaderBackground insetTop noticeShown={…} overlapped>`, with no `minHeight` (no splash lands there, so it fits its content). In its `<Stack paddingHorizontal="lg" gap="sm">`: a row (`direction="row" justify="between" align="center"`: text next to a control) with the title `Billing` (`Text variant="title" tone="onBrand"`, header role) and the 6M/12M `SegmentedControl`, at 12 months to start with; then the same `SpendingSummary` as Home; then `LineChart size="large"`. No project chip: billing covers the whole organization.
2. **Below it,** in `<Stack paddingHorizontal="md" overlapHeader contained>`: the "{Month} by product" `Card raised` (Home's card, with `showAll`, drawn by `SpendingBreakdown` with its Products / Projects switch, see 3), followed by a `SectionHeader` "All products" and an untitled `Section`, one `ListRow` per product with its amount; then a `SectionHeader` "Invoices" and a `Section` with one row per invoice (`file` icon, `{Month YYYY}`, `Invoice {number} · {state}`, the amount without tax). Both parts are titled the same way, so the screen has one heading look below its card. While the invoices load, the section is a `Section loading` (three placeholder rows, each a `body` line above a `subhead` line, about a row's height).
3. **By product or by project** (read-only: monitoring, nothing to act on). When 2 or more projects spent in the month shown, and the user can see the organization's projects, the card has a `SegmentedControl` **Products | Projects** (`tone="default"`, `accessibilityLabel="Breakdown"`: "Breakdown: Products") on its own line under the title row, 8 pt above the bar (`Stack gap="xs"`). Products is the default and is the card described in 2; the choice isn't saved. The switch has its own line because the title, "Back to now" and the switch don't fit on one row even at the default text size; alone on its line, nothing can collide at any size. With fewer than 2 projects the switch is hidden and the card is by product. Home's card never has it. While a month loads the card keeps no room for the switch, so it grows by the switch's line (about 52 pt) when a month with 2 or more projects arrives: accepted, since the month is usually on the phone already (Home asked for it).
   - **Projects:** the title says "{Month} by project"; the `BreakdownBar` shows the three biggest projects and "Other" (core's `topParts`); then a `SectionHeader` "All projects" and an untitled `Section`, one `ListRow` per project, largest first: its name, and its amount as the chevron's `text` (the row opens a sheet; screen readers hear the button "Production, €65.06"). It follows the month picked on the chart, like the card.
   - **Names** come from the organization's project list (`useWorkspace().projects`). A project that isn't in it is "Unknown project" (its own row and sheet): it may have been deleted, or this user can't see it. When Scaleway refuses the list (403, `useWorkspace().projectsRefused`) or it's empty, there's nothing to name the projects with, so there's no switch, as with one project (a Try again couldn't help). While the list loads, the bar is `BreakdownBar loading` and the rows a `Section loading`: an id is never shown. If the list can't load for another reason, "Couldn't load your projects" (`LoadFailed`, with Try again) takes the bar's place, and there's no list. Offline, its `You're offline` is the screen's only one: the invoices below don't say it again.
   - **Discounts:** Scaleway gives a discount for the whole organization only, so project amounts are before it. In a month with one, a `caption` `muted` "Before discounts" sits 8 pt under the projects' `Section` (`Stack gap="xs"`), and in the project's sheet. No line in a month without one.
   - **A project's sheet:** tapping a row opens a read-only `Sheet` (`useSheetVisible`; it opens from the screen only, see [Sheets](#sheets)) titled with the project's name. In it: a `Card` with "Spent in November 2026 so far" (`subhead` `muted`; "Spent in September 2026" for a past month) above the project's amount (`title`), then its `BreakdownBar` by product; then a `Section` "All products", one row per product with its amount; then "Before discounts" when the month had one. The sheet keeps the project as it was when tapped while it slides away. A project whose products each round to €0.00 (a few sub-cent lines) shows only its amount.
   - **Amounts** are summed exactly from Scaleway's lines, then rounded once per project and per product in a project (like the organization's products), so a project can differ by a cent from the sum of its rounded products. Anything that rounds to €0.00 is left out.
4. **Opening an invoice:** tapping a row downloads its PDF and hands it to the phone's share sheet. That row is `loading` meanwhile, and the other rows are `disabled` (faded: they wait). A PDF that arrives once the lock screen covers the app isn't shared, because the share sheet is its own window above the lock (like a `Sheet`, see [Sheets](#sheets)). A failure shows the quiet failure line right under "Invoices", above the rows, where the newest invoices people open are, not below a long list. **In demo mode** nothing is downloaded: a tap shows the quiet line "Invoices aren't available in the demo." at once (no spinner that leads nowhere). Offline, every row is `disabled`, with one `You're offline` caption under the section (the rows' subtitles are already taken), unless the card above already says it (the spending's Try again, or the Projects view's).
5. **When the spending can't show,** the header keeps only its title, and the overlapping card says why in place of the breakdown: no access, an `EmptyState` `file` "Billing isn't available" (`NoBillingAccess`); another failure, "Couldn't load your spending" (`LoadFailed`) with Try again (which reloads the invoices too). The invoices then show only if they loaded anyway, so the screen says it once. Billing always puts a card first, so its column always overlaps the header.

### Account

A tab without a purple header: `<Screen topInset="belowNotice">`, a `ScreenHeader` titled `Account` (no Back), then, top to bottom:

1. A `Card` with the email (`headline`) and the organization's name (`body`, `muted`); two `Skeleton` lines while they load; "Couldn't load your account" (`LoadFailed`) if the account can't be loaded.
2. `Section` "Workspace": `Project` (a chevron with the project's name as its `text`: it opens the project picker sheet) and, in real mode only, `Switch organization` (chevron; no question first: tapping it opens Scaleway's sign-in page in a fresh, private browser session, and the row is `loading` while that page is open; disabled offline, with `You're offline` as its subtitle; a failure shows the quiet failure line under the row).
3. `Section` "Access": `SSH keys`, `API keys` (`key`) and `Activity` (`activity`), each with a chevron, pushed on Account's own stack.
4. `Section` "Security and display": the Face ID switch (`fingerprint`; hidden in demo mode and without biometrics) and `Appearance` (`appearance`; a chevron with `Follow phone` / `Light` / `Dark` as its `text`). Appearance opens a `Sheet` with a `Section` of `ListRow` `check` rows: a choice is saved, applied to the whole app at once, and closes the sheet; a save that fails keeps it open with the quiet failure line.
5. `Section` "About": `About Scaleway Manager` (`info`, chevron) and `Source code on GitHub` (`github`, `external` trailing: it opens the repository in the phone's browser; if the browser can't open, the quiet failure line shows under the section).
6. The destructive `Log out` / `Exit demo` row, in its own `Section`. **It doesn't ask first, on purpose:** it stops nothing on Scaleway, and logging back in is one tap away (the same as the app has always done). `Switch organization` doesn't ask first either, for the same reason: it signs nothing out until the new organization's login works, so a cancel on Scaleway's page changes nothing.
7. A centred `caption` `Version 3.0.0`.

One sheet at a time: the picker, the appearance and the switch question each open from this screen only.

**Screens pushed from Account** (Activity, About, SSH keys, API keys) keep the tab bar and start with a `ScreenHeader` with Back, in `<Screen topInset="belowNotice">`. Account's stack (`app/(tabs)/account/_layout.tsx`) uses the same transitions as the root (a fade with Reduce Motion), and keeps Account under any of them.

- **Activity:** one `Section` per day, newest first, titled `Today`, `Yesterday`, then `16 November` (the phone's calendar). Each event is a `ListRow`: its title, `{You | Someone else | Scaleway} · {product}` as its subtitle (just the who when there's no product), and its time (`14:05`) as `text` trailing. A failed event adds `· Failed` and its subtitle is `danger` (`subtitleTone`). Pull to refresh (`Screen onRefresh`), only while online; a refresh that fails (pulled, or by itself when the network comes back) shows the quiet failure line above the newest day, and the events stay; the next one that works clears it. While it loads, a `Section loading`; no access: `EmptyState` `activity` "Activity isn't available", "You don't have access to the activity log in this organization."; another failure: "Couldn't load your activity" (`LoadFailed`); nothing yet: `EmptyState` "No recent activity".
- **About:** one `Card` per question: the question (`headline`, a header for screen readers), the answer (`body`); "How do I report a problem?" adds a `secondary` `md` `Open GitHub` button, with the quiet failure line under it if the browser can't open.
- **SSH keys:** the selected project's keys, in one `Section` titled with the project's name. Each key is a `ListRow`: its name, its fingerprint cut to 24 characters (`… · Disabled` for a disabled key) and the date it was added. The header's `plus` adds one (disabled offline, and until the project is known). **Add** is a `Sheet`: `TextField`s `Name` and `Public key` (multiline, monospace), then `Add key`, disabled until the key looks right; the key's error shows once the field is left or right after a paste. Done, the sheet closes and the toast says `SSH key added`. A key's sheet shows `Name`, `Fingerprint` (copyable), `Added`, and for a disabled key `Status` → `Disabled` with a caption saying what it means; then `Delete key` in its own `Section`, which asks first as the sheet's `confirm` (`Delete {name}?`), then `SSH key deleted`. No keys: `EmptyState` "No SSH keys in this project" with `Add SSH key` (offline: disabled, with its `note`). No access: `EmptyState` `key` "SSH keys aren't available", "You don't have access to SSH keys in this project."; can't load: "Couldn't load your SSH keys" (`LoadFailed`).
- **API keys:** the current user's keys, one `ListRow` each: the description (or `No description`), the access key as its subtitle, and `Expires 3 Feb 2027`, `Expired 3 Feb 2026` or `Never expires` as `text` trailing; the header's `plus` creates one (disabled offline, with the caption). **Create** is one `Sheet` with two steps: the form (`TextField` `Description`, a `Section` "Expires after" of `check` rows, 90 days picked, the default project as a caption, `Create key`), then, in the same sheet, `Copy your secret key now` with two `SecretBox`es and `Done`. Until the secret key is copied, closing (Done, Close, a swipe, Back) asks first, as the sheet's `confirm`: "Close without copying?" / "You won't see this secret again." / `Close` (`Sheet holdOpen`). The secret is never cached, saved or logged: it lives in the component that draws the sheet, and is dropped as the sheet closes. While it's on screen it shows dots whenever the app is away (`useAppActive`), and Android keeps the screen out of screenshots and the app switcher (`ScreenPrivacyPort.protect()`, let go after unless the Face ID lock is on). A key's sheet shows its access key (copyable), `Created` and `Expires` (or `Expired`), then `Delete key` in its own `Section`, which asks first as the sheet's `confirm`, naming the key (`Delete {description}?`, or its access key when it has none); done, the sheet closes and the toast says `API key deleted`, as for SSH keys. A key Scaleway won't let anyone delete says so in a caption instead.

### Resources

The selected project's resources. A tab without a purple header: `<Screen topInset="belowNotice">` with pull to refresh (only while online), a `ScreenHeader` titled `Resources` (no Back), then one `Section`, titled with the project's name: one product row per product that has at least one resource, in this order: Instances, Elastic Metal, Kubernetes, Databases, Serverless containers, Serverless functions, Jobs, Load balancers (see [Lists](#lists)). A product's summary counts its resources per health, worst first, in these words: `{n} failing` · `{n} need attention` (`1 needs attention`) · `{n} busy` · `{n} OK` · `{n} stopped` (core's `healthSummary`), with the worst health's dot in front.

- **A product the user can't see** (Scaleway refuses it in every zone) simply isn't listed: no error.
- **A product that failed while others loaded** (another error, or waiting for the network with nothing saved) is never hidden without a word: under the list, "Couldn't load your {products}" (`LoadFailed`, naming them: "Couldn't load your Kubernetes and Jobs") with `Try again`, off while offline with its note (§10 Errors: only that part shows the problem). Serverless containers and functions come in one list from two APIs: one that Scaleway refuses everywhere is left out, one that fails everywhere for another reason fails the list, so both are named ("Couldn't load your Serverless containers and Serverless functions").
- **A refresh that fails** (pulled, or by itself) keeps the products on screen, with the quiet failure line above them, until a later one works.
- While the products load, a `Section loading`; once some are in, one placeholder row stays above them until the rest answer. Nothing loaded and something failed: "Couldn't load your resources" (`LoadFailed`); every product refused: `EmptyState` `server` "Resources aren't available", "You don't have access to resources in this project."; nothing at all (some products may have refused): `EmptyState` `layers` "No resources in this project", "Resources you create on Scaleway show up here."

**Screens pushed from Resources** keep the tab bar and start with a `ScreenHeader` with Back, in `<Screen topInset="belowNotice">`, with pull to refresh (only while online). Resources' stack (`app/(tabs)/resources/_layout.tsx`) uses the root's transitions (`useStackOptions()`, like Account's) and keeps the Resources tab under any of them: a resource opened from a Home card opens inside the Resources tab (the tab bar, the offline pill and the Demo badge stay), and Back goes to the tab's first screen.

- **A product's list** (`/resources/{product}`): its title, then one resource row each, as the screen's `rows` (see [Lists](#lists)): the name, `{detail} · {zone or region}`, the status `Pill` (the star before it when pinned); pinned first, then by name. Its states name the product: "Couldn't load your Instances" (`LoadFailed`), "Resources aren't available" (403), "No Instances in this project" (`EmptyState` `layers`, "Resources you create on Scaleway show up here."). A refresh that fails keeps the list, with the quiet failure line above it, until a later one works.
- **A resource** (`/resources/{product}/{zone or region}/{id}`): see [Detail screens](#detail-screens).
- **Switching project** (from Home or Account) while a resource is open in the Resources tab closes it: the tab goes back to its first screen, for the new project, without switching tab. The resource, its pin and its list belong to the old project.
- **A link to a product the app doesn't know:** `EmptyState` `info` "This resource no longer exists" with `Go back`, never a crash.

### The status bar

**The status bar is light on purple (header, splash, lock) and follows the theme elsewhere.** Dark icons on the purple header can't be read (about 1.5:1).

- The app draws exactly one `StatusBar` (from `@scaleway-manager/ui`), in the root `_layout.tsx`. Tabs stay mounted, so one `StatusBar` per screen would fight; one place decides instead.
- It decides `onBrand` from what is on screen: the splash, the lock cover (deciding or locked), the privacy cover, Welcome, or the Home or Billing tab while its header is under the status bar → `true` (light icons). Anything else → `false`: dark icons in light mode, light icons in dark mode. Screens tell it what it can't see through `useStatusBarReports()` (`apps/mobile/src/features/statusBar/`): Home's and Billing's headers scrolling away, and sheets coming up.
- Pulling Home down past its top shows the header's gradient continuing above it, not the page (`Screen topInset="none"` draws it), so the light icons stay readable during the bounce.
- **Sheets.** A sheet is its own window, with its own status bar, and the rule differs per platform:
  - **Android:** the sheet starts under the status bar, and when it opens it takes the icon colour the screen had: light icons from Home's header would sit on the sheet's light page. So while a sheet is up the decider says `false` (the theme decides). The app's `useSheetVisible` hook is the one place that knows a sheet is open.
  - **iOS:** the page sheet sits below the status bar, which is over the dark gap above the sheet, so the decider stays as it is (a light-mode "theme decides" would put dark icons on that dark gap). Check it on a device in light mode before changing it.
- **Home scrolls.** Once its header has scrolled away, the page is under the status bar, and light icons can't be read on it (in light mode). `Screen onHeaderUnderStatusBar` says when the header leaves and comes back (when its bottom edge passes the middle of the status bar); Home passes it to `useStatusBarReports().setHomeHeaderUnder`, and the decider follows it. Billing scrolls too, and reports its own header the same way (`setBillingHeaderUnder`): each tab's report is kept apart.
- Every sheet's `useSheetVisible` tells the decider while its sheet is up (`sheetShown`), which is how it knows on Android.

### Lists

- A list is a `Section` of `ListRow`s. Several groups mean several sections, each with a short title.
- A row that opens something has a chevron and an `onPress`. When it has a current value (Account's `Project` and `Appearance`), the value sits before the chevron (`{ type: 'chevron', text }`: "Production ›"), never as plain `text` trailing, which looks read-only. A row that only shows a value has `trailing` text. A setting has a switch.
- **A product** (the Resources tab) is a `ListRow` with its `product` tile, its summary as the `subtitle` with the worst health's dot in front (`subtitleHealth`), and its count as the chevron's `text`. **A resource** (a product's list) is a `ListRow` with the `status` trailing (its Pill, the star when pinned, then the chevron). While they load, a `Section loading`.
- **A choice** (one of a few: a project, an expiry, the appearance) is a `Section` of `ListRow`s with `trailing={{ type: 'check', selected }}`, each with an `onPress` that picks it. The `Section`'s title says what is chosen ("Expires after").
- **A value to copy** (an access key, a fingerprint) is a `ListRow` whose `text` trailing has an `onCopy`. A secret shown once is a `SecretBox`.
- Destructive rows ("Log out", "Exit demo") go last, in their own section.
- **A list that can grow long** (a product's resources, a cluster's nodes) is the screen's `rows` (`Screen rows`, a `FlatList`): it looks like a `Section` of `ListRow`s, sits last on the screen, and only the rows near the screen are drawn, so a project with hundreds of servers opens at once and scrolls smoothly. A short or capped list (the products of the Resources tab, a cluster's node pools, the last 24 invoices, the last 50 activity events, a month's projects on Billing, which can't be `rows` anyway: the invoices come after it) stays a `Section` of `ListRow`s.

### Detail screens

A resource's screen (`<Screen topInset="belowNotice">`), top to bottom:

1. A `ScreenHeader`: the resource's name as its `title`, Back, and the pin as its action (the filled `star-filled`, `selected`, while pinned; the outline `star` otherwise; "Unpin from Home" / "Pin to Home").
2. A `DetailHero`: the product's tile, what it is and where, its status `Pill`, and `Pinned` in words when pinned.
3. Its notices, when there are any: one `AlertRow` each (`danger` for what went wrong on Scaleway's side, like a node's error or a failed deployment; `info` for a note, like an upgrade being available).
4. The facts, as a `Section` of rows with `trailing` text ("Zone" → "fr-par-1", "Public IP" → "203.0.113.34"; a value to copy has `onCopy`, and `copyLabel` when rows share a title), then its charts (`MetricChart`), then its lists (node pools, recent runs, backend servers, backups: `ListRow`s with a `status` trailing; a ready backup shows its size instead, any other status is its Pill). A list that can grow long (a cluster's nodes) is the screen's `rows`, last on the screen.
5. The actions, last, as an `ActionGrid` (a stray tap is less likely down there). Actions that stop, restart, replace or redeploy something, and `Run now`, always ask first (see below), naming the resource. Offline, the grid's `disabledReason` says `You're offline`; while one runs, `busyKey`; a failure, the quiet failure line under the grid. **An action the status doesn't allow right now stays in the grid, turned off, never hidden**, so the grid doesn't change shape while the screen polls: Power on and Power off (Start and Stop) share one place, like a switch. An action is never off without its reason: when none can run, the grid's caption says why (`disabledReason`): `Wait until the {server | node | database | container | function} is ready` while it changes, `Not available right now` otherwise (locked, in error); when only some can, the grid's `note` says why the others are off: `The server is stopped` (an Instance or an Elastic Metal server: Standby and Reboot, or Reboot), `The server is on standby`, `Some actions aren't available right now` (Scaleway doesn't allow one). Offline, `You're offline` is said instead, once.

- **A part with nothing in it** is left out (the recent runs of a job that `Never run`, the node pools of a cluster that `Needs a node pool`, a load balancer without backend servers), or, when its absence is worth saying, is one `caption` `muted` line on the page in its place ("No backups yet."); never words inside a `Section`. An empty chart keeps its card, with "—", and its caption under it ("No reachability data yet.").
- **A part that can't load** (node pools, nodes, backups, recent runs, backend servers, the reachability chart) shows `LoadFailed` inside a `Card`, in the part's place ("Couldn't load your node pools", "Couldn't load the reachability"); the rest of the screen stays. **A part Scaleway refuses (403)** is left out, like a product it refuses on the Resources tab or the database charts: trying again can't help, so there's no `Try again`. A sheet whose whole task it refuses says so with the no-access state (the database backup sheet: `EmptyState` `database` "Backups aren't available", "You don't have access to backups in this project.").

- A resource that no longer exists (deleted on the console while its screen was open) shows an `EmptyState` with the `info` icon, "This resource no longer exists" and `Go back`, in place of all of it, and its pin is taken off.
- It opens at once from its list's item (offline too), then refreshes; pull to refresh asks it again (only while online). A refresh that fails (pulled, polled or after an action) keeps it on screen, with the quiet failure line above it, until a later one works. With nothing on the phone yet: a `Section loading`; it can't load: "Couldn't load this resource" (`LoadFailed`); no access: "Resources aren't available".
- **While it changes,** the screen asks again every 3 seconds, for 2 minutes at most: while its health is busy, and after an action until the change shows (Scaleway may answer the old state for a moment). An action with nothing to watch afterwards (a backup leaves the status as it is) asks again once instead (`poll: false`).
- **Home and the product's list show what the screen learns,** at once (polling, a pull, a resource found busy): its item in their cached list is replaced, without asking the list again. After an action's change shows, the list is asked again too.
- **Every action goes through one flow** (`useResourceAction`, in `src/features/resources/`): one at a time (a second tap sends nothing, even in the same frame), the question first when the action needs one, refused offline at the tap itself (nothing is kept for later), then the question closes and the task's toast shows; a failure shows the quiet failure line under the grid, never a toast, and the resource is asked again at once (a request that timed out may still have worked: the screen shows what it does now before anyone tries again). A backup's failure shows in its sheet while it's open, under the grid once it's closed. A sheet's own actions (a Kubernetes node) ask in that sheet's `confirm` step.
- No delete or create actions on a resource (a server, a database…): those stay on the computer. SSH keys and API keys are the exception: they're added, created and deleted from Account, in sheets.
- **Known limit:** a job scheduled only by a trigger (not `cron_schedule`) shows `Runs manually`.

### Confirmations

Every action that stops, restarts, replaces, redeploys or deletes something, and a job's `Run now`, asks for confirmation first. Powering on or starting a server, and taking a backup, ask nothing.

- The question names the resource: **"Reboot web-prod-1?"**
- One sentence says what will happen, in plain words: "It will be unavailable for a minute or two."
- Two buttons, side by side in a `Stack direction="row"` (no `align`, each with `fill`, so they stretch to the same height), with the **same `size`**: a `secondary` "Cancel" and a `primary` with the action's verb ("Reboot"), never "OK" or "Yes". At accessibility text sizes the two buttons stack instead (primary first, like the Face ID prompt), so no label breaks in the middle of a word.
- The question and its sentence sit at the top of the sheet, the two buttons at its bottom, above the home indicator (a page sheet is tall: the buttons stay where the thumb is, not right under a short sentence). A long sentence scrolls, the buttons after it.
- The confirmation is `ConfirmSheet` when it's asked from a screen, or a `Sheet`'s `confirm` step when it's asked from a sheet (see [Sheets](#sheets)), never a one-off view in a feature. Both draw the same thing, with the stacking and the busy state built in: while the action runs, the verb's button shows a spinner and nothing can be pressed or close the sheet. If the phone goes offline while it's up, the verb's button is off with `You're offline` under the buttons (`disabledReason`); `Cancel` still works.

### Sheets

- **One sheet at a time.** iOS can't show a sheet above another sheet: the second one never appears. So a sheet never opens a sheet:
  - a question asked from a sheet ("Delete this key?", "Reboot this node?") is that sheet's second step, its `confirm`;
  - a next step (the new secret after "Create key") is the same sheet with a new `title` and new content;
  - a screen opens a sheet only when no other sheet is up or still closing. `Sheet` has no "closed" callback, so a screen can't tell when one has finished closing: no screen opens a sheet right after another closes. A task that needs it adds `onClosed` (the `Modal`'s `onDismiss`) first.
- **Never above the lock screen.** A sheet is its own window, above the app and above the lock screen. So every sheet's `visible` comes from the app's lock-aware hook: `const sheet = useSheetVisible(open)` gives `{ open, lockCovers: locked || !decided || privacyCover }` from the lock state. While the lock or the privacy cover covers the app the sheet goes at once, and it comes back after unlocking (or once the app is back). `packages/ui` can't read the lock, so this is the contract: a screen never writes `{ open, lockCovers }` itself. Lint enforces it: in `apps/mobile/app` and `apps/mobile/src/features`, building an object with a `lockCovers` property is an error everywhere except `src/features/lock/useSheetVisible.ts` and its test (reading one, `const { lockCovers } = sheet`, is fine).
- **A sheet's state lives above it.** Hiding a sheet removes its content, also when the lock hides it. Keep what it needs (typed text, its step, a new secret) in the component that draws the `Sheet`, so it's still there after unlocking.
- **Copying is confirmed in place.** A `ListRow` copy button turns into a check; a `SecretBox` says `Copied`; screen readers hear "Copied". No toast: copies happen in sheets, and the app's toast sits under a sheet.
- **When the task is done:** the screen closes the sheet, then shows a toast for a success that isn't in sight ("SSH key added"). A failure keeps the sheet open, with the quiet failure line under its button.

### Forms

- A form is a few `TextField`s, then one `md` `primary` button with the verb ("Add key", "Create key"), in a `Stack`, usually in a sheet.
- The button stays disabled until the form can be sent. A field's own problem is its `error`, in the task's exact words, shown once the person leaves the field after typing or pasting in it (`TextField onBlur`; passing through an untouched field says nothing), right after a paste (many characters at once: the value is finished), or when they try to send; never while they type, since every new error is read out. Typing again hides it until the field is left again. A request that fails shows the quiet failure line under the button. Under the button, always in this order: the failure line, then `You're offline` while offline (Add SSH key, Create API key).
- While the form is sent, the button shows its spinner (`loading`) and the fields are `disabled`.
- Every field has its label above it; a placeholder is only an example.

### Loading = Skeleton

- While content loads, show `Skeleton` shapes in the same layout as the real content. On the purple header they use `tone="onBrand"`. The chart, the breakdown, the spending summary, a list of rows, a resource card and a metric chart draw their own (`LineChart loading`, `BreakdownBar loading`, a `SpendingSummary` with `null` values, `Section loading`, `ResourceCard loading`, `MetricChart loading`): screens and sheets never build placeholders from bare `Skeleton`s when one of these fits.
- A lone spinner is never used for content. `Button loading` is for actions. The start-up splash has no loading sign: its finished name simply holds until the app is ready.
- Data already on the phone shows right away; it refreshes quietly in the background, and again when the app comes back from the background (what is out of date and older than 30 seconds: the wiring's `bindFocusManager`).

### Empty = EmptyState

- When there is nothing to show, use `EmptyState`: an icon, a title that says what's missing, and a message that says why or what to do next.
- Add an action only when there is a real next step ("Try again").

### Errors in plain words

- Say what happened and what to do, in everyday words. Never show an error code, a status number or a technical message.
- An error never crashes a screen. If the content can't load, an `EmptyState` with "Try again" replaces it. If only one part fails, only that part shows the problem.
- **Two shared states,** the same on every screen (the product lists use them too):
  - **Can't load:** `EmptyState` `alert`, "Couldn't load your {thing}" (no full stop), `Try again` (`md`), disabled offline with the note `You're offline` right under it (`action.note`). The app draws it with one piece, `LoadFailed` (`src/features/errors/`), never by hand; inside a `Card` when it stands in for one (Account's account, Billing's spending, a part of a resource's screen).
  - **No access (403):** `EmptyState` with the area's own icon, "{Thing} isn't available", "You don't have access to {thing} in this {organization | project}." No button: trying again can't help. Said once per screen. On Home's purple header the same words are text: "Spending isn't available". A part of a resource's screen that Scaleway refuses is left out instead (see [Detail screens](#detail-screens)).
- **Leaving the app:** a row or card that opens the browser shows the `external` mark and the hint "Opens in your browser" (`ListRow` `external`, `NoticeCard`); a browser that can't open shows the quiet failure line, never nothing.
- **The quiet failure line.** An action that fails (Log out, the Face ID switch, "Try the demo") shows one line next to it: `Something went wrong. Try again.`, in `subhead`, `muted` on the page and `onBrand` on purple. On the page it sits right under the action (`ActionFailed` in `apps/mobile/src/features/errors/` draws it, with a task's own words when it gives some: `message`, as Billing's "Couldn't open the invoice. Please try again.", or "Invoices aren't available in the demo."). Which words: `failureWords(error)` (same folder), the one map for every screen: the table below per kind, nothing for `unauthorized`, and Scaleway's own reason (`AppError.reason`) when it refuses the thing itself and says why (400: a bad key, an organization rule; 409: one already there), because trying again can't help. A refusal without Scaleway's words gets the plain ones: never a technical message like "Request failed with status 409". On Welcome it sits above the buttons, where the login error shows. Screen readers hear it when it appears (a `polite` live region, plus an announcement on iOS).
- **Toasts are for successes only** ("SSH key added"). A failure is never a toast: it's the quiet failure line, next to what failed.
- **How it differs from `danger`:** the red `danger` tone is for something that is wrong or risky and needs attention: an alert, an error inside the content, a destructive row. The quiet line is calm on purpose: nothing is broken, the action just didn't work this time, and trying again is enough. So it is never red, and it replaces nothing.
- Suggested words for each kind of error:

| Kind | Say |
| --- | --- |
| `offline` | "You're offline. Connect to the internet and try again." |
| `forbidden` | "You don't have access to this in this organization." |
| `not_found` | "This doesn't exist anymore." |
| `server` | "Scaleway isn't responding right now. Try again in a moment." |
| `unknown` | "Something went wrong. Try again." |
| `unauthorized` | Nothing: the session ended, the app goes back to Welcome. |

Exact copy given by a task always wins (for example the login error: "Login didn't work. Please try again.").

### The offline Pill

- The Pill is wrapped in `FloatingNotice`, so it floats at the top, centred, under the status bar, on every tab.
- **What it may cover:** only purple, never a control or content. A tab without a purple header starts below it with `<Screen topInset="belowNotice">` (Account, Resources), or centres a lone `EmptyState` in the screen: the room under the status bar is the same whether the pill shows or not, so nothing jumps when it comes and goes, and it fits the long label at every text size, even when it wraps onto several lines.
- **The purple header's exception** (Home and Billing; the owner's decision): online, the header is the mockup's, with no room kept for the pill. While the pill (or "Back online", or the Demo badge) shows, the header's content slides down by the pill's room and the purple grows with it; when it goes, the content slides back (`HeaderBackground noticeShown`). So the pill never sits on the chip or the 6M/12M switch, and the header only gives up the room while it's needed.
- **Offline:** an `inverse` Pill (white words on ink; on a dark grey with a light edge in dark mode) with the `wifi-off` icon: "You're offline · showing data from 10:42" (24-hour time), or just "You're offline" when there's no data yet.
- **Back online:** a `success` Pill (white words on the dark green `successBadge`) with the `check` icon, "Back online", for 2 seconds; then it disappears and the data refreshes by itself.
- The last loaded data stays visible while offline.
- Actions are disabled while offline, with the note `You're offline`, once per screen (when an `EmptyState`'s disabled action says it, the header's caption doesn't): as the `subtitle` of a disabled `ListRow` (or, when the subtitles are taken, one caption under the `Section` of disabled rows: Billing's invoices), or as a caption under a group of disabled buttons (`ActionGrid disabledReason`), under a `ScreenHeader` whose action is disabled, or as the `note` of an `EmptyState`'s disabled action. When two parts of a screen failed (Home's header and Live resources; Billing's spending card and its invoices), only the first says it: the second gets `offlineSaidAbove`. Nothing is queued for later.
- Demo mode never shows it. Its place holds the "Demo" badge instead, on every tab, always: an `inverse` Pill with the word `Demo` (a small Demo badge is always visible). The one exception is a store screenshot build (`EXPO_PUBLIC_SCREENSHOTS=1`, never shipped): no badge, and the purple header keeps no room for it. The demo ignores connectivity: its data loads and its actions work whatever the network says, so nothing in it is turned off or says `You're offline` (`useIsOnline()` is always `true` in demo mode).

---

## 11. Copy

- **English, sentence case.** "Log out", "Unlock with Face ID", not "Log Out" or "UNLOCK".
- **Plain words, no jargon.** Write for someone who doesn't know cloud words.

| Write | Not |
| --- | --- |
| "Scaleway isn't responding right now." | "500 Internal Server Error" |
| "You don't have access to this" | "Forbidden" |
| "Reboot web-prod-1?" | "Are you sure?" |
| "You're offline" | "Action disabled: no connectivity" |
| "Something went wrong. Try again." | "Unexpected error occurred" |

- **Buttons start with a verb** and say what happens: "Log in with Scaleway", "Try again", "Reboot". Never "OK" or "Submit". One exception: a button that dismisses a prompt without doing anything may say "Not now" (the Face ID prompt).
- **Short.** One idea per sentence. Titles say what's there; messages say what to do.
- **Contractions are fine** ("You're offline", "doesn't").
- **No exclamation marks**, no blame ("You entered a wrong…"), no "oops".
- **Formats:** amounts `€84.60` (always without tax); time `10:42` (24-hour); a day `3 Feb 2027` (SSH keys, API keys), a day of this year as a list's title `16 November` (Activity), a month `November 2026` (invoices, the chart): English month names, from core's `formatDay`, `formatDayMonth` and `monthAndYear`, never built in a screen; the separator is a middle dot with spaces (` · `); "…" is one character.
- **Exact strings** given in a task are used word for word.

---

## 12. Accessibility

### Touch targets

- Anything tappable is at least **44 × 44 pt** (`sizes.touchMin`).
- When a mockup asks for something smaller, the visible shape stays small and the component itself makes the touch area 44. This is built into `packages/ui`, so screens never add anything (they can't style). There are two ways:
  - **A real 44 pt touch box** around the smaller shape (the safe default). Every `Button` works this way: an `sm` pill looks 36 high and sits centred in a 44-high touch box.
  - **`hitSlop`**, which grows the touch area without changing the layout. **It only works when the extra area fits inside the parent:** React Native only sends a touch to a child if the touch lands inside the parent's bounds. In a 36-high row of buttons, a `hitSlop` would stick out and never react, which is why `Button` uses a real touch box. No component uses one today: the floating tab bar's slots are 68 × 44 themselves.
- **Icon buttons** (a `Sheet`'s Close, a `ScreenHeader`'s Back and action, a `ListRow`'s copy) are 44 × 44 boxes with the 21 pt icon in the middle, or on the box's outer side when the button sits on the content's edge (Back on the left; a header's action, a sheet's Close and a row's copy on the right), so the icon lines up with the content, like "See all ›". The touch box stays whole, inside its parent.
- A new `packages/ui` component with a smaller shape does the same (code in [Rules](#13-rules), rule 9).
- **The same holds for anything that reaches outside its parent with a negative margin:** the `Carousel`'s run to the screen edges and `SectionHeader`'s "See all". They get touches only inside their parent's bounds, so they are direct children of the padded column whose margin they reach into, never of a `Stack` inside it.

### Labels and roles

- **Every icon-only control has a label** (`accessibilityLabel`), like the tab bar's "Home", "Resources", "Billing", "Account", a sheet's "Close", a header's "Back" and "Add SSH key", a row's "Copy Fingerprint". Copy buttons on rows that share a title say their value too ("Copy Public IPv4 203.0.113.34"), so each can be told apart.
- Controls say what they are: buttons `button`, tabs `tab` (inside a `tablist`: the tab bar, a `SegmentedControl` of three), switches `switch` (with the row's title as their label). Screen titles, `Section` titles and `SectionHeader` titles are `header`.
- **Short labels are said in full.** A label that would be heard wrong ("6M" can come out as "6 million") gets plain spoken words: `SegmentedControl` options take an `accessibilityLabel` ("6 months"); a two-choice one is a single button named from it.
- A `ListRow` is read as one phrase: title, subtitle, then its trailing text ("Reboot, You're offline", "Zone, fr-par-1", "Project, Production"); a bare count gets its word ("Instances, 2 OK, 2 resources"). A row or card that leaves the app (`ListRow` `external`, `NoticeCard`) adds the hint "Opens in your browser"; a row whose tap asks a question its words don't announce adds its own ("Asks if you want to stop this run").
- States are announced: `disabled`, `selected` (active tab, picked segment, picked choice, the pin while pinned), `busy` (loading button, loading row, the running action of an `ActionGrid`).
- **Sheets** keep screen readers inside them while they're up, start them on the title, and move them to the new title when the sheet changes step. A `Toast`, a `TextField`'s error and a copy ("Copied") are read out when they appear; a field's error is heard again on the field.
- Something that only colour marks as an alert says so in words: an `AlertRow` is heard as "Alert, …", "Warning, …" or "Note, …"; a `NoticeCard`'s meta starts with how serious the incident is. A pinned resource says `Pinned` in words, next to its star: a `DetailHero` shows the word, and a `ResourceCard` or a `ListRow` status says it to screen readers.
- A chart that can't be adjusted (`MetricChart`) is one image whose label says what the drawing shows: the title, the latest value, the lowest and the highest.
- Decorative things (icons next to text, Skeleton shapes, the logo) are not announced.

### Contrast (WCAG AA)

- Normal text needs a contrast of at least **4.5:1** with its background. Large text (`title` and `display`) needs **3:1**.
- Icons and the parts of a control you need to see (a switch, a tab icon, a status dot) need **3:1**.
- Disabled controls (faded to 50%) are exempt, as WCAG allows.
- Measure a new colour pair with `contrastRatio` before using it, and add it to this table. Every value below comes from `contrastRatio` with the current tokens, rounded to two decimals. Where a cell has several values, they follow the order of the pair's name.

**Text (and icons in the same tone)**

| Pair | Used by | Light | Dark | Needs | Result |
| --- | --- | --- | --- | --- | --- |
| `text` on `background` / `surface` | Main text and default icons | 17.11 / 18.56 | 17.18 / 15.59 | 4.5 | Pass |
| `textMuted` on `background` / `surface` | Subtitles, `Section` titles, row icons and chevrons, EmptyState, the icon of an unknown product's neutral tile (`ResourceCard`, `ListRow`, `DetailHero`), the labels of a `TextField` and a `SecretBox` (`background`), a `TextField`'s placeholder and a row's spinner (`surface`), a `MetricChart`'s title and captions and a `DetailHero`'s subtitle and `Pinned` (`surface`), an on/off `ScreenHeader` action that is off (`background`, an icon: needs 3) | 4.99 / 5.42 | 6.80 / 6.17 | 4.5 | Pass |
| `brand` on `background` / `surface` | `brand` text; `ghost` and `secondary` button labels (an `ActionGrid`'s too); the pinned star on a `ResourceCard`, a `ListRow` status and a `DetailHero` (`surface`); icon buttons (a `Sheet`'s Close and a `ScreenHeader`'s buttons on `background`, a row's copy on `surface`) and the mark on a picked choice (`surface`), which need 3; the pull-to-refresh spinner on the page (iOS) | 10.67 / 11.58 | 6.34 / 5.75 | 4.5 | Pass |
| `alertText` on `background` / `surface` / `alertBackground` | `danger` text, destructive rows, alerts (`AlertRow`), a `TextField`'s error (`background`), a failed event's subtitle (`ListRow subtitleTone="danger"`, `surface`) | 6.03 / 6.54 / 5.75 | 8.51 / 7.72 / 7.70 | 4.5 | Pass |
| `text` on `highlightBackground` | The value in a `SecretBox` | 15.64 | 11.57 | 4.5 | Pass |
| `text` / `textMuted` on `warningBackground` | `AlertRow tone="warning"`: its title and icon, its detail | 16.83 / 4.91 | 13.92 / 5.51 | 4.5 | Pass |
| `text` / `textMuted` on `infoBackground` | `AlertRow tone="info"`: its title, its detail | 15.64 / 4.56 | 11.57 / 4.58 | 4.5 | Pass |
| `textMuted` on `divider` | `SegmentedControl` on the page: the labels that aren't picked, on the track | 4.62 | 5.41 | 4.5 | Pass |
| `onPrimaryButton` on `primaryButton` | `primary` button | 11.58 | 5.11 | 4.5 | Pass |
| `primaryButton` on `onBrand` | `onBrand` button (white, purple label), the picked segment of a `SegmentedControl` on purple | 11.58 | 5.11 | 4.5 | Pass |
| `onBrand` on each `headerGradient` stop | Header text, `ghostOnBrand` buttons, the chart's line and dots, the pull-to-refresh spinner on purple (iOS) | 13.75 / 11.58 / 7.72 | 17.34 / 11.87 | 4.5 | Pass |
| `onBrand` at 75% on each `headerGradient` stop | The chart's month labels and projection label (`LineChart`) | 8.03 / 6.91 / 4.94 | 9.93 / 7.12 | 4.5 | Pass (70% would give 4.49 on the lightest stop) |
| `onBrand` on `controlOnBrand` over each `headerGradient` stop | The `PickerChip`'s label and chevron; the `SegmentedControl` labels that aren't picked, on purple | 9.36 / 8.16 / 5.61 | 11.22 / 8.18 | 4.5 | Pass (at the mockup's 75% they would give 3.88 on the lightest stop, so they are full white) |
| `onBrand` on `splashBackground` | The logo and the splash's name on the splash colour | 11.58 | 15.98 | 4.5 | Pass |
| `onBadge` on `successBadge` / `warningBadge` / `dangerBadge` / `neutralBadge` / `inverseBadge` / `primaryButton` | Every `Pill`'s words and icon: `success`, `warning`, `danger`, `neutral`, `inverse` (offline, "Demo", a `Toast`), `brand` (a busy resource) | 5.36 / 5.37 / 6.54 / 5.42 / 18.56 / 11.58 | 5.36 / 5.37 / 6.54 / 6.64 / 9.20 / 5.11 | 4.5 | Pass (white on the dot colours would fail: 2.65 on light `success`, 2.04 on light `warning`) |

**Icons and graphics**

| Pair | Used by | Light | Dark | Needs | Result |
| --- | --- | --- | --- | --- | --- |
| `tabActiveIcon` on `tabActiveBackground` | The active tab's icon, on its capsule | 9.75 | 8.51 | 3 | Pass |
| `tabIdleIcon` on the tab bar (`tabBarBackground` over `background`: `#FDFDFE` / `#1D1928`) | The other tabs | 3.68 | 4.12 | 3 | Pass |
| `brand` on `surface` | A switch that is on (its track); a `TextField`'s border while you type; the pull-to-refresh arrow on its disc (Android); a `MetricChart`'s line and end dot | 11.58 | 5.75 | 3 | Pass |
| `brand` over the `MetricChart` fill at its strongest (`brand` at 18% over `surface`: `#DFD2ED` / `#33294B`) | A `MetricChart`'s line and end dot near the top, where the fill is strongest | 8.04 | 4.40 | 3 | Pass |
| `brand` on `infoBackground` | The `info` icon of an `AlertRow tone="info"` | 9.75 | 4.27 | 3 | Pass (as text it would fail in dark mode, so its words are `text` and `textMuted`) |
| `alertText` on `surface` | A `TextField`'s border when it has an error | 6.54 | 7.72 | 3 | Pass |
| `fieldBorder` on `surface` / `background` | A `TextField`'s border at rest, against the field and the page around it | 3.50 / 3.23 | 3.39 / 3.73 | 3 | Pass |
| `surface` on `background` | A `TextField`'s box on the page | 1.08 | 1.10 | Not required | For information: its `fieldBorder` (above) shows the field |
| `highlightBackground` on `background` | The box of a `SecretBox` on the page | 1.09 | 1.48 | Not required | For information: a soft backdrop; its value is measured above |
| `infoBackground` on `background` | An `AlertRow tone="info"` on the page | 1.09 | 1.48 | Not required | For information: a soft backdrop; its words and icon are measured above, and screen readers hear "Note" |
| `surface` on the dimmed page (`scrim` over `background`: `#85848A` / `#060508`) | The edge of a prompt `Card` over an `Overlay` | 3.71 | 1.15 | Not required | Accepted (item 2) |
| `success` / `warning` / `neutral` on `surface` | A status dot on a card (`ResourceCard`, `NoticeCard`) or in a row (`ListRow subtitleHealth`) | 2.65 / 2.04 / 1.99 | 9.39 / 9.78 / 2.65 | 3 | **Fails** in light, and `neutral` in dark (open item 1) |
| `success` / `warning` / `neutral` on `background` | A status dot on the page (`StatusLine`) | 2.44 / 1.88 / 1.83 | 10.35 / 10.78 / 2.93 | 3 | **Fails** in light, and `neutral` in dark (open item 1) |
| `successBadge` / `warningBadge` / `dangerBadge` / `neutralBadge` / `inverseBadge` / `primaryButton` on `surface` | A Pill's shape on a card | 5.36 / 5.37 / 6.54 / 5.42 / 18.56 / 11.58 | 3.29 / 3.28 / 2.70 / 2.65 / 1.92 / 3.45 | Not required | For information: a Pill is read by its words (measured above), not by its edge. The `inverse` one also has its edge in dark mode (next row) |
| `inverseBadgeEdge` on `background` / `surface` / each `headerGradient` stop | The edge of the `inverse` Pill (offline, "Demo", a `Toast`), against what it floats over | 17.11 / 18.56 / 1.35 / 1.60 / 2.40 | 5.84 / 5.29 / 5.21 / 3.57 | 3 | Pass in dark (without the edge, the dark grey pill gave 2.11 / 1.92 / 1.89 / 1.29). Light: the pill's own ink, unchanged, under 3 on the purple header: Accepted (item 8) |
| `primaryButton` / `alertText` on `surface` | The dot of a busy resource and of a resource in error (`ResourceCard`, `ListRow subtitleHealth`), the danger dot of a `NoticeCard` | 11.58 / 6.54 | 3.45 / 7.72 | 3 | Pass |
| Each product's `icon` on its `tile`: `instances` / `elastic-metal` / `kubernetes` / `databases` / `containers` / `functions` / `jobs` / `load-balancers` | The product icon on its tile (`ResourceCard`, `ListRow`, `DetailHero`) | 3.12 / 6.39 / 4.12 / 3.14 / 3.29 / 4.28 / 5.13 / 4.24 | 6.36 / 6.30 / 6.00 / 9.71 / 7.25 / 6.98 / 5.79 / 6.99 | 3 | Pass (the mockup's containers green `#18A57A` gave 2.86, so it is `#16996F`) |
| Each product's `tile` on `surface` | The tile's square on the card | 1.10 to 1.21 | 1.14 to 1.33 | Not required | For information: the tile is a soft backdrop; its icon is what you need to see (measured above) |
| `onBrand` on `controlOnBrand` over each `headerGradient` stop | The picked segment's white pill on purple, against its track | 9.36 / 8.16 / 5.61 | 11.22 / 8.18 | 3 | Pass |
| `surface` on `divider` | The picked segment's pill on the page, against its track | 1.17 | 1.14 | Not required | Accepted (item 7) |
| `controlOnBrand` over each `headerGradient` stop, against that stop | The shape of the `PickerChip` and of the `SegmentedControl`'s track on purple | 1.47 / 1.42 / 1.38 | 1.55 / 1.45 | Not required | For information (item 7) |
| `series` 1 / 2 / 3 / 4 on `surface` | The `BreakdownBar`'s segments and legend dots, on a card | 11.58 / 4.31 / 1.93 / 1.32 | 5.75 / 3.45 / 1.91 / 1.35 | 3 | 3 and 4 under 3:1: Accepted (item 6) |
| `tabActiveBackground` on the tab bar (`#FDFDFE` / `#1D1928`) | The active tab's capsule | 1.17 | 1.31 | Not required | For information (item 3) |
| `chartDotRing` on `onBrand` | The ring around the chart's white dots (against its dot) | 9.86 | 14.05 | 3 | Pass. On the purple around it, it blends in on purpose (light 1.39 / 1.17 / 1.28, dark 1.23 / 1.18 on the `headerGradient` stops): the white dot is what you see |
| `onBrand` over the chart's fill at its strongest (`chartFill` at 38% / 45% over each `headerGradient` stop) | The chart's line and dots, where they touch the fill | 4.73 / 4.37 / 3.41 | 6.44 / 5.32 | 3 | Pass |
| `onBrand` at 80% over the lighter fill at its strongest (`chartFill` at 16% / 18% over each `headerGradient` stop) | The chart's dotted piece (the current month), along the top of its fill | 6.60 / 5.81 / 4.18 | 8.45 / 6.29 | 3 | Pass (on bare purple: 9.03 / 7.70 / 5.42 and 11.17 / 7.93) |
| `onBrand` at 60% on each `headerGradient` stop | The chart's hollow projection dot | 5.52 / 4.81 / 3.65 | 6.69 / 4.97 | 3 | Pass |
| `onBrand` at 55% over the chart's fill at its strongest (`chartFill` at 38% / 45% over each `headerGradient` stop) | The chart's guide line under the picked month (it always runs down through the fill) | 2.58 / 2.43 / 2.06 | 3.16 / 2.75 | Not required | Accepted (item 5) |
| `skeletonOnBrand` on each `headerGradient` stop | Skeleton shapes on the purple header (`tone="onBrand"`) | 1.31 / 1.28 / 1.26 | 1.36 / 1.31 | Not required | For information: placeholders are decorative and not announced. As soft as the grey ones on the page (`divider` on `surface` / `background`: 1.17 / 1.08 light, 1.14 / 1.26 dark); at the bottom of the pulse (50%): 1.13 / 1.12 / 1.11 and 1.14 / 1.13 |
| `onBrand` at 35% on each `headerGradient` stop | The chart's faint projection line | 2.66 / 2.44 / 2.10 | 3.02 / 2.51 | Not required | Accepted (item 5) |

The tab bar is measured over the page background; over other content its blur changes the colour behind the icons.

**Open items** (failing pairs kept on purpose, for the owner to confirm; don't copy them into anything new):

1. **Status dots** are under 3:1 on light backgrounds, and the grey `neutral` one in dark mode too. The status colours are kept so they stay recognisable (green, orange, grey) and match the mockups. Instead, the rule is: **never show a status dot without its text label** (rule 11), so the word carries the meaning and the dot is only a hint. The status word is never drawn in the status colour itself: as text, those colours fail (green `success` on white is 2.65:1, far under 4.5). It's a `Pill` in a darker shade of the status colour, with white words (`StatusPill`), or `textMuted` words next to the dot (`StatusLine`, the meta of a `NoticeCard`). The dot is private to `packages/ui`: no component draws one without its words.

**Accepted** (measured and kept, no change needed):

2. **The prompt card's edge in dark mode** is 1.15:1 against the dimmed page (`scrim` over `background`). This isn't a WCAG requirement: the card isn't a control, and everything you need to see on it passes (its text is measured on `surface`, its buttons on their own colours). No `scrim` can fix it anyway: even pure black behind the card gives only 1.19:1. The flat, shadow-free look of dark mode stays.
3. **The active tab's capsule** is 1.17:1 (light) and 1.31:1 (dark) against the tab bar. For information only: the active tab is also shown by its own icon colour (9.75:1 and 8.51:1 on the capsule, see above) and announced as `selected`, so the capsule is a hint, not the only signal.
4. **The switch** is the phone's own control (`Switch`). Its size (31 pt high on iOS, inside a row that is at least 52 high) and its colours when off come from the system; only the colour when on is set (`brand`, measured above). Accepted as is.
5. **The chart's faint marks** are hints, under 3:1 on purpose: the projection's dotted line (35%), the picked month's halo (25%) and its guide line (55%, measured where it runs through the fill: about 90% white would be needed to pass, far from the approved mockup), and the fill itself. The projection is also written in its label (75%, measured above) and read by screen readers; the picked month also has its bigger dot, its bold label and the screen's own text, and screen readers hear it.
6. **The lighter series colours** (3 and 4) are under 3:1 on a card, in the `BreakdownBar`'s bar and legend dots. They are the approved product colours, and they are a hint: the legend writes every product's name and amount, in the bar's order (biggest first, "Other" last), and screen readers hear each row.
7. **The shapes of the header controls and of the picked segment on the page** are under 3:1 against what's around them (the `controlOnBrand` chip and track on purple, a `surface` pill on a `divider` track). Their words carry them: the chip's label and chevron, and every segment's label, pass 4.5:1; the picked segment is also bold and announced as `selected`, and on purple its white pill passes 3:1 against the track.
8. **The light-mode `inverse` Pill on the purple header** (the Demo badge, the offline pill on Home and Billing): its ink shape is 1.35 / 1.60 / 2.40 against the `headerGradient` stops. Unchanged on purpose: light mode looks as before, and only dark mode lost its strong pill, so only dark mode gets the edge. Its white words pass (18.56) and carry it. A white edge would give 13.75 / 11.58 / 7.72 there, if the owner wants it later.

**To measure a pair**, use `contrastRatio(foreground, background)` from `@scaleway-manager/ui/tokens` (in a test, or in a component's test when it depends on the pair). It lays a see-through foreground over the background for you; when the background itself is see-through (the tab bar), lay it over what's behind it first with `compositeOver`. From the repository root, for a quick check:

```bash
node --no-warnings -e "import('./packages/ui/src/tokens/contrast.ts').then(({ contrastRatio }) => console.log(contrastRatio('#FFFFFF', '#4F0599').toFixed(2)))"
# 11.58
```

### Also

- **Colour is never the only signal.** A status always has its word (never a status dot without its text label); an error always has text.
- **Text size:** everything still works with the phone's largest text setting (no cut-off text, no overlapping). The three named exceptions are the splash's name, which keeps its size, and the chart's labels and the `SpendingSummary` amount, which shrink just enough to stay on one line when they no longer fit (see [Typography](#3-typography)). One more is accepted until the owner confirms it: at the two largest sizes, a word of Billing's Products | Projects switch may break inside itself.
- **Reduce Motion:** see [Motion](#7-motion).

---

## 13. Rules

These are not suggestions. The design reviewer marks a broken rule as "Must fix".

**1. Colours only in `packages/ui/src/tokens`.** Everywhere else, colours come from the theme.

```tsx
// Before
backgroundColor: '#FFECEC',

// After
const { colors } = useTheme();

backgroundColor: colors.alertBackground,
```

**2. No styling in `apps/mobile`.** `apps/mobile/app/**` and `apps/mobile/src/features/**` have no `style` prop, no `StyleSheet`, no visual React Native components (`View`, `Text`, `Pressable`…) and no `expo-linear-gradient`, `expo-blur`, `react-native-svg` or `lucide-react-native`. Screens only put `@scaleway-manager/ui` components together, and arrange them with `Stack` (see [Layout](#layout)). React Native modules that draw nothing are fine in features, but whether the app is in use goes through one hook, `useAppActive()` (`src/features/appState/`), shared by the privacy cover and the new secret.

```tsx
// Before (apps/mobile/app/(tabs)/billing.tsx)
<View style={{ paddingHorizontal: 16, gap: 16 }}>
  <Text style={{ fontSize: 22, fontWeight: '700' }}>Invoices</Text>
</View>

// After
<Stack paddingHorizontal="md">
  <Text variant="title" accessibilityRole="header">
    Invoices
  </Text>
</Stack>
```

**3. A new visual element goes into `packages/ui` first,** with a gallery section and an entry on this page, in the same change. No one-off components inside features. If an existing component almost fits, give it a new prop instead of making a copy.

```text
Before: apps/mobile/src/features/instances/StatusDot.tsx
After:  packages/ui/src/components/StatusDot.tsx
        + its section in packages/ui/src/gallery/sections.tsx
        + its entry in docs/design-system.md (section 9)
        then: import { StatusDot } from '@scaleway-manager/ui'
```

**4. Buttons side by side share the same explicit `size`.** Every button states its size, and neighbours use the same one, so they are exactly the same height. Their `Stack direction="row"` (a row of only buttons) sets no `align`, and each button has `fill`, so both pills stretch to the taller one: a label that wraps at a large text size can't make them differ.

```tsx
// Before: 48 next to 36
<Stack direction="row" gap="xs">
  <Button label="Cancel" size="md" variant="secondary" fill onPress={onCancel} />

  <Button label="Reboot" size="sm" fill onPress={onReboot} />
</Stack>

// After
<Stack direction="row" gap="xs">
  <Button label="Cancel" size="md" variant="secondary" fill onPress={onCancel} />

  <Button label="Reboot" size="md" fill onPress={onReboot} />
</Stack>
```

**5. Conditional JSX uses a ternary with `null`, never `&&`.**

```tsx
// Before
{error && <Text variant="body" tone="danger">{error}</Text>}

// After
{error ? (
  <Text variant="body" tone="danger">
    {error}
  </Text>
) : null}
```

**6. A blank line before every `return`.**

```tsx
// Before
const total = sum(items);
return total;

// After
const total = sum(items);

return total;
```

**7. A blank line between JSX sections.**

```tsx
// Before
<Text variant="title">Account</Text>
<Section>…</Section>

// After
<Text variant="title">Account</Text>

<Section>…</Section>
```

**8. Reduce Motion is always respected.** Every animation checks `useReducedMotion()` and has a plain fade (at most 250 ms) or no animation instead. Start animations in a `useEffect`, never while rendering (this is how `Skeleton` does it).

```tsx
// Before: pulses even with Reduce Motion
useEffect(() => {
  opacity.value = withRepeat(withTiming(0.5, { duration: motion.duration.slow }), -1, true);
}, [opacity, motion.duration.slow]);

// After
const reduceMotion = useReducedMotion();

useEffect(() => {
  if (reduceMotion) {
    return;
  }

  opacity.value = withRepeat(withTiming(0.5, { duration: motion.duration.slow }), -1, true);
}, [reduceMotion, opacity, motion.duration.slow]);
```

**9. Touch targets are at least 44 pt** (`sizes.touchMin`). A `packages/ui` component whose visible shape is smaller makes the touch area 44 itself, so screens never have to (see [Accessibility](#touch-targets)). It uses a real 44 pt touch box around the shape (like `Button`), or a `hitSlop` only when the extra area fits inside the parent. The `PickerChip` keeps its 28 pt chip in the middle of a 44 pt touch box:

```tsx
// Before: a 28 pt chip, too small to tap
<Pressable style={{ minHeight: sizes.compactControl }}>
  <Text variant="subhead" tone="onBrand">Production</Text>
</Pressable>

// After: still 28 pt to see, 44 pt to tap
<Pressable style={{ minHeight: sizes.touchMin, paddingVertical: (sizes.touchMin - sizes.compactControl) / 2 }}>
  <View style={{ minHeight: sizes.compactControl, borderRadius: radii.pill }}>
    <Text variant="subhead" tone="onBrand">Production</Text>
  </View>
</Pressable>
```

**10. Contrast meets WCAG AA** (4.5:1 for text, 3:1 for large text and icons). Use the text tone made for the background.

```tsx
// Before (inside Pill): white words on the green of the status dot, 2.65:1
<View style={{ backgroundColor: colors.success }}>
  <Text variant="caption" tone="onBadge">Running</Text>
</View>

// After: white words on the darker badge green, 5.36:1
<View style={{ backgroundColor: colors.successBadge }}>
  <Text variant="caption" tone="onBadge">Running</Text>
</View>
```

**11. Never show a status dot without its text label.** The status colours are under 3:1 on light backgrounds (see [Contrast](#contrast-wcag-aa), open item 1), so a dot alone is not enough: the word always sits next to it. A `packages/ui` component that draws a status dot takes the label as a **required** prop and draws both.

```tsx
// Before (inside a packages/ui component): the dot alone says "running"
<View style={{ width: dot, height: dot, borderRadius: radii.pill, backgroundColor: colors.success }} />

// After: the dot and its word, always together
<Stack direction="row" align="center" gap="xs">
  <View style={{ width: dot, height: dot, borderRadius: radii.pill, backgroundColor: colors.success }} />

  <Text variant="subhead" tone="muted">
    {label}
  </Text>
</Stack>
```

**Also (the owner's code rules, checked by lint and the code reviewer):** no non-null assertion (`!`); no helper function called only once; React types with `import type { ReactNode } from 'react'`, never `React.ReactNode`; short code comments; copy in sentence case and plain words. See `docs/architecture.md` for the dependency rules.

---

## 14. How to add a component

1. **Check it doesn't exist.** Look in the gallery and in [Components](#9-components). If something almost fits, add a prop to it instead.
2. **Agree on the look** with a mockup. Every value comes from the tokens; a missing colour or size is added to `packages/ui/src/tokens/` first (both themes, contrast measured with `contrastRatio` and added to the table in [Accessibility](#contrast-wcag-aa)).
3. **Write the test first:** `packages/ui/src/components/<Name>.test.tsx`. Cover light and dark, the accessibility role and label, and the Reduce Motion path if it moves.
4. **Build it** in `packages/ui/src/components/<Name>.tsx`:
   - simple props (a title, a status, numbers), nothing about Scaleway and no import from `core` or `adapters`;
   - colours and sizes from `useTheme()`;
   - touch area at least 44 pt (a real 44 pt touch box around a smaller shape, or a `hitSlop` that fits inside the parent);
   - labels and roles for screen readers;
   - a Reduce Motion path for any animation;
   - the code rules from [Rules](#13-rules).
5. **Export it** from `packages/ui/src/index.ts`.
6. **Add its gallery section** in `packages/ui/src/gallery/sections.tsx` (or a file it takes sections from, like `homeSections.tsx` for Home's pieces, `formsSections.tsx` for sheets, forms, copying and toasts, and `productSections.tsx` for the products' pieces), named exactly like the export, showing every variant and state. The gallery test fails until you do.
7. **Add its entry** to [Components](#9-components): what it is, when to use it, when not to, the props that matter (mark the required ones), and an example. Update any table here that changed (colours, sizes, icons, contrast).
8. **Look at it** in the gallery on a simulator: light and dark, Reduce Motion on, the largest text size.
9. **Run the checks:** `pnpm --filter @scaleway-manager/ui test`, `pnpm --filter @scaleway-manager/ui typecheck` and `pnpm exec eslint packages/ui`.
10. **Run the `design-reviewer` agent** and fix every "Must fix".
11. **Only then** use it in `apps/mobile`.
