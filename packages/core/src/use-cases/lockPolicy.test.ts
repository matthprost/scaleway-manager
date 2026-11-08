import { LOCK_TIMEOUT_MS, shouldLockOnLaunch, shouldLockOnResume } from './lockPolicy';

describe('shouldLockOnLaunch', () => {
  it.each([
    ['on', true, true, true],
    ['off', true, true, false],
    ['on', false, true, false],
    ['on', true, false, false],
  ] as const)('(%s, session %s, available %s) -> %s', (biometricLock, hasSession, biometricAvailable, expected) => {
    expect(shouldLockOnLaunch({ biometricLock, hasSession, biometricAvailable })).toBe(expected);
  });
});

describe('shouldLockOnResume', () => {
  const now = new Date('2026-11-05T10:00:00.000Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it('does not lock at 4 min 59 s', () => {
    expect(shouldLockOnResume({ biometricLock: 'on', backgroundedAt: ago(LOCK_TIMEOUT_MS - 1000), now })).toBe(false);
  });

  it('locks at exactly 5 min', () => {
    expect(shouldLockOnResume({ biometricLock: 'on', backgroundedAt: ago(LOCK_TIMEOUT_MS), now })).toBe(true);
  });

  it('locks when backgroundedAt is in the future', () => {
    expect(shouldLockOnResume({ biometricLock: 'on', backgroundedAt: ago(-1000), now })).toBe(true);
  });

  it('does not lock when biometricLock is off', () => {
    expect(shouldLockOnResume({ biometricLock: 'off', backgroundedAt: ago(LOCK_TIMEOUT_MS * 2), now })).toBe(false);
  });

  it('does not lock when backgroundedAt is null', () => {
    expect(shouldLockOnResume({ biometricLock: 'on', backgroundedAt: null, now })).toBe(false);
  });
});
