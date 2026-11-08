export type BiometricPort = {
  isAvailable(): Promise<boolean>;
  authenticate(reason: string): Promise<boolean>;
};
