import { AppError, monthRange } from '@scaleway-manager/core';
import type { MonthKey, MonthSpending } from '@scaleway-manager/core';
import { homeHeaderLayout, noticeLayout, radii, sizes } from '@scaleway-manager/ui';
import type { SplashEntranceState } from '@scaleway-manager/ui';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { getAnimatedStyle as getStyle } from 'react-native-reanimated';
import type { getAnimatedStyle as NativeGetAnimatedStyle } from 'react-native-reanimated/lib/typescript/jestUtils/index.native';

import Home from '../../../app/(tabs)/home';
import { renderWithApp } from '../../test-utils/renderWithApp';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { LockProvider } from '../lock/LockProvider';
import { SplashHandOverContext } from '../splash/SplashHandOver';

// TypeScript sees Reanimated's web stub of getAnimatedStyle; Jest runs the native one
const getAnimatedStyle = getStyle as unknown as typeof NativeGetAnimatedStyle;

// A store screenshots build (EXPO_PUBLIC_SCREENSHOTS=1) when true
let mockScreenshotBuild = false;
jest.mock('../../wiring/buildConfig', () => ({
  get screenshotBuild() {
    return mockScreenshotBuild;
  },
}));

// 18 November 2026: the demo's November is €84.60 so far
const NOW = new Date(Date.UTC(2026, 10, 18));

// The demo (no network), on a fixed day, with its own empty phone storage
const demo = (clock: () => Date = () => NOW): Services => {
  const saved = new Map<string, string>();

  return createServices('demo', {
    clock: { now: clock },
    kv: {
      getItem: async (key) => saved.get(key) ?? null,
      setItem: async (key, value) => {
        saved.set(key, value);
      },
      removeItem: async (key) => {
        saved.delete(key);
      },
    },
  });
};

// The demo's data with the real app's rules: the offline pill shows when offline, there's no Demo badge, and the
// network counts (the demo itself ignores it), so offline tests use these
const realRules = (): Services => ({ ...demo(), mode: 'real' });

// What Home tells the splash about its header
const reportHeaderHeight = jest.fn();

// The splash's hand-over, as SplashGate gives it
const handOver = (entrance: SplashEntranceState) => ({
  entrance,
  logoHidden: false,
  reportLogo: () => {},
  reportHeaderHeight,
});

// Lets a test move the splash on (it leaves while Home is already there)
let moveSplash: (entrance: SplashEntranceState) => void = () => {};

function HomeScreen({ initial }: { initial: SplashEntranceState }) {
  const [entrance, setEntrance] = useState(initial);

  useEffect(() => {
    moveSplash = setEntrance;
  }, []);

  return (
    <SplashHandOverContext.Provider value={handOver(entrance)}>
      <LockProvider>
        <Home />
      </LockProvider>
    </SplashHandOverContext.Provider>
  );
}

const open = async (services: Services = demo(), online?: boolean, entrance: SplashEntranceState = 'shown') =>
  renderWithApp(<HomeScreen initial={entrance} />, { services, online });

// The chart draws once it knows how wide it is
const layOutChart = async () => {
  await fireEvent(screen.getByTestId('line-chart'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 150 } },
  });
};

// A tap on a month of the chart: the finger goes down and lifts at its dot
const tapMonth = async (index: number) => {
  const x = (screen.getByTestId(`chart-dot-${index}`).props as { cx: number }).cx;
  const event = { nativeEvent: { locationX: x, pageX: x, pageY: 50 } };

  await fireEvent(screen.getByTestId('chart-touch'), 'responderGrant', event);
  await fireEvent(screen.getByTestId('chart-touch'), 'responderRelease', event);
};

const press = async (name: string) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
};

// A host element's style, flattened
const styleOf = (node: { props: { style?: unknown } }): { marginTop?: number; paddingBottom?: number } =>
  Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));

// Whether the content column holding this text is pulled up over the header's curve (Stack overlapHeader)
const overHeader = (text: string) => {
  for (let node = screen.getByText(text).parent; node !== null; node = node.parent) {
    if (styleOf(node).marginTop === -radii.xl) {
      return true;
    }
  }

  return false;
};

