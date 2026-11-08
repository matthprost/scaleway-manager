import { AppError } from '@scaleway-manager/core';
import type { MonthKey, MonthSpending, Project } from '@scaleway-manager/core';
import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen, within } from '@testing-library/react-native';

import Billing from '../../../app/(tabs)/billing';
import { renderWithApp } from '../../test-utils/renderWithApp';
import { createServices } from '../../wiring/services';
import type { Services } from '../../wiring/services';
import { LockProvider } from '../lock/LockProvider';

// 18 November 2026: the demo's November is €84.60 so far (Production €65.06, Staging €19.54)
const NOW = new Date(Date.UTC(2026, 10, 18));

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

// The demo's data with the real app's rules: the network counts (the demo itself ignores it)
const realRules = (): Services => ({ ...demo(), mode: 'real' });

const open = async (services: Services = demo()) =>
  renderWithApp(
    <LockProvider>
      <Billing />
    </LockProvider>,
    { services },
  );

const press = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
};

const showProjects = () => press('Breakdown: Products');

const eur = (minor: number) => ({ minor, currency: 'EUR' });

const project = (id: string, name: string): Project => ({ id, name, organizationId: 'demo-org' });

// Every month spent like this: one product per project, and the organization's discount
const spentBy =
  (byProject: MonthSpending['byProject'], discount = 0) =>
  async (_organizationId: string, month: MonthKey): Promise<MonthSpending> => {
    const spent = byProject.reduce((sum, part) => sum + part.amount.minor, 0);

    return {
      month,
      total: eur(spent - discount),
      byProduct: [{ product: 'Instances', amount: eur(spent) }],
      byProject,
      discount: eur(discount),
    };
  };

const inProject = (projectId: string, minor: number) => ({
  projectId,
  amount: eur(minor),
  byProduct: [{ product: 'Instances', amount: eur(minor) }],
});

// Five projects, one of them not in the list (deleted, or this user can't see it), and a discount
const fiveProjects = (services: Services) => {
  jest.spyOn(services.workspace, 'listProjects').mockResolvedValue([
    project('p-web', 'Web'),
    project('p-data', 'Data'),
    project('p-ops', 'Ops'),
    project('p-ml', 'ML'),
  ]);
  jest
    .spyOn(services.spending, 'getMonth')
    .mockImplementation(
      spentBy(
        [
          inProject('p-web', 5000),
          inProject('p-gone', 3000),
          inProject('p-data', 1000),
          inProject('p-ops', 500),
          inProject('p-ml', 200),
        ],
        450,
      ),
    );
};

const projectRows = () => screen.getAllByRole('button', { name: /^(Production|Staging|Web|Data|Ops|ML|Unknown project), €/ });

const sheet = () => within(screen.getByTestId('sheet-content'));

afterEach(() => {
  jest.restoreAllMocks();
  onlineManager.setOnline(true);
});

test('the card switches between Products (the default, as before) and Projects', async () => {
  await open();
  await screen.findByText('€84.60');

  expect(screen.getByRole('button', { name: 'Breakdown: Products' })).toBeOnTheScreen();
  expect(screen.getByText('November by product')).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'All products' })).toBeOnTheScreen();

  await showProjects();

  // Said like the 6M/12M switch
  expect(screen.getByRole('button', { name: 'Breakdown: Projects' })).toBeOnTheScreen();
  expect(screen.getByText('November by project')).toBeOnTheScreen();
  expect(screen.queryByText('November by product')).not.toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'All projects' })).toBeOnTheScreen();
  expect(screen.queryByRole('header', { name: 'All products' })).not.toBeOnTheScreen();

  await press('Breakdown: Projects');

  expect(screen.getByText('November by product')).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'All products' })).toBeOnTheScreen();
});

test('Projects: the bar, then one row per project, largest first, each a button with its amount', async () => {
  await open();
  await screen.findByText('€84.60');
  await showProjects();

  expect(projectRows().map((row) => row.props.accessibilityLabel)).toEqual([
    'Production, €65.06',
    'Staging, €19.54',
  ]);
  // The bar's legend says the same, so each is there twice
  expect(screen.getAllByLabelText('Production, €65.06')).toHaveLength(2);
  expect(screen.getAllByLabelText('Staging, €19.54')).toHaveLength(2);
  // No discount in the demo: nothing to say about one
  expect(screen.queryByText('Before discounts')).not.toBeOnTheScreen();
  // Project ids never show
  expect(screen.queryByText(/demo-prod|demo-staging/)).not.toBeOnTheScreen();
});

