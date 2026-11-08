import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useSession } from './SessionProvider';

// Where being signed out is fine: Welcome, the start route (it picks a screen itself) and the dev gallery
const OPEN_TO_ALL = ['/welcome', '/', '/gallery'];

// Signed out (Log out, or Scaleway refused the session) on any screen, pushed ones included: back to Welcome, once.
// The root layout runs it once, for the whole app.
export function useSignedOutRedirect() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  // On its way: the tabs, emptied by the sign-out, report their first tab meanwhile, which mustn't send it again
  const sent = useRef(false);

  useEffect(() => {
    if (status !== 'signed-out' || OPEN_TO_ALL.includes(pathname)) {
      sent.current = false;

      return;
    }
    if (!sent.current) {
      sent.current = true;
      router.replace('/welcome');
    }
  }, [status, pathname, router]);
}
