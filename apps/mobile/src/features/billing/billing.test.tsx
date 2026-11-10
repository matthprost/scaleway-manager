import { AppError, DEFAULT_PREFERENCES, LOCK_TIMEOUT_MS, monthRange } from '@scaleway-manager/core';
import type { Invoice, MonthKey } from '@scaleway-manager/core';
import { noticeLayout, sizes, spacing, typography } from '@scaleway-manager/ui';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { AppState, Dimensions } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { getAnimatedStyle as getStyle } from 'react-native-reanimated';
import type { getAnimatedStyle as NativeGetAnimatedStyle } from 'react-native-reanimated/lib/typescript/jestUtils/index.native';

import Billing from '../../../app/(tabs)/billing';
import { renderWithApp } from '../../test-utils/renderWithApp';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { LockProvider } from '../lock/LockProvider';

// TypeScript sees Reanimated's web stub of getAnimatedStyle; Jest runs the native one
const getAnimatedStyle = getStyle as unknown as typeof NativeGetAnimatedStyle;

// 18 November 2026: the demo's November is €84.60 so far
const NOW = new Date(Date.UTC(2026, 10, 18));

const FORBIDDEN = new AppError('forbidden', 'No billing', 403);

const CALM_MESSAGE = "You don't have access to billing in this organization.";

// The demo (no network), on a fixed day, with its own empty phone storage
const demo = (): Services => {
  const saved = new Map<string, string>();

  return createServices('demo', {
    clock: { now: () => NOW },
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

const open = async (services: Services = demo(), online?: boolean) =>
  renderWithApp(
    <LockProvider>
      <Billing />
    </LockProvider>,
    { services, online },
  );

// The chart draws once it knows how wide it is
const layOutChart = async () => {
  await fireEvent(screen.getByTestId('line-chart'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 230 } },
  });
};

const press = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
};

const invoiceRows = () => screen.getAllByRole('button', { name: /, Invoice \d+/ });

// One invoice's row, by the month it bills ("October 2026")
const invoiceRow = (month: string) => screen.getByRole('button', { name: new RegExp(`^${month}, `) });

// A download the test finishes when it wants
const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((ok) => {
    resolve = ok;
  });

  return { promise, resolve };
};

const PDF = { fileName: 'invoice-2026010.pdf', base64: 'JVBERi0xLjQK' };

const invoice = (overrides: Partial<Invoice>): Invoice => ({
  id: 'invoice',
  number: 1,
  periodStart: '2026-10-01T00:00:00Z',
  issuedAt: '2026-11-02T00:00:00Z',
  totalUntaxed: { minor: 14120, currency: 'EUR' },
  state: 'paid',
  ...overrides,
});

afterEach(() => {
  jest.restoreAllMocks();
  onlineManager.setOnline(true);
});

test('shows 12 months and all products', async () => {
  const { fontScale } = Dimensions.get('window');
  const services = demo();
  const getMonth = jest.spyOn(services.spending, 'getMonth');
  await open(services);

  expect(await screen.findByText('€84.60')).toBeOnTheScreen();

  await layOutChart();

  // 12 months by default, on the larger chart
  expect(screen.getByRole('button', { name: 'Range: 12 months' })).toBeOnTheScreen();
  expect((getMonth.mock.calls as [string, MonthKey][]).map(([, month]) => month).sort()).toEqual(
    monthRange('2026-11', 12),
  );
  expect(screen.getByTestId('chart-dot-11')).toBeOnTheScreen();
  expect(screen.queryByTestId('chart-dot-12')).not.toBeOnTheScreen();
  expect(screen.getAllByText('J')).toHaveLength(3);
  expect(screen.getByTestId('line-chart')).toHaveStyle({
    height: 2 * typography.caption.lineHeight * fontScale + sizes.chartLarge + spacing.xxs,
  });

  // The bar: the three biggest products, then the rest
  expect(screen.getByText('November by product')).toBeOnTheScreen();
  expect(screen.getByLabelText('Other, €5.91')).toBeOnTheScreen();

  // Then every product, one row each (the three biggest are in the bar's legend too)
  // The same heading look as "Invoices" below it (a SectionHeader, not a Section's small capitals)
  expect(
    screen.getAllByTestId('section-header').some((header) => within(header).queryByText('All products') !== null),
  ).toBe(true);
  expect(screen.queryByText('ALL PRODUCTS')).not.toBeOnTheScreen();
  expect(screen.getAllByLabelText('Instances, €46.55')).toHaveLength(2);
  expect(screen.getAllByLabelText('Kubernetes, €21.15')).toHaveLength(2);
  expect(screen.getAllByLabelText('Databases, €10.99')).toHaveLength(2);
  expect(screen.getByLabelText('Object Storage, €3.38')).toBeOnTheScreen();
  expect(screen.getByLabelText('Load Balancer, €2.53')).toBeOnTheScreen();
});