// The room the header keeps at its bottom for a card that overlaps it
const roomForCard = () => styleOf(screen.getByTestId('header-content')).paddingBottom;

const monthsAskedFor = (getMonth: jest.SpyInstance) =>
  (getMonth.mock.calls as [string, MonthKey][]).map(([, month]) => month).sort();

afterEach(() => {
  jest.restoreAllMocks();
  onlineManager.setOnline(true);
  mockScreenshotBuild = false;
});

test('shows this month so far and last month', async () => {
  await open();

  expect(await screen.findByText('€84.60')).toBeOnTheScreen();
  expect(screen.getByText('Spent in November so far')).toBeOnTheScreen();
  expect(screen.getByText('October')).toBeOnTheScreen();
  expect(screen.getByText('€141.20')).toBeOnTheScreen();
  expect(screen.getByText('November by product')).toBeOnTheScreen();
  // The three biggest products, then the rest
  expect(screen.getByLabelText('Instances, €46.55')).toBeOnTheScreen();
  expect(screen.getByLabelText('Other, €5.91')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Back to now' })).not.toBeOnTheScreen();
});

test("Home's card stays by product, with no Products | Projects switch and no list, even with several projects", async () => {
  await open();
  await screen.findByText('€84.60');

  // The demo's two projects both spent this month: only Billing switches to them
  expect(screen.getByText('November by product')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Breakdown: / })).not.toBeOnTheScreen();
  expect(screen.queryByText(/by project$/)).not.toBeOnTheScreen();
  expect(screen.queryByRole('header', { name: 'All products' })).not.toBeOnTheScreen();
  expect(screen.queryByRole('header', { name: 'All projects' })).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Production, €65.06' })).not.toBeOnTheScreen();
  expect(screen.getAllByTestId('breakdown-segment', { includeHiddenElements: true })).toHaveLength(4);
});

test('switching to 12M asks only for the missing months', async () => {
  const services = demo();
  const getMonth = jest.spyOn(services.spending, 'getMonth');
  await open(services);
  await screen.findByText('€84.60');

  expect(monthsAskedFor(getMonth)).toEqual(monthRange('2026-11', 6));

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Range: 6 months' }));
  });
  await waitFor(() => expect(getMonth).toHaveBeenCalledTimes(12));

  // 6 extra months; the 6 already there aren't asked for again
  expect(monthsAskedFor(getMonth)).toEqual(monthRange('2026-11', 12));
  expect(screen.getByRole('button', { name: 'Range: 12 months' })).toBeOnTheScreen();
});

test('tapping September shows September everywhere', async () => {
  await open();
  await screen.findByText('€84.60');
  await layOutChart();
  await tapMonth(3);

  expect(screen.getByText('Spent in September')).toBeOnTheScreen();
  expect(screen.getByText('€118.60')).toBeOnTheScreen();
  expect(screen.getByText('vs August')).toBeOnTheScreen();
  expect(screen.getByText('+19%')).toBeOnTheScreen();
  expect(screen.getByText('September by product')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Back to now' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Instances, €65.25')).toBeOnTheScreen();
});