test('the bar keeps the three biggest projects and adds up the rest as Other; a project not in the list is unknown', async () => {
  const services = demo();
  fiveProjects(services);
  await open(services);
  await screen.findByText('November by product');
  await showProjects();

  expect(projectRows().map((row) => row.props.accessibilityLabel)).toEqual([
    'Web, €50.00',
    'Unknown project, €30.00',
    'Data, €10.00',
    'Ops, €5.00',
    'ML, €2.00',
  ]);
  expect(screen.getByLabelText('Other, €7.00')).toBeOnTheScreen();
  expect(screen.getAllByLabelText('Data, €10.00')).toHaveLength(2);
  expect(screen.getAllByLabelText('Ops, €5.00')).toHaveLength(1);
  expect(screen.queryByText('p-gone')).not.toBeOnTheScreen();
});

test('two unknown projects are two rows, and two parts of the bar', async () => {
  const services = demo();
  const errors = jest.spyOn(console, 'error');
  jest
    .spyOn(services.spending, 'getMonth')
    .mockImplementation(spentBy([inProject('p-old', 6000), inProject('demo-prod', 2000), inProject('p-older', 460)]));
  await open(services);
  await screen.findByText('November by product');
  await showProjects();

  expect(projectRows().map((row) => row.props.accessibilityLabel)).toEqual([
    'Unknown project, €60.00',
    'Production, €20.00',
    'Unknown project, €4.60',
  ]);
  expect(screen.getAllByLabelText('Unknown project, €60.00')).toHaveLength(2);
  expect(screen.getAllByLabelText('Unknown project, €4.60')).toHaveLength(2);
  expect(screen.getAllByTestId('breakdown-segment', { includeHiddenElements: true })).toHaveLength(3);
  expect(errors).not.toHaveBeenCalled();
});

test('in a month with a discount, the projects say their amounts are before it, and so does a project sheet', async () => {
  const services = demo();
  fiveProjects(services);
  await open(services);
  await screen.findByText('November by product');

  // Not in the Products view: the products add up to what was billed before the discount, as before
  expect(screen.queryByText('Before discounts')).not.toBeOnTheScreen();

  await showProjects();

  expect(screen.getByText('Before discounts')).toBeOnTheScreen();

  await press('Unknown project, €30.00');

  expect(sheet().getByRole('header', { name: 'Unknown project' })).toBeOnTheScreen();
  expect(sheet().getByText('Before discounts')).toBeOnTheScreen();
});

test('with fewer than 2 projects that month, there is no switch: the card is by product', async () => {
  const services = demo();
  jest.spyOn(services.spending, 'getMonth').mockImplementation(spentBy([inProject('demo-prod', 8460)]));
  await open(services);

  expect(await screen.findByText('November by product')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Breakdown: / })).not.toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'All products' })).toBeOnTheScreen();
});

test("tapping a project opens its sheet: that month's total, its bar by product and all its products", async () => {
  await open();
  await screen.findByText('€84.60');
  await showProjects();

  await press('Production, €65.06');

  expect(sheet().getByRole('header', { name: 'Production' })).toBeOnTheScreen();
  expect(sheet().getByText('Spent in November 2026 so far')).toBeOnTheScreen();
  expect(sheet().getByText('€65.06')).toBeOnTheScreen();
  // The three biggest products, then the rest
  expect(sheet().getByLabelText('Other, €4.56')).toBeOnTheScreen();
  expect(sheet().getByRole('header', { name: 'All products' })).toBeOnTheScreen();
  // Every product, one row each (the three biggest are in the legend too)
  expect(sheet().getAllByLabelText('Instances, €32.59')).toHaveLength(2);
  expect(sheet().getAllByLabelText('Kubernetes, €16.92')).toHaveLength(2);
  expect(sheet().getAllByLabelText('Databases, €10.99')).toHaveLength(2);
  expect(sheet().getByLabelText('Load Balancer, €2.53')).toBeOnTheScreen();
  expect(sheet().getByLabelText('Object Storage, €2.03')).toBeOnTheScreen();
  // Read-only: nothing to do in it but read and close
  expect(sheet().getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual(['Close']);

  await press('Close');

  expect(screen.queryByTestId('sheet-content')).not.toBeOnTheScreen();

  // Another project, its own products
  await press('Staging, €19.54');

  expect(sheet().getByRole('header', { name: 'Staging' })).toBeOnTheScreen();
  expect(sheet().getAllByLabelText('Instances, €13.96')).toHaveLength(2);
  expect(sheet().queryByText('Databases')).not.toBeOnTheScreen();
});

test('the Projects view and its sheets follow the month picked on the chart', async () => {
  await open();
  await screen.findByText('€84.60');
  // The chart draws once it knows how wide it is
  await fireEvent(screen.getByTestId('line-chart'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 230 } },
  });
  await showProjects();

  // A tap on September: the finger goes down and lifts at its dot
  const x = (screen.getByTestId('chart-dot-9').props as { cx: number }).cx;
  const event = { nativeEvent: { locationX: x, pageX: x, pageY: 50 } };
  await fireEvent(screen.getByTestId('chart-touch'), 'responderGrant', event);
  await fireEvent(screen.getByTestId('chart-touch'), 'responderRelease', event);

  expect(screen.getByText('September by project')).toBeOnTheScreen();
  expect(projectRows().map((row) => row.props.accessibilityLabel)).toEqual([
    'Production, €91.20',
    'Staging, €27.40',
  ]);

  await press('Production, €91.20');

  // A past month: no "so far"
  expect(sheet().getByText('Spent in September 2026')).toBeOnTheScreen();

  await press('Close');
  await press('Back to now');

  expect(screen.getByText('November by project')).toBeOnTheScreen();
  expect(projectRows()[0]).toHaveAccessibleName('Production, €65.06');
});

