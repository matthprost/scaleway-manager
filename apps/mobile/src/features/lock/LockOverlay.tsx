import {
  AnimatedSplashEntrance,
  AnimatedSplashLogoSlot,
  Button,
  HeaderBackground,
  LogoMark,
  Overlay,
  sizes,
  Stack,
  Text,
} from '@scaleway-manager/ui';

import { useSplashHandOver } from '../splash/SplashHandOver';

type LockOverlayProps = {
  visible: boolean;
  onUnlock: () => void;
  // Still deciding: only the purple and the logo, nothing that says "locked".
  deciding?: boolean;
};

// The purple lock screen: it hides the app until Face ID or fingerprint says yes.
export function LockOverlay({ visible, onUnlock, deciding = false }: LockOverlayProps) {
  // At start-up the splash's logo glides into this one, and the rest comes in after it
  const splash = useSplashHandOver('lock');

  return (
    <Overlay visible={visible} dimmed={false} announcement={deciding ? undefined : 'Scaleway Manager is locked'}>
      <HeaderBackground fill insetTop insetBottom>
        <Stack grow justify="between" padding="lg">
          <Stack gap="lg" paddingVertical="xl">
            <AnimatedSplashLogoSlot hidden={splash.logoHidden} onPlace={splash.onLogoPlace}>
              <LogoMark size={sizes.logoHero} />
            </AnimatedSplashLogoSlot>

            {!deciding ? (
              <AnimatedSplashEntrance state={splash.entrance} order="first">
                <Text variant="title" tone="onBrand" accessibilityRole="header">
                  Scaleway Manager is locked
                </Text>
              </AnimatedSplashEntrance>
            ) : null}
          </Stack>

          {!deciding ? (
            <AnimatedSplashEntrance state={splash.entrance} order="second">
              <Button label="Unlock" size="md" variant="onBrand" onPress={onUnlock} />
            </AnimatedSplashEntrance>
          ) : null}
        </Stack>
      </HeaderBackground>
    </Overlay>
  );
}
