import { setUpTests } from 'react-native-reanimated';

setUpTests();

// Native modules the wiring imports; jest has no native side.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'),
);
jest.mock('@scaleway-manager/login-receiver', () => ({
  start: jest.fn(),
  nextCallback: jest.fn(),
  received: jest.fn(),
  stop: jest.fn(),
}));
