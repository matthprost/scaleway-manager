import { Gallery } from '@scaleway-manager/ui';
import { Redirect } from 'expo-router';

// The component gallery exists in development builds only.
export default function GalleryScreen() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return <Gallery />;
}
