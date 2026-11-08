import { lightColors, Screen, sizes, Text } from '@scaleway-manager/ui';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import type { ComponentType, ReactNode } from 'react';
import { processColor, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Account from './app/(tabs)/account';
import About from './app/(tabs)/account/about';
import Activity from './app/(tabs)/account/activity';
import ApiKeys from './app/(tabs)/account/api-keys';
import SshKeys from './app/(tabs)/account/ssh-keys';
import Home from './app/(tabs)/home';
import Resources from './app/(tabs)/resources';
import Welcome from './app/welcome';
import { AppearanceProvider } from './src/features/appearance/AppearanceProvider';
import { ToastProvider } from './src/features/feedback/ToastProvider';
import { LockProvider } from './src/features/lock/LockProvider';
import { InstanceDetail } from './src/features/products/instances/InstanceDetail';
import { SessionProvider } from './src/features/session/SessionProvider';
import { WorkspaceProvider } from './src/features/workspace/WorkspaceProvider';
import { createQueryClient } from './src/wiring/queryClient';
import { createServices } from './src/wiring/services';
import { ServicesProvider } from './src/wiring/ServicesProvider';

const PHONE = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// An iPad in portrait
const IPAD = {
  frame: { x: 0, y: 0, width: 1024, height: 1366 },
  insets: { top: 24, left: 0, right: 0, bottom: 20 },
};

let metrics = PHONE;
let services = createServices('demo');
let queryClient = createQueryClient();

beforeEach(() => {
  metrics = PHONE;
  services = createServices('demo');
  queryClient = createQueryClient();
  // No clean-up timer keeps Jest running.
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, gcTime: Infinity } });
  onlineManager.setOnline(true);
});

function Providers({ children }: { children: ReactNode }) {
  return (
    <ServicesProvider initial={services}>
      <SessionProvider>
        <AppearanceProvider initial="light">
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider initialMetrics={metrics}>
              <WorkspaceProvider>
                <LockProvider>
                  <ToastProvider>{children}</ToastProvider>
                </LockProvider>
              </WorkspaceProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </AppearanceProvider>
      </SessionProvider>
    </ServicesProvider>
  );
}

// Renders a route's screen on its own (outside the router, so these metrics apply).
const open = async (Route: ComponentType) => {
  await render(<Route />, { wrapper: Providers });
  await act(async () => {});
};

type Element = ReturnType<typeof screen.getByTestId>;

const styleOf = (element: Element) => StyleSheet.flatten(element.props.style) ?? {};

// The element itself, then each parent up to the root.
const selfAndAncestors = (element: Element) => {
  const chain: Element[] = [];

  for (let node: Element | null = element; node !== null; node = node.parent) {
    chain.push(node);
  }

  return chain;
};

const SIDES = [
  'padding',
  'paddingHorizontal',
  'paddingLeft',
  'paddingRight',
  'paddingStart',
  'paddingEnd',
  'margin',
  'marginHorizontal',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginEnd',
] as const;

// Nothing between the screen's edges and this element narrows it.
const expectEdgeToEdge = (element: Element) => {
  for (const node of selfAndAncestors(element)) {
    const style = styleOf(node);
    const sides = Object.fromEntries(SIDES.map((key) => [key, style[key] ?? 0]).filter(([, value]) => value !== 0));

    expect(style.maxWidth).toBeUndefined();
    expect(sides).toEqual({});
  }
};

const hasAncestorStyled = (element: Element, wanted: Record<string, unknown>) =>
  selfAndAncestors(element).some((node) => {
    const style = styleOf(node);

    return Object.entries(wanted).every(([key, value]) => style[key as keyof typeof style] === value);
  });

const centredAt560 = { maxWidth: sizes.contentMaxWidth, alignSelf: 'center' } as const;

describe('on an iPad (1024 wide)', () => {
  test("Welcome's purple reaches both screen edges, and its content is centred at 560", async () => {
    metrics = IPAD;
    await open(Welcome);

    expectEdgeToEdge(screen.getByTestId('header-gradient'));
    expect(screen.getByTestId('header-content')).toHaveStyle(centredAt560);
  });

  test("Home's header reaches both screen edges, and the cards under it line up at 560", async () => {
    metrics = IPAD;
    await open(Home);

    expectEdgeToEdge(screen.getByTestId('header-gradient'));
    expect(screen.getByTestId('header-content')).toHaveStyle(centredAt560);
    expect(hasAncestorStyled(await screen.findByText(/ by product$/), centredAt560)).toBe(true);
  });
});

test('pulling Home down past the top shows purple above the header, not the page', async () => {
  await open(Home);

  // Above the screen's top, so it only shows while the screen is pulled down
  expect(screen.getByTestId('screen-overscroll')).toHaveStyle({ position: 'absolute' });
  expect(screen.getByTestId('screen-overscroll').props.colors).toEqual(lightColors.headerGradient.map((color) => processColor(color)));
  expect(styleOf(screen.getByTestId('screen-overscroll')).top).toBeLessThan(0);
});

// What the ui leaves above a screen's content to clear the status bar and the offline pill
function BelowNoticeReference() {
  return (
    <Screen topInset="belowNotice">
      <Text variant="body">Reference</Text>
    </Screen>
  );
}

// A resource's screen (the demo's web-prod-1)
function WebProd1() {
  return <InstanceDetail locality="fr-par-1" id="demo-web-prod-1" />;
}

// Account, Resources and the screens they open: none has a purple header, so each starts below the pill
test.each([
  ['Account', Account],
  ['Activity', Activity],
  ['About', About],
  ['SSH keys', SshKeys],
  ['API keys', ApiKeys],
  ['Resources', Resources],
  ["A resource's screen", WebProd1],
])('%s starts below the offline pill', async (_name, Route) => {
  services = createServices('real', {
    fetch: async () => {
      throw new Error('Tests have no network');
    },
    store: { load: async () => null, save: async () => {}, clear: async () => {} },
    biometric: { isAvailable: async () => false, authenticate: async () => false },
  });
  await open(function RouteNextToReference() {
    return (
      <>
        <BelowNoticeReference />

        <Route />
      </>
    );
  });

  const [belowNotice, routeTop] = screen.getAllByTestId('screen-content').map((content) => styleOf(content).paddingTop);

  // The room is always there, pill or not, so nothing moves when the pill comes and goes.
  expect(belowNotice).toBeGreaterThan(PHONE.insets.top);
  expect(routeTop).toBe(belowNotice);
});