test('invoice rows show untaxed totals', async () => {
  await open();
  await screen.findByText('€84.60');

  expect(screen.getByRole('header', { name: 'Invoices' })).toBeOnTheScreen();
  // Newest first: the 11 finished months of the demo
  expect(invoiceRows()).toHaveLength(11);
  expect(invoiceRows()[0]).toHaveAccessibleName('October 2026, Invoice 2026010 · Paid, €141.20');
  expect(invoiceRows()[10]).toHaveAccessibleName('December 2025, Invoice 2025012 · Paid, €72.10');
  expect(within(invoiceRow('October 2026')).getByText('€141.20')).toBeOnTheScreen();
});

test('tapping an invoice downloads then shares the PDF', async () => {
  const services = realRules();
  const download = deferred<typeof PDF>();
  const downloadPdf = jest.spyOn(services.invoices, 'downloadPdf').mockReturnValue(download.promise);
  const sharePdf = jest.spyOn(services.files, 'sharePdf');
  await open(services);
  await screen.findByText('€84.60');

  await press(/^October 2026, /);

  expect(downloadPdf).toHaveBeenCalledWith('demo-invoice-2026-10');
  // The row spins and waits; nothing is shared before the PDF is here
  expect(within(invoiceRow('October 2026')).getByTestId('row-spinner')).toBeOnTheScreen();
  expect(invoiceRow('October 2026')).toBeBusy();
  expect(sharePdf).not.toHaveBeenCalled();

  await act(async () => {
    download.resolve(PDF);
  });

  expect(sharePdf).toHaveBeenCalledWith(PDF.fileName, PDF.base64);
  expect(within(invoiceRow('October 2026')).queryByTestId('row-spinner')).not.toBeOnTheScreen();
  expect(invoiceRow('October 2026')).not.toBeBusy();
});

test("in the demo, tapping an invoice says invoices aren't available there, and downloads nothing", async () => {
  const services = demo();
  const downloadPdf = jest.spyOn(services.invoices, 'downloadPdf');
  const sharePdf = jest.spyOn(services.files, 'sharePdf');
  await open(services);
  await screen.findByText('€84.60');

  await press(/^October 2026, /);

  // The quiet line, right away: no spinner that leads nowhere
  expect(screen.getByText("Invoices aren't available in the demo.")).toBeOnTheScreen();
  expect(within(invoiceRow('October 2026')).queryByTestId('row-spinner')).not.toBeOnTheScreen();
  expect(invoiceRow('September 2026')).toBeEnabled();
  expect(downloadPdf).not.toHaveBeenCalled();
  expect(sharePdf).not.toHaveBeenCalled();
});