test('Back to now returns to the current month', async () => {
  await open();
  await screen.findByText('€84.60');
  await layOutChart();
  await tapMonth(3);
  await press('Back to now');

  expect(screen.getByText('Spent in November so far')).toBeOnTheScreen();
  expect(screen.getByText('€84.60')).toBeOnTheScreen();
  expect(screen.getByText('November by product')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Back to now' })).not.toBeOnTheScreen();
});

test('projection label shows while now is selected', async () => {
  await open();
  await screen.findByText('€84.60');
  await layOutChart();

  // €84.60 over 17 days, for 30 days
  expect(screen.getByText('≈ €149.29 by month end')).toBeOnTheScreen();
  expect(screen.getByTestId('line-chart').props.accessibilityValue).toEqual({
    text: 'November 2026, €84.60, ≈ €149.29 by month end',
  });

  await tapMonth(3);

  expect(screen.queryByText('≈ €149.29 by month end')).not.toBeOnTheScreen();
  expect(screen.getByTestId('line-chart').props.accessibilityValue).toEqual({ text: 'September 2026, €118.60' });

  // Picking the last month is "now" again
  await tapMonth(5);

  expect(screen.getByText('≈ €149.29 by month end')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Back to now' })).not.toBeOnTheScreen();
});

test('billing permission missing shows the calm message', async () => {
  const services = demo();
  jest.spyOn(services.spending, 'getMonth').mockRejectedValue(new AppError('forbidden', 'No billing', 403));
  await open(services);

  expect(await screen.findByText("Spending isn't available")).toBeOnTheScreen();
  expect(screen.getByText("You don't have access to billing in this organization.")).toBeOnTheScreen();
  // No chart, no switch, no breakdown, and nothing to retry: it isn't a failure
  expect(screen.queryByTestId('line-chart')).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Range: / })).not.toBeOnTheScreen();
  expect(screen.queryByText(/by product$/)).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
  // The project picker still works
  expect(screen.getByRole('button', { name: 'Acme · Production' })).toBeOnTheScreen();
  // The rest of Home still loads: the alerts, the status and Live resources
  expect(await screen.findByLabelText(/^Alert, High CPU on db-main/)).toBeOnTheScreen();
  expect(await screen.findByText('Slower block storage in fr-par-1')).toBeOnTheScreen();
  expect(await screen.findByLabelText(/^api-prod-2, Instance/)).toBeOnTheScreen();
});

test('without the spending card, nothing sits on the purple curve: the column starts under the header', async () => {
  const services = demo();
  const getMonth = jest.spyOn(services.spending, 'getMonth');
  getMonth.mockRejectedValue(new AppError('forbidden', 'No billing', 403));
  const forbidden = await open(services);
  await screen.findByText('Slower block storage in fr-par-1');

  // 403: the header keeps no room for a card, and the alerts and status don't overlap it
  expect(roomForCard()).toBe(0);
  expect(overHeader('Live resources')).toBe(false);

  await forbidden.unmount();
  getMonth.mockRejectedValue(new AppError('server', 'Down', 503));
  const failed = await open(services);
  await screen.findByText("Couldn't load your spending");

  expect(roomForCard()).toBe(0);
  expect(overHeader('Live resources')).toBe(false);

  await failed.unmount();
  getMonth.mockRestore();
  await open(services);
  await screen.findByText('€84.60');

  // With the card, it overlaps the curve as in the mockup
  expect(roomForCard()).toBeGreaterThanOrEqual(radii.xl);
  expect(overHeader('November by product')).toBe(true);
});

test('spending covers the whole organization, says so, and stays when the project changes', async () => {
  const services = demo();
  const getMonth = jest.spyOn(services.spending, 'getMonth');
  await open(services);
  await screen.findByText('€84.60');

  expect(screen.getByText('All projects in Acme')).toBeOnTheScreen();

  // The chip opens the project picker
  await press('Acme · Production');

  expect(screen.getByText('Organization and project')).toBeOnTheScreen();

  await press('Staging');

  expect(await screen.findByRole('button', { name: 'Acme · Staging' })).toBeOnTheScreen();
  expect(screen.getByText('€84.60')).toBeOnTheScreen();
  // The spending is the organization's: nothing to ask again
  expect(getMonth).toHaveBeenCalledTimes(6);
});

test('a failure other than permission offers Try again, which loads it again', async () => {
  const services = demo();
  const getMonth = jest.spyOn(services.spending, 'getMonth');
  getMonth.mockRejectedValue(new AppError('server', 'Down', 503));
  await open(services);

  expect(await screen.findByText("Couldn't load your spending")).toBeOnTheScreen();
  expect(screen.queryByTestId('line-chart')).not.toBeOnTheScreen();
  // The same size as every other Try again in the app
  expect(within(screen.getByRole('button', { name: 'Try again' })).getByTestId('button-pill')).toHaveStyle({
    minHeight: sizes.buttonMd,
  });

  getMonth.mockRestore();
  await press('Try again');

  expect(await screen.findByText('€84.60')).toBeOnTheScreen();
  expect(screen.queryByText("Couldn't load your spending")).not.toBeOnTheScreen();
});

