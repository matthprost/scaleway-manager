import type { LoginReceiverPort } from '@scaleway-manager/core';
import * as LoginReceiver from '@scaleway-manager/login-receiver';

// Scaleway only accepts `localhost` redirects; the native side listens on 127.0.0.1 and ::1.
export const createLoginReceiver = (): LoginReceiverPort => ({
  async start() {
    const { port } = await LoginReceiver.start();
    const origin = `http://localhost:${port}`;

    return {
      callbackUrl: `${origin}/callback`,
      nextCallback: () => LoginReceiver.nextCallback().then((target) => origin + target),
      received: () => {
        const target = LoginReceiver.received();

        return target ? origin + target : null;
      },
      stop: () => LoginReceiver.stop(),
    };
  },
});