test('invoices are disabled while offline', async () => {
  const services = realRules();
  const downloadPdf = jest.spyOn(services.invoices, 'downloadPdf');
  await open(services);
  await screen.findByText('€84.60');

  await act(async () => {
    onlineManager.setOnline(false);
  });

  for (const row of invoiceRows()) {
    expect(row).toBeDisabled();
  }
  expect(screen.getByText("You're offline")).toBeOnTheScreen();

  await act(async () => {
    fireEvent.press(invoiceRow('October 2026'));
  });

  expect(downloadPdf).not.toHaveBeenCalled();

  await act(async () => {
    onlineManager.setOnline(true);
  });

  expect(invoiceRow('October 2026')).toBeEnabled();
  expect(screen.queryByText("You're offline")).not.toBeOnTheScreen();
});

test('billing permission missing shows the calm message', async () => {
  const services = demo();
  jest.spyOn(services.spending, 'getMonth').mockRejectedValue(FORBIDDEN);
  jest.spyOn(services.invoices, 'list').mockRejectedValue(FORBIDDEN);
  await open(services);

  expect(await screen.findByText("Billing isn't available")).toBeOnTheScreen();
  expect(screen.getByText(CALM_MESSAGE)).toBeOnTheScreen();
  // Said once, for the whole screen; it isn't a failure, so nothing to retry
  expect(screen.getAllByText("Billing isn't available")).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
  // The title stays on the purple header; no chart, switch, breakdown or invoices
  expect(screen.getByRole('header', { name: 'Billing' })).toBeOnTheScreen();
  expect(screen.queryByTestId('line-chart')).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Range: / })).not.toBeOnTheScreen();
  expect(screen.queryByText(/by product$/)).not.toBeOnTheScreen();
  expect(screen.queryByText('Invoices')).not.toBeOnTheScreen();
});

