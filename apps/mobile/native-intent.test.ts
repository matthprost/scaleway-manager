import { LOGIN_RETURN_URL } from '@scaleway-manager/core';

import { redirectSystemPath } from './app/+native-intent';

test('auth/done is not navigated to', () => {
  expect(redirectSystemPath({ path: LOGIN_RETURN_URL })).toBeNull();
  expect(redirectSystemPath({ path: `${LOGIN_RETURN_URL}?from=reply-page` })).toBeNull();
});

test('other links pass through unchanged', () => {
  expect(redirectSystemPath({ path: 'scalewaymanager://billing' })).toBe('scalewaymanager://billing');
  expect(redirectSystemPath({ path: 'scalewaymanager://auth/done-later' })).toBe(
    'scalewaymanager://auth/done-later',
  );
  expect(redirectSystemPath({ path: '/' })).toBe('/');
});
