import { Platform } from 'react-native';

// iOS says Face ID, Android says fingerprint.
export const getLockCopy = () => {
  const ios = Platform.OS === 'ios';

  return {
    promptTitle: ios ? 'Use Face ID to unlock?' : 'Use your fingerprint to unlock?',
    rowTitle: ios ? 'Unlock with Face ID' : 'Unlock with fingerprint',
    enableReason: ios ? 'Turn on Face ID unlock' : 'Turn on fingerprint unlock',
  };
};
