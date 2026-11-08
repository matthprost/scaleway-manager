export type AppErrorKind = 'offline' | 'unauthorized' | 'forbidden' | 'not_found' | 'server' | 'unknown';

export class AppError extends Error {
  constructor(
    readonly kind: AppErrorKind,
    message: string,
    readonly status?: number,
    // The service's own words for why it refused, when it gave some: fit to show (a message may be ours)
    readonly reason?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
