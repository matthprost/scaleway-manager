import { FloatingNotice, FloatingTabBar, Pill } from '@scaleway-manager/ui';
import { Tabs } from 'expo-router';

import { OfflineIndicator } from '../../src/features/connectivity/OfflineIndicator';
import { useOfflineNotice } from '../../src/features/connectivity/useOfflineNotice';
import { useSession } from '../../src/features/session/SessionProvider';
import { useHomeHandOver } from '../../src/features/splash/SplashHandOver';
import { screenshotBuild } from '../../src/wiring/buildConfig';
import { useServices } from '../../src/wiring/ServicesProvider';

const TABS = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'resources', icon: 'layers', label: 'Resources' },
  { key: 'billing', icon: 'chart', label: 'Billing' },
  { key: 'account', icon: 'user', label: 'Account' },
] as const;

export default function TabsLayout() {
  const { status, switches } = useSession();
  const { mode } = useServices();
  const notice = useOfflineNotice();
  // At start-up it slides in with Home's cards as the splash leaves
  const { entrance } = useHomeHandOver();
  // Screenshot builds hide it
  const demoBadge = mode === 'demo' && !screenshotBuild;

  // Signed out: nothing to show; the root layout goes back to Welcome.
  if (status === 'signed-out') {
    return null;
  }

  return (
    <>
      <Tabs
        // A login that replaced another session (switching organization) gets fresh tabs: a tab opened before would
        // keep showing the old organization's data
        key={switches}
        // Plain views, not native screens: a native tab screen sets iOS's "automatic" edge effect on its page,
        // which iOS 27 draws as a dark band under the status bar (NoEdgeEffects turns it off on every page)
        detachInactiveScreens={false}
        screenOptions={{ headerShown: false }}
        tabBar={({ state, navigateToTab }) => (
          <FloatingTabBar
            items={TABS}
            entrance={entrance}
            activeKey={state.routes[state.index]?.name ?? TABS[0].key}
            onSelect={(key) => {
              const route = state.routes.find((item) => item.name === key);

              if (route !== undefined) {
                navigateToTab(route.key);
              }
            }}
          />
        )}
      >
        {TABS.map((tab) => (
          <Tabs.Screen key={tab.key} name={tab.key} />
        ))}
      </Tabs>

      {/* Demo mode never shows the offline pill: its badge takes the place, and is said once */}
      <FloatingNotice announcement={demoBadge ? 'Demo mode' : notice?.label}>
        {demoBadge ? <Pill tone="inverse" label="Demo" /> : <OfflineIndicator />}
      </FloatingNotice>
    </>
  );
}