test('Try again is turned off while offline, and says why', async () => {
  const services = realRules();
  jest.spyOn(services.spending, 'getMonth').mockRejectedValue(new AppError('server', 'Down', 503));
  await open(services);
  await screen.findByText("Couldn't load your spending");

  await act(async () => {
    onlineManager.setOnline(false);
  });

  expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
  expect(screen.getByText("You're offline")).toBeOnTheScreen();
});

test("when the account can't be loaded, the header says so and offers Try again", async () => {
  const services = demo();
  jest.spyOn(services.account, 'getCurrentUser').mockRejectedValue(new AppError('server', 'Down', 503));
  await open(services);

  expect(await screen.findByText("Couldn't load your spending")).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
});

test('while loading, the header shows placeholders in its shapes', async () => {
  const services = demo();
  jest.spyOn(services.spending, 'getMonth').mockReturnValue(new Promise<MonthSpending>(() => {}));
  await open(services);
  await screen.findByRole('button', { name: 'Acme · Production' });

  // The words that don't need the amounts are there; the amount and the chart are placeholders
  expect(screen.getByText('Spent in November so far')).toBeOnTheScreen();
  expect(screen.getByText('November by product')).toBeOnTheScreen();
  expect(screen.getByTestId('line-chart').props.accessibilityRole).toBe('progressbar');
  expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(4);
  expect(screen.queryByText('€84.60')).not.toBeOnTheScreen();
});

test('offline, the header shows the last saved spending without asking Scaleway', async () => {
  const services = realRules();
  const saved = await Promise.all(monthRange('2026-11', 6).map((month) => services.spending.getMonth('demo-org', month)));
  const getMonth = jest.spyOn(services.spending, 'getMonth');
  const { queryClient } = await open(services, false);

  await act(async () => {
    queryClient.setQueryData(['account', 'me'], await services.account.getCurrentUser());
    for (const month of saved) {
      queryClient.setQueryData(['spending', 'demo-org', month.month], month);
    }
  });

  expect(await screen.findByText('€84.60')).toBeOnTheScreen();
  expect(getMonth).not.toHaveBeenCalled();
});

test('this month and last month refresh after 5 minutes, older months are kept', async () => {
  const { queryClient } = await open();
  await screen.findByText('€84.60');
  const staleTime = (month: MonthKey) =>
    (queryClient.getQueryCache().find({ queryKey: ['spending', 'demo-org', month] })?.observers[0]?.options as {
      staleTime?: number;
    })?.staleTime;

  expect(staleTime('2026-11')).toBe(5 * 60 * 1000);
  expect(staleTime('2026-10')).toBe(5 * 60 * 1000);
  expect(staleTime('2026-09')).toBe(Infinity);
  expect(staleTime('2026-06')).toBe(Infinity);
});

test('the oldest month compares with the month before it', async () => {
  const services = demo();
  const getMonth = jest.spyOn(services.spending, 'getMonth');
  await open(services);
  await screen.findByText('€84.60');
  await layOutChart();
  await tapMonth(0);

  // June €96.10 vs May €91.30: May is asked for only now
  expect(screen.getByText('Spent in June')).toBeOnTheScreen();
  expect(screen.getByText('vs May')).toBeOnTheScreen();
  expect(await screen.findByText('+5%')).toBeOnTheScreen();
  expect(monthsAskedFor(getMonth)).toEqual(monthRange('2026-11', 12).slice(5));
});

test('the chart says Jun to Nov in 6 months, initials in 12, and a month 6 no longer shows goes back to now', async () => {
  await open();
  await screen.findByText('€84.60');
  await layOutChart();

  expect(['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map((label) => screen.getByText(label))).toHaveLength(6);

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Range: 6 months' }));
  });
  await screen.findByText('D');
  await layOutChart();

  expect(screen.getAllByText('J')).toHaveLength(3);

  // January, which 6 months doesn't show
  await tapMonth(1);

  expect(screen.getByText('Spent in January')).toBeOnTheScreen();

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Range: 12 months' }));
  });

  expect(screen.getByText('Spent in November so far')).toBeOnTheScreen();
});

