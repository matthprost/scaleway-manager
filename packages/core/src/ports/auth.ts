import type { Session } from '../domain/session';

// renew throws AppError('unauthorized') when refused, AppError('offline') on network failure.
export type AuthPort = {
  loginUrl(callbackUrl: string): string;
  sessionFromCallback(callbackUrl: string): Session;
  renew(session: Session): Promise<Session>;
  revoke(session: Session): Promise<void>;
};