test("the header says Billing on purple, with no project chip: the spending is the whole organization's", async () => {
  await open();
  await screen.findByText('€84.60');

  expect(screen.getByRole('header', { name: 'Billing' })).toBeOnTheScreen();
  expect(screen.getByText('Spent in November so far')).toBeOnTheScreen();
  expect(within(screen.getByTestId('header-content')).getByText('October')).toBeOnTheScreen();
  expect(within(screen.getByTestId('header-content')).getByText('€141.20')).toBeOnTheScreen();
  expect(screen.getByText('All projects in Acme')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Acme · Production' })).not.toBeOnTheScreen();
});

test('the purple reaches both screen edges; on an iPad the header and the cards line up at 560', async () => {
  await open();
  await screen.findByText('€84.60');
  const styleOf = (element: ReturnType<typeof screen.getByTestId>) =>
    Object.assign({}, ...[element.props.style].flat(Infinity).filter(Boolean)) as { [key: string]: unknown };
  const centredAt560 = (element: ReturnType<typeof screen.getByTestId>) => {
    for (let node: typeof element | null = element; node !== null; node = node.parent) {
      if (styleOf(node).maxWidth === sizes.contentMaxWidth && styleOf(node).alignSelf === 'center') {
        return true;
      }
    }

    return false;
  };

  // A full-bleed screen: nothing narrows the purple
  expect(styleOf(screen.getByTestId('screen-content')).paddingHorizontal).toBe(0);
  expect(styleOf(screen.getByTestId('screen-content')).maxWidth).toBeUndefined();
  expect(centredAt560(screen.getByTestId('header-content'))).toBe(true);
  expect(centredAt560(screen.getByText('November by product'))).toBe(true);
  expect(centredAt560(screen.getByRole('header', { name: 'Invoices' }))).toBe(true);
});

test.each([
  ['in demo mode, the Demo badge is always up: room for it', demo, undefined, true],
  ['online (real rules), the content sits right under the status bar', realRules, true, false],
  ['opened offline (real rules), the content starts below the offline pill', realRules, false, true],
] as const)('the header and a notice: %s', async (_case, services, online, room) => {
  const { fontScale } = Dimensions.get('window');
  await open(services(), online);
  const content = await screen.findByTestId('header-content');
  const style = Object.assign({}, ...[content.props.style].flat(Infinity).filter(Boolean)) as { paddingTop?: number };

  // Under the status bar, plus the room it made for a notice
  expect(Number(style.paddingTop) + Number(getAnimatedStyle(content).marginTop ?? 0)).toBe(
    room ? noticeLayout(47, fontScale).clearance : 47,
  );
});

test('tapping a month shows it in the header, the card and every product row; Back to now returns', async () => {
  await open();
  await screen.findByText('€84.60');
  await layOutChart();
  // A tap on September: the finger goes down and lifts at its dot
  const x = (screen.getByTestId('chart-dot-9').props as { cx: number }).cx;
  const event = { nativeEvent: { locationX: x, pageX: x, pageY: 50 } };
  await fireEvent(screen.getByTestId('chart-touch'), 'responderGrant', event);
  await fireEvent(screen.getByTestId('chart-touch'), 'responderRelease', event);

  expect(screen.getByText('Spent in September')).toBeOnTheScreen();
  expect(screen.getByText('vs August')).toBeOnTheScreen();
  expect(screen.getByText('+19%')).toBeOnTheScreen();
  expect(screen.getByText('September by product')).toBeOnTheScreen();
  expect(screen.getAllByLabelText('Instances, €65.25')).toHaveLength(2);
  expect(screen.getByLabelText('Object Storage, €4.74')).toBeOnTheScreen();
  expect(screen.getByLabelText('Load Balancer, €3.55')).toBeOnTheScreen();

  await press('Back to now');

  expect(screen.getByText('Spent in November so far')).toBeOnTheScreen();
  expect(screen.getByLabelText('Object Storage, €3.38')).toBeOnTheScreen();
});

test('without access to the invoices only, the spending still shows and Invoices says why', async () => {
  const services = demo();
  jest.spyOn(services.invoices, 'list').mockRejectedValue(FORBIDDEN);
  await open(services);

  expect(await screen.findByText("Billing isn't available")).toBeOnTheScreen();
  expect(screen.getByText(CALM_MESSAGE)).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Invoices' })).toBeOnTheScreen();
  expect(screen.getByText('€84.60')).toBeOnTheScreen();
  expect(screen.getByText('November by product')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
});

test('without access to the spending only, the calm card shows and the invoices that loaded stay', async () => {
  const services = demo();
  jest.spyOn(services.spending, 'getMonth').mockRejectedValue(FORBIDDEN);
  await open(services);

  expect(await screen.findByText("Billing isn't available")).toBeOnTheScreen();
  expect(await screen.findByRole('button', { name: /^October 2026, / })).toBeOnTheScreen();
  expect(invoiceRows()).toHaveLength(11);
  expect(screen.getAllByText("Billing isn't available")).toHaveLength(1);
});

test('the invoices on the phone stay on screen when a refresh fails', async () => {
  const services = demo();
  const { queryClient } = await open(services);
  await screen.findByRole('button', { name: /^October 2026, / });

  jest.spyOn(services.invoices, 'list').mockRejectedValue(new AppError('server', 'Down', 503));
  await act(async () => {
    await queryClient.refetchQueries({ queryKey: ['invoices'] });
    // The cache tells the screen on its next tick
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  expect(queryClient.getQueryState(['invoices', 'demo-org'])?.status).toBe('error');
  expect(invoiceRows()).toHaveLength(11);
  expect(screen.queryByText("Couldn't load your invoices")).not.toBeOnTheScreen();
});

test('an organization with no invoices yet says so', async () => {
  const services = demo();
  jest.spyOn(services.invoices, 'list').mockResolvedValue([]);
  await open(services);

  expect(await screen.findByText('No invoices yet')).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Invoices' })).toBeOnTheScreen();
});

test('while the invoices load, their section shows placeholders shaped like invoice rows', async () => {
  const { fontScale } = Dimensions.get('window');
  const services = demo();
  jest.spyOn(services.invoices, 'list').mockReturnValue(new Promise<Invoice[]>(() => {}));
  await open(services);
  await screen.findByText('€84.60');
  const skeletons = screen.getAllByTestId('skeleton');

  expect(screen.getByRole('header', { name: 'Invoices' })).toBeOnTheScreen();
  // Three rows, each a title line above a subtitle line, about as tall as the rows that come
  expect(skeletons).toHaveLength(6);
  expect(
    skeletons.map((skeleton) => Object.assign({}, ...[skeleton.props.style].flat(Infinity).filter(Boolean)).height),
  ).toEqual(
    [0, 1, 2].flatMap(() => [typography.body.lineHeight * fontScale, typography.subhead.lineHeight * fontScale]),
  );
});

test("invoices that can't be loaded offer Try again, which loads them again", async () => {
  const services = demo();
  const list = jest.spyOn(services.invoices, 'list').mockRejectedValue(new AppError('server', 'Down', 503));
  await open(services);

  expect(await screen.findByText("Couldn't load your invoices")).toBeOnTheScreen();

  list.mockRestore();
  await press('Try again');

  expect(await screen.findByRole('button', { name: /^October 2026, / })).toBeOnTheScreen();
  expect(screen.queryByText("Couldn't load your invoices")).not.toBeOnTheScreen();
});

test("spending that can't be loaded: one card says so, and its Try again loads the spending and the invoices again", async () => {
  const services = demo();
  const getMonth = jest.spyOn(services.spending, 'getMonth').mockRejectedValue(new AppError('server', 'Down', 503));
  const list = jest.spyOn(services.invoices, 'list').mockRejectedValue(new AppError('server', 'Down', 503));
  await open(services);

  expect(await screen.findByText("Couldn't load your spending")).toBeOnTheScreen();
  // One Try again for the screen: the invoices wait for it
  expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1);
  expect(screen.queryByText("Couldn't load your invoices")).not.toBeOnTheScreen();
  expect(screen.queryByTestId('line-chart')).not.toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Billing' })).toBeOnTheScreen();

  getMonth.mockRestore();
  list.mockRestore();
  await press('Try again');

  expect(await screen.findByText('€84.60')).toBeOnTheScreen();
  expect(await screen.findByRole('button', { name: /^October 2026, / })).toBeOnTheScreen();
});

test("Try again for the spending is turned off while offline, and says why", async () => {
  const services = realRules();
  jest.spyOn(services.spending, 'getMonth').mockRejectedValue(new AppError('server', 'Down', 503));
  await open(services);
  await screen.findByText("Couldn't load your spending");

  await act(async () => {
    onlineManager.setOnline(false);
  });

  expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
  // Said once, under the card's Try again: the invoices still show (a failure never hides what loaded), their rows
  // are off too, and don't say it again
  expect(screen.getAllByText("You're offline")).toHaveLength(1);
  expect(invoiceRows()).toHaveLength(11);
  for (const row of invoiceRows()) {
    expect(row).toBeDisabled();
  }
});

test('a download that fails says so quietly above the invoices, never in a toast, and can be tried again', async () => {
  const services = realRules();
  const downloadPdf = jest
    .spyOn(services.invoices, 'downloadPdf')
    .mockRejectedValue(new AppError('server', 'Down', 503));
  await open(services);
  await screen.findByText('€84.60');

  await press(/^October 2026, /);
  const tree = JSON.stringify(screen.toJSON());

  expect(screen.getByText("Couldn't open the invoice. Please try again.")).toBeOnTheScreen();
  // Right under "Invoices", above the newest invoices that people tap, not below the whole list
  expect(tree.indexOf("Couldn't open the invoice")).toBeGreaterThan(tree.indexOf('"Invoices"'));
  expect(tree.indexOf("Couldn't open the invoice")).toBeLessThan(tree.indexOf('October 2026, Invoice 2026010'));
  expect(screen.queryByTestId('toast')).not.toBeOnTheScreen();
  expect(invoiceRow('October 2026')).toBeEnabled();

  // Sharing can fail too
  downloadPdf.mockResolvedValue(PDF);
  const sharePdf = jest.spyOn(services.files, 'sharePdf').mockRejectedValueOnce(new Error('No app to open it'));
  await press(/^October 2026, /);

  expect(sharePdf).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Couldn't open the invoice. Please try again.")).toBeOnTheScreen();

  // A new try that works clears the line
  await press(/^October 2026, /);

  expect(sharePdf).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("Couldn't open the invoice. Please try again.")).not.toBeOnTheScreen();
});

test('while one invoice opens, the others wait, and look it', async () => {
  const services = realRules();
  const download = deferred<typeof PDF>();
  const downloadPdf = jest.spyOn(services.invoices, 'downloadPdf').mockReturnValue(download.promise);
  await open(services);
  await screen.findByText('€84.60');

  await press(/^October 2026, /);

  // The one opening spins at full colour; the others are faded and can't be pressed
  expect(invoiceRow('October 2026')).toBeBusy();
  expect(invoiceRow('October 2026')).toHaveStyle({ opacity: 1 });
  expect(invoiceRow('September 2026')).toBeDisabled();
  expect(invoiceRow('September 2026')).toHaveStyle({ opacity: 0.5 });

  await press(/^September 2026, /);

  expect(downloadPdf).toHaveBeenCalledTimes(1);

  await act(async () => {
    download.resolve(PDF);
  });

  expect(invoiceRow('September 2026')).toBeEnabled();
});

test('leaving Billing while an invoice downloads shares nothing', async () => {
  const services = realRules();
  const download = deferred<typeof PDF>();
  jest.spyOn(services.invoices, 'downloadPdf').mockReturnValue(download.promise);
  const sharePdf = jest.spyOn(services.files, 'sharePdf');
  await open(services);
  await screen.findByText('€84.60');

  await press(/^October 2026, /);
  await screen.unmount();
  await act(async () => {
    download.resolve(PDF);
  });

  expect(sharePdf).not.toHaveBeenCalled();
});

test('a PDF that arrives once the lock covers the app is not shared: the share sheet would sit above the lock', async () => {
  let now = NOW;
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.push(listener);

    return { remove: () => {} };
  });
  const goTo = async (state: AppStateStatus) => {
    await act(async () => {
      for (const listener of listeners) {
        listener(state);
      }
    });
  };
  const lockOn = { ...DEFAULT_PREFERENCES, biometricLock: 'on' as const };
  const services: Services = {
    ...realRules(),
    clock: { now: () => now },
    preferences: { read: async () => lockOn, update: async () => lockOn },
    // Face ID lets you in at launch; after a long time away the scan fails, so the app stays locked
    biometric: { isAvailable: async () => true, authenticate: jest.fn().mockResolvedValueOnce(true).mockResolvedValue(false) },
  };
  const download = deferred<typeof PDF>();
  jest.spyOn(services.invoices, 'downloadPdf').mockReturnValue(download.promise);
  const sharePdf = jest.spyOn(services.files, 'sharePdf');
  await open(services);
  await screen.findByRole('button', { name: /^October 2026, / });

  await press(/^October 2026, /);
  await goTo('background');
  now = new Date(NOW.getTime() + LOCK_TIMEOUT_MS);
  await goTo('active');
  await act(async () => {
    download.resolve(PDF);
  });

  expect(services.biometric.authenticate).toHaveBeenCalledTimes(2);
  expect(sharePdf).not.toHaveBeenCalled();
});

test("invoice states are said in plain words; one the app doesn't know is left out", async () => {
  const services = demo();
  jest.spyOn(services.invoices, 'list').mockResolvedValue([
    invoice({ id: 'a', number: 7, state: 'issued' }),
    invoice({ id: 'b', number: 8, state: 'PAID' }),
    invoice({ id: 'c', number: 9, state: 'something_new' }),
  ]);
  await open(services);
  await screen.findByText('€84.60');

  expect(screen.getByText('Invoice 7 · Unpaid')).toBeOnTheScreen();
  expect(screen.getByText('Invoice 8 · Paid')).toBeOnTheScreen();
  expect(screen.getByText('Invoice 9')).toBeOnTheScreen();
});