// Where the header's content starts: under the status bar, plus the room it made for a notice
const contentStart = () => {
  const content = screen.getByTestId('header-content');

  const style = Object.assign({}, ...[content.props.style].flat(Infinity).filter(Boolean)) as { paddingTop?: number };

  return Number(style.paddingTop) + Number(getAnimatedStyle(content).marginTop ?? 0);
};

test('online, the header is the mockup height (homeHeaderLayout) with its content right under the status bar', async () => {
  const { fontScale } = Dimensions.get('window');
  await open(realRules());
  await screen.findByText('€84.60');

  // The splash's first guess is this same height
  expect(screen.getByTestId('header-gradient')).toHaveStyle({ minHeight: homeHeaderLayout(47, fontScale).height });
  expect(contentStart()).toBe(47);
});

test('offline, the content slides down to make room for the pill; back online, it slides back', async () => {
  const { fontScale } = Dimensions.get('window');
  const room = noticeLayout(47, fontScale).clearance;
  await open(realRules());
  await screen.findByText('€84.60');

  await act(async () => {
    onlineManager.setOnline(false);
  });

  // The chip and the 6M/12M switch end up below the pill, never under it
  await waitFor(() => expect(contentStart()).toBe(room));

  await act(async () => {
    onlineManager.setOnline(true);
  });

  // "Back online" shows for 2 seconds, then the pill goes and the content slides back up
  await waitFor(() => expect(contentStart()).toBe(47), { timeout: 3500 });
});

test("Home tells the splash its header's real height, so the purple lands exactly on it", async () => {
  reportHeaderHeight.mockClear();
  await open(demo(), undefined, 'hidden');
  await screen.findByText('€84.60');
  await fireEvent(screen.getByTestId('header-gradient'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 389 } },
  });

  expect(reportHeaderHeight).toHaveBeenLastCalledWith(389);
});

test('opened offline (real rules), the header starts in its lowered place: no slide on the first frame', async () => {
  const { fontScale } = Dimensions.get('window');
  await open(realRules(), false);
  await screen.findByTestId('header-content');

  expect(contentStart()).toBe(noticeLayout(47, fontScale).clearance);
});

test("once the splash is gone, Home stops reporting its header's height: nobody needs it", async () => {
  reportHeaderHeight.mockClear();
  await open();
  await screen.findByText('€84.60');
  await fireEvent(screen.getByTestId('header-gradient'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 389 } },
  });

  expect(reportHeaderHeight).not.toHaveBeenCalled();
});

test("in demo mode the Demo badge is always up, so the header always makes room for it", async () => {
  const { fontScale } = Dimensions.get('window');
  await open();
  await screen.findByText('€84.60');

  expect(contentStart()).toBe(noticeLayout(47, fontScale).clearance);
});

test('in a screenshots build the demo has no badge, so the header content sits right under the status bar', async () => {
  mockScreenshotBuild = true;
  await open();
  await screen.findByText('€84.60');

  expect(contentStart()).toBe(47);
});

test('under the splash the card is hidden and rises in as it leaves; the chart draws itself once the splash is gone', async () => {
  await open(demo(), undefined, 'hidden');
  await screen.findByText('€84.60');
  const card = () => screen.getByText('November by product');
  const entrance = () => {
    let node = card().parent;
    while (node !== null && node.props.testID !== 'splash-entrance') {
      node = node.parent;
    }

    return node;
  };

  expect(screen.getByTestId('line-chart').props.accessibilityRole).toBe('progressbar');
  expect(getAnimatedStyle(entrance() ?? card()).opacity).toBe(0);

  // The splash's purple still covers the header while it leaves: the line would draw itself out of sight
  await act(async () => {
    moveSplash('enter');
  });

  expect(screen.getByTestId('line-chart').props.accessibilityRole).toBe('progressbar');

  await act(async () => {
    moveSplash('shown');
  });

  expect(screen.getByTestId('line-chart').props.accessibilityRole).toBe('adjustable');
  expect(within(screen.getByTestId('line-chart')).queryByTestId('skeleton')).not.toBeOnTheScreen();
});

