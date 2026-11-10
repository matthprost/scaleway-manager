import type { AppError, Invoice } from '@scaleway-manager/core';
import { skipToken, useQuery } from '@tanstack/react-query';

import { useServices } from '../../wiring/ServicesProvider';
import { queryFailure } from '../errors/queryFailure';
import { useWorkspace } from '../workspace/useWorkspace';

export type Invoices = {
  // Newest first; undefined until they're on the phone
  list: Invoice[] | undefined;
  // Only while there's nothing to show: saved invoices stay on screen when a refresh fails
  error: AppError | null;
  // Loads again what failed
  retry: () => void;
};

// The organization's invoices (like its spending, they aren't per project).
export function useInvoices(): Invoices {
  const { invoices } = useServices();
  const workspace = useWorkspace();
  const organizationId = workspace.user?.organizationId;
  const query = useQuery({
    queryKey: ['invoices', organizationId],
    queryFn: organizationId === undefined ? skipToken : () => invoices.list(organizationId),
  });

  return {
    list: query.data,
    error: queryFailure(workspace, query.data === undefined ? query.error : null),
    retry: () => {
      workspace.retry();
      if (query.isError) {
        void query.refetch();
      }
    },
  };
}
