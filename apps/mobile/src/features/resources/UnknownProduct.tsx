import { EmptyState, Screen, ScreenHeader, Stack } from '@scaleway-manager/ui';
import { useRouter } from 'expo-router';

// A link to a product the app doesn't know (an old or mistyped one): a calm message, never a crash.
export function UnknownProduct() {
  const router = useRouter();

  return (
    <Screen topInset="belowNotice">
      <Stack>
        <ScreenHeader title="Resources" onBack={router.back} />

        <EmptyState
          icon="info"
          title="This resource no longer exists"
          action={{ label: 'Go back', onPress: router.back }}
        />
      </Stack>
    </Screen>
  );
}