test('while the project names load, the Projects view shows placeholders, never ids', async () => {
  const services = demo();
  jest.spyOn(services.workspace, 'listProjects').mockReturnValue(new Promise<Project[]>(() => {}));
  await open(services);
  await screen.findByText('€84.60');
  await showProjects();

  expect(screen.getByText('November by project')).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'All projects' })).toBeOnTheScreen();
  // The projects' bar isn't drawn yet: its placeholders stand in for it, and for the rows
  expect(screen.queryByTestId('breakdown-bar', { includeHiddenElements: true })).not.toBeOnTheScreen();
  expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  expect(screen.queryByText(/demo-prod|demo-staging|Unknown project/)).not.toBeOnTheScreen();
  expect(screen.queryAllByRole('button', { name: /^(Production|Staging|Unknown project), / })).toEqual([]);
});

test("when the project names can't be loaded, the Projects view says so, and Try again loads them", async () => {
  const services = demo();
  const listProjects = jest
    .spyOn(services.workspace, 'listProjects')
    .mockRejectedValue(new Error('Scaleway is down'));
  await open(services);
  await screen.findByText('€84.60');
  await showProjects();

  expect(screen.getByText("Couldn't load your projects")).toBeOnTheScreen();
  // Not every project shown as unknown
  expect(screen.queryByText('Unknown project')).not.toBeOnTheScreen();

  listProjects.mockRestore();
  await press('Try again');

  expect(await screen.findByRole('button', { name: 'Production, €65.06' })).toBeOnTheScreen();
  expect(screen.queryByText("Couldn't load your projects")).not.toBeOnTheScreen();
});

test("offline with the project names failed, \"You're offline\" is said once: by the Projects view, not the invoices too", async () => {
  const services = realRules();
  jest.spyOn(services.workspace, 'listProjects').mockRejectedValue(new AppError('server', 'Down', 503));
  await open(services);
  await screen.findByRole('button', { name: /^October 2026, / });
  await showProjects();

  await act(async () => {
    onlineManager.setOnline(false);
  });

  expect(screen.getByText("Couldn't load your projects")).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
  expect(screen.getAllByText("You're offline")).toHaveLength(1);

  // Back on Products, the invoices say it
  await press('Breakdown: Projects');

  expect(screen.getAllByText("You're offline")).toHaveLength(1);
});

test('when Scaleway refuses the project list, there is no switch: nothing to name the projects with, and Try again would not help', async () => {
  const services = demo();
  jest.spyOn(services.workspace, 'listProjects').mockRejectedValue(new AppError('forbidden', 'No projects', 403));
  await open(services);

  expect(await screen.findByText('€84.60')).toBeOnTheScreen();
  expect(screen.getByText('November by product')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Breakdown: / })).not.toBeOnTheScreen();
  expect(screen.queryByText("Couldn't load your projects")).not.toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'All products' })).toBeOnTheScreen();
});

test('with an empty project list, there is no switch either', async () => {
  const services = demo();
  jest.spyOn(services.workspace, 'listProjects').mockResolvedValue([]);
  await open(services);

  expect(await screen.findByText('November by product')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Breakdown: / })).not.toBeOnTheScreen();
  expect(screen.queryByText('Unknown project')).not.toBeOnTheScreen();
});
