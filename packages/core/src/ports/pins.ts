export type PinsPort = {
  list(projectId: string): Promise<string[]>;
  toggle(projectId: string, key: string): Promise<string[]>;
  // Takes one pin off (a resource that no longer exists); nothing changes if it isn't pinned.
  remove(projectId: string, key: string): Promise<string[]>;
  // Removes every project's pins.
  clear(): Promise<void>;
};
