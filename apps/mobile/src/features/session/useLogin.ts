import { loginWithBrowser } from '@scaleway-manager/core';
import { useRouter } from 'expo-router';
import { useCallback, useContext } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { LoginRunContext } from './SessionProvider';

export const LOGIN_ERROR = "Login didn't work. Please try again.";

type LoginResult = 'signed-in' | 'cancelled' | 'failed' | 'busy';

type Login = {
  // fresh (switching organization): Scaleway's page opens without its saved sign-in, so it lists the account's
  // organizations; a failure then shows under the switch row, not on Welcome
  login: (options?: { fresh: boolean }) => Promise<LoginResult>;
  isPending: boolean;
  error: string | null;
};

// Logs in through the phone's browser. One login for the whole app: taps wait while one is open,
// and a failure shows on Welcome. A cancel says nothing.
export function useLogin(): Login {
  const { auth, receiver, browser, keeper } = useServices();
  const router = useRouter();
  const run = useContext(LoginRunContext);

  if (run === null) {
    throw new Error('useLogin must be used inside a SessionProvider');
  }

  const { isPending, error, begin, end } = run;

  const login = useCallback(
    async (options: { fresh: boolean } = { fresh: false }): Promise<LoginResult> => {
      if (!begin()) {
        return 'busy';
      }
      let result: LoginResult = 'failed';
      try {
        result = await loginWithBrowser({ auth, receiver, browser, keeper }, options);
        if (result === 'signed-in') {
          router.replace('/(tabs)/home');
        }
      } catch {
        result = 'failed';
      } finally {
        end(result === 'failed' && !options.fresh ? LOGIN_ERROR : null);
      }

      return result;
    },
    [auth, receiver, browser, keeper, router, begin, end],
  );

  return { login, isPending, error };
}
