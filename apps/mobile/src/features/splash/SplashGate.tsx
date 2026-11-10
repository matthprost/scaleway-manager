import { monthKeyOf } from '@scaleway-manager/core';
import type { User } from '@scaleway-manager/core';
import { AnimatedSplash, ScreenReaderShield, useHomeHeaderLayout, useTheme } from '@scaleway-manager/ui';
import type { WindowRect } from '@scaleway-manager/ui';
import { skipToken, useQuery } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useLockState } from '../lock/LockProvider';
import { useSession } from '../session/SessionProvider';
import { SplashHandOverContext } from './SplashHandOver';
import type { HandOverScreen, SplashHandOver } from './SplashHandOver';

// The hand-over starts once the name is written, and once the app is ready, but never later than the max
export const SPLASH_MIN_MS = 1350;
export const SPLASH_MIN_REDUCED_MS = 800;
export const SPLASH_MAX_MS = 2500;

type SplashGateProps = {
  children: ReactNode;
  // Called once the splash is gone (the root layout's status bar follows it)
  onFinished: () => void;
};

// Our animated splash covers the app, then hands over to Home, Welcome or the lock screen.
export function SplashGate({ children, onFinished }: SplashGateProps) {
  const { status } = useSession();
  const { locked, decided } = useLockState();
  const { reduceMotion } = useTheme();
  const { clock } = useServices();
  // Home's header, where the purple lands: as tall as it really is once Home has laid it out, else as planned
  const { height: planned } = useHomeHeaderLayout();
  const [measured, setMeasured] = useState<number | null>(null);
  // Only watches the cache: Home fetches the account, the workspace and the spending itself.
  const account = useQuery<User>({ queryKey: ['account', 'me'], queryFn: skipToken });
  const organizationId = account.data?.organizationId;
  const watching = organizationId !== undefined;
  const spending = useQuery({
    queryKey: ['spending', organizationId, monthKeyOf(clock.now())],
    queryFn: skipToken,
    enabled: watching,
  });
  const organization = useQuery({ queryKey: ['workspace', 'org', organizationId], queryFn: skipToken, enabled: watching });
  const projects = useQuery({ queryKey: ['workspace', 'projects', organizationId], queryFn: skipToken, enabled: watching });
  // Home's header has loaded (or failed): this month's spending and the workspace, or the account failed
  const homeSettled =
    account.isError || (watching && [spending, organization, projects].every((query) => query.status !== 'pending'));
  const [finished, setFinished] = useState(false);
  const [minPassed, setMinPassed] = useState(false);
  const [maxPassed, setMaxPassed] = useState(false);
  const [logos, setLogos] = useState<Partial<Record<HandOverScreen, WindowRect>>>({});
  // Fixed when the hand-over starts: it never goes back to waiting (Face ID unlocking mid-way, say)
  const [started, setStarted] = useState<{ glides: boolean } | null>(null);

  const home = status === 'signed-in' && decided && !locked;
  const landsOn: HandOverScreen = locked || !decided ? 'lock' : 'welcome';
  // With Reduce Motion the splash just fades: no logo glides
  const logoTarget = home || reduceMotion ? undefined : logos[landsOn];
  const ready = status !== 'loading' && decided && (home ? homeSettled : reduceMotion || logoTarget !== undefined);
  const leaving = started !== null || maxPassed || (ready && minPassed);

  if (leaving && started === null) {
    setStarted({ glides: logoTarget !== undefined });
  }

  useEffect(() => {
    const timer = setTimeout(() => setMinPassed(true), reduceMotion ? SPLASH_MIN_REDUCED_MS : SPLASH_MIN_MS);

    return () => clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    const timer = setTimeout(() => setMaxPassed(true), SPLASH_MAX_MS);

    return () => clearTimeout(timer);
  }, []);

  // The overlay is mounted by now, so the native splash can go.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  const reportLogo = useCallback((screen: HandOverScreen, place: WindowRect) => {
    setLogos((current) => ({ ...current, [screen]: place }));
  }, []);

  const handOver = useMemo<SplashHandOver>(
    () => ({
      entrance: finished || reduceMotion ? 'shown' : leaving ? 'enter' : 'hidden',
      // Hidden while the splash's logo glides into it; without a place to glide to, it stays under the fading purple
      logoHidden: !finished && !reduceMotion && (started === null || started.glides),
      reportLogo,
      reportHeaderHeight: setMeasured,
    }),
    [finished, reduceMotion, leaving, started, reportLogo],
  );

  return (
    <SplashHandOverContext.Provider value={handOver}>
      <ScreenReaderShield hidden={!finished}>{children}</ScreenReaderShield>

      {!finished ? (
        <AnimatedSplash
          phase={leaving ? 'leaving' : 'waiting'}
          target={home ? 'header' : 'screen'}
          headerHeight={measured ?? planned}
          logoTarget={logoTarget}
          onFinished={() => {
            setFinished(true);
            onFinished();
          }}
        />
      ) : null}
    </SplashHandOverContext.Provider>
  );
}
