import { HeaderBackground, Screen } from '@scaleway-manager/ui';

import { WelcomeContent } from '../src/features/session/WelcomeContent';

export default function Welcome() {
  return (
    <Screen topInset="none" bottomInset="none" padded={false} withTabBar={false} scroll={false}>
      <HeaderBackground fill insetTop insetBottom dots>
        <WelcomeContent />
      </HeaderBackground>
    </Screen>
  );
}
