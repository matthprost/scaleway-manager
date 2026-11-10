import { Stack } from 'expo-router';

import { useStackOptions } from '../../../src/features/navigation/useStackOptions';

// A resource opened from Home (or a link) still has the Resources tab's first screen under it, so Back lands there
export const unstable_settings = { anchor: 'index' };

// The Resources tab and the screens it opens: a product's list, then a resource.
export default function ResourcesLayout() {
  return <Stack screenOptions={useStackOptions()} />;
}
