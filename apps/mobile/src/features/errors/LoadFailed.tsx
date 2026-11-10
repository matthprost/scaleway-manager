import { EmptyState } from '@scaleway-manager/ui';

import { useIsOnline } from '../connectivity/useIsOnline';

type LoadFailedProps = {
  // "Couldn't load your SSH keys"
  title: string;
  onRetry: () => void;
  // Something above already says "You're offline": once per screen
  offlineSaidAbove?: boolean;
};

// Content that couldn't load: Try again, off while offline with the note under it.
export function LoadFailed({ title, onRetry, offlineSaidAbove = false }: LoadFailedProps) {
  const isOnline = useIsOnline();

  return (
    <EmptyState
      icon="alert"
      title={title}
      action={{
        label: 'Try again',
        onPress: onRetry,
        disabled: !isOnline,
        note: isOnline || offlineSaidAbove ? undefined : "You're offline",
      }}
    />
  );
}
