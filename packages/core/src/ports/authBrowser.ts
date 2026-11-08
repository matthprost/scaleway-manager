export type AuthBrowserPort = {
  // fresh: without the browser's saved sign-in, so another account or organization can sign in
  open(url: string, returnUrl: string, options: { fresh: boolean }): Promise<'returned' | 'cancelled'>;
  close(): Promise<void>;
};
