export type Preferences = {
  biometricLock: 'unasked' | 'on' | 'off';
  appearance: 'system' | 'light' | 'dark';
  mode: 'real' | 'demo';
  // Saved project, per organization.
  projectIdByOrg: Record<string, string>;
};

export const DEFAULT_PREFERENCES: Preferences = {
  biometricLock: 'unasked',
  appearance: 'system',
  mode: 'real',
  projectIdByOrg: {},
};
