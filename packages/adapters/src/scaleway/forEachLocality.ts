import { AppError } from '@scaleway-manager/core';

// Scaleway refused it (403) or doesn't know it here (404): not this user's to see, never a failure to report.
export const isRefusal = (error: unknown) =>
  error instanceof AppError && (error.kind === 'forbidden' || error.kind === 'not_found');

// Loads every zone or region at once and joins the lists. A locality that fails is left out, unless all of them
// failed: then the first error that isn't a refusal is thrown, or `forbidden` when every one refused (403/404).
export const forEachLocality = async <T>(
  localities: readonly string[],
  load: (locality: string) => Promise<T[]>,
): Promise<T[]> => {
  const results = await Promise.allSettled(localities.map((locality) => load(locality)));
  const failures: unknown[] = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));

  if (failures.length > 0 && failures.length === results.length) {
    const other = failures.find((error) => !isRefusal(error));
    throw other ?? new AppError('forbidden', 'Not available in any zone or region');
  }

  return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
};
