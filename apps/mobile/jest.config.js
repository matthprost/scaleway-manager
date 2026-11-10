module.exports = {
  preset: 'jest-expo',
  resolver: 'react-native-reanimated/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // lucide's React Native entry is untranspiled ESM, so tests use its CommonJS build.
  moduleNameMapper: {
    '^lucide-react-native$': require.resolve('lucide-react-native'),
  },
};
