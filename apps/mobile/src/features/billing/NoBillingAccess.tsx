import { EmptyState } from '@scaleway-manager/ui';

// The calm message when this organization's billing can't be seen (a 403): it isn't a failure, so nothing to retry.
export function NoBillingAccess() {
  return (
    <EmptyState
      icon="file"
      title="Billing isn't available"
      message="You don't have access to billing in this organization."
    />
  );
}