test('offline, switching to 12 months keeps the saved amounts on screen; only the chart waits for the older months', async () => {
  const services = realRules();
  const saved = await Promise.all(monthRange('2026-11', 6).map((month) => services.spending.getMonth('demo-org', month)));
  const getMonth = jest.spyOn(services.spending, 'getMonth');
  const { queryClient } = await open(services, false);

  await act(async () => {
    queryClient.setQueryData(['account', 'me'], await services.account.getCurrentUser());
    for (const month of saved) {
      queryClient.setQueryData(['spending', 'demo-org', month.month], month);
    }
  });
  await screen.findByText('€84.60');
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Range: 6 months' }));
  });

  expect(screen.getByText('€84.60')).toBeOnTheScreen();
  expect(screen.getByText('October')).toBeOnTheScreen();
  expect(screen.getByText('€141.20')).toBeOnTheScreen();
  expect(screen.getByLabelText('Instances, €46.55')).toBeOnTheScreen();
  expect(screen.getByTestId('line-chart').props.accessibilityRole).toBe('progressbar');
  expect(getMonth).not.toHaveBeenCalled();
});

test('no month-end estimate on the 2nd: too early to guess', async () => {
  await open(demo(() => new Date(Date.UTC(2026, 10, 2))));
  await screen.findByText('€84.60');
  await layOutChart();

  expect(screen.queryByText(/by month end/)).not.toBeOnTheScreen();
  expect(screen.getByTestId('line-chart').props.accessibilityValue).toEqual({ text: 'November 2026, €84.60' });
});

test('a brand-new organization: €0.00, nothing to compare (said in words), and a calm line instead of a breakdown', async () => {
  const services = demo();
  jest
    .spyOn(services.spending, 'getMonth')
    .mockImplementation(async (_organizationId, month) => ({
      month,
      total: { minor: 0, currency: 'EUR' },
      byProduct: [],
      byProject: [],
      discount: { minor: 0, currency: 'EUR' },
    }));
  await open(services);

  // The amount, and October's total beside it
  expect(await screen.findAllByText('€0.00')).toHaveLength(2);
  expect(screen.getByText('Nothing spent in November so far.')).toBeOnTheScreen();

  await layOutChart();
  await tapMonth(3);

  // September vs August, both €0.00: no percentage
  expect(screen.getByText('vs August')).toBeOnTheScreen();
  expect(screen.getByText('—').props.accessibilityLabel).toBe('Nothing to compare');
  expect(screen.getByText('Nothing spent in September.')).toBeOnTheScreen();
});

test('a month picked in 12 months is forgotten when the range changes: back in 12 months it is now again', async () => {
  await open();
  await screen.findByText('€84.60');
  // One tap anywhere on the switch shows the other range; the name says which one it is on
  const pressRange = async (name: string) => {
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name }));
    });
  };

  await layOutChart();
  await pressRange('Range: 6 months');
  await screen.findByText('D');
  // January
  await tapMonth(1);

  expect(screen.getByText('Spent in January')).toBeOnTheScreen();

  await pressRange('Range: 12 months');
  await pressRange('Range: 6 months');

  expect(screen.getByText('Spent in November so far')).toBeOnTheScreen();
});

test('a month picked before a new month began goes back to now once the chart no longer shows it', async () => {
  let today = NOW;
  const { queryClient } = await open(demo(() => today));
  await screen.findByText('€84.60');
  await layOutChart();
  await tapMonth(0);

  expect(screen.getByText('Spent in June')).toBeOnTheScreen();

  // Home stayed open into December (6 months are now July to December), and November's last charges come in
  today = new Date(Date.UTC(2026, 11, 1));
  await act(async () => {
    queryClient.setQueryData(['spending', 'demo-org', '2026-11'], {
      month: '2026-11',
      total: { minor: 15020, currency: 'EUR' },
      byProduct: [],
      byProject: [],
      discount: { minor: 0, currency: 'EUR' },
    });
  });

  expect(screen.getByText('Spent in December so far')).toBeOnTheScreen();
});

test("when the projects can't be loaded, the chip says so and opens the picker, where Try again is", async () => {
  const services = demo();
  jest.spyOn(services.workspace, 'listProjects').mockRejectedValue(new AppError('server', 'Down', 503));
  await open(services);
  await screen.findByText('€84.60');

  await press("Couldn't load projects");

  expect(screen.getByText("Couldn't load your projects")).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
});
