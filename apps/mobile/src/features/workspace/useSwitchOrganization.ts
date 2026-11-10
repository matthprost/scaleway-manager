import { useState } from 'react';

import { useLogin } from '../session/useLogin';

type SwitchOrganization = {
  // Scaleway's page is open
  busy: boolean;
  // The login failed: the quiet line shows under the row
  failed: boolean;
  // Opens Scaleway's page without its saved sign-in, so it lists the account's organizations to pick from. The
  // current organization stays until the new login works: a cancel changes nothing. onSwitched runs once it did.
  start: (onSwitched?: () => void) => Promise<void>;
  // Forgets a failure
  reset: () => void;
};

// "Switch organization": one login per organization (Scaleway gives the app no list of them), picked on Scaleway's page.
export function useSwitchOrganization(): SwitchOrganization {
  const { login, isPending } = useLogin();
  const [failed, setFailed] = useState(false);

  const start = async (onSwitched?: () => void) => {
    setFailed(false);
    const result = await login({ fresh: true });

    if (result === 'failed') {
      setFailed(true);
    } else if (result === 'signed-in') {
      onSwitched?.();
    }
  };

  return { busy: isPending, failed, start, reset: () => setFailed(false) };
}
