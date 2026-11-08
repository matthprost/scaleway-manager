import { LOGIN_RETURN_URL } from '@scaleway-manager/core';

// Scaleway's login reply page sends the browser back here. loginWithBrowser
// already handles the result, so stay on the current screen (null = no navigation).
export function redirectSystemPath({ path }: { path: string }) {
  const isLoginReturn = path === LOGIN_RETURN_URL || path.startsWith(`${LOGIN_RETURN_URL}?`);

  return isLoginReturn ? null : path;
}
