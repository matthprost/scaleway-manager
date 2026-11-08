import type { Preferences } from '../domain/preferences';

export type PreferencesPort = {
  read(): Promise<Preferences>;
  update(patch: Partial<Preferences>): Promise<Preferences>;
};
