import {
  AnimatedSplashEntrance,
  AnimatedSplashLogoSlot,
  Button,
  LogoMark,
  sizes,
  Stack,
  Text,
} from '@scaleway-manager/ui';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { useIsOnline } from '../connectivity/useIsOnline';
import { ACTION_FAILED } from '../errors/ActionFailed';
import { useSplashHandOver } from '../splash/SplashHandOver';
import { useSwitchMode } from '../../wiring/ServicesProvider';
import { useLogin } from './useLogin';

// The inside of the Welcome header: logo, copy and the buttons.
export function WelcomeContent() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const switchMode = useSwitchMode();
  const { login, isPending, error } = useLogin();
  // At start-up the splash's logo glides into this one, and the rest comes in after it
  const splash = useSplashHandOver('welcome');
  const [demoFailed, setDemoFailed] = useState(false);
  // The newest problem: a failed demo start or a failed login
  const problem = demoFailed ? ACTION_FAILED : error;

  const starting = useRef(false);

  // Android reads the live region itself, so only iOS is told.
  useEffect(() => {
    if (problem !== null && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(problem);
    }
  }, [problem]);

  const logIn = () => {
    setDemoFailed(false);
    void login();
  };

  const tryDemo = async () => {
    if (starting.current || isPending) {
      return;
    }
    starting.current = true;
    setDemoFailed(false);
    try {
      await switchMode('demo');
      router.replace('/(tabs)/home');
    } catch {
      setDemoFailed(true);
    } finally {
      starting.current = false;
    }
  };

  return (
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
          {problem !== null ? (
            <Text variant="subhead" tone="onBrand" accessibilityLiveRegion="polite">
              {problem}
            </Text>
          ) : null}

          <Button
            label="Log in with Scaleway"
            size="md"
            variant="onBrand"
            disabled={!isOnline}
            loading={isPending}
            onPress={logIn}
          />

          {!isOnline ? (
            <Text variant="subhead" tone="onBrand">
              {"You're offline. Connect to the internet to log in."}
            </Text>
          ) : null}

          <Button label="Try the demo" size="md" variant="ghostOnBrand" disabled={isPending} onPress={tryDemo} />
        </Stack>
      </AnimatedSplashEntrance>
    </Stack>
  );
}
