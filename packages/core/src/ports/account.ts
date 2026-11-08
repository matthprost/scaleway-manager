import type { User } from '../domain/user';

export type AccountPort = {
  getCurrentUser(): Promise<User>;
};
