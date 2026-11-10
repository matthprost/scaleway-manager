import { HeaderBackground, LogoMark, Overlay, ScreenReaderShield, sizes, Stack } from '@scaleway-manager/ui';

// What the app switcher shows while the lock is on: the purple and the logo, centred on the whole screen like the
// splash's first frame (no safe-area padding); no data, no words.
// Screen readers never reach it.
export function PrivacyCover({ visible }: { visible: boolean }) {
  return (
    <Overlay visible={visible} dimmed={false}>
      <ScreenReaderShield hidden>
        <HeaderBackground fill>
          <Stack grow align="center" justify="center">
            <LogoMark size={sizes.logoSplash} />
          </Stack>
        </HeaderBackground>
      </ScreenReaderShield>
    </Overlay>
  );
}
