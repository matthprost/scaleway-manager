import { Stack } from 'expo-router';

import { useStackOptions } from '../../../src/features/navigation/useStackOptions';

// A screen opened from a link still has Account under it, so Back always lands there
export const unstable_settings = { anchor: 'index' };

// Account and the screens it opens, inside the Account tab.
export default function AccountLayout() {
  return <Stack screenOptions={useStackOptions()} />;
}
