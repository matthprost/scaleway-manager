import { Redirect } from 'expo-router';

import { useSession } from '../src/features/session/SessionProvider';

export default function Index() {
  const { status } = useSession();

  if (status === 'loading') {
    return null;
  }

  return <Redirect href={status === 'signed-in' ? '/(tabs)/home' : '/welcome'} />;
}
