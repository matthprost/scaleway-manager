import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

const ownerSyntax = [
  {
    selector: "JSXExpressionContainer > LogicalExpression[operator='&&']",
    message: 'Use `cond ? <X /> : null`, not `&&`.',
  },
  {
    selector: "TSQualifiedName[left.name='React']",
    message: "Use `import type { X } from 'react'`.",
  },
];

const colourSyntax = [
  {
    selector:
      'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message: 'Colours live in packages/ui/src/tokens.',
  },
  {
    selector: 'Literal[value=/^(?:rgb|hsl)a?\\(/]',
    message: 'Colours live in packages/ui/src/tokens.',
  },
];

const visualReactNative = [
  'View',
  'Text',
  'Pressable',
  'TouchableOpacity',
  'TouchableHighlight',
  'ScrollView',
  'FlatList',
  'SectionList',
  'Image',
  'ImageBackground',
  'StyleSheet',
  'TextInput',
  'Switch',
  'Modal',
  'SafeAreaView',
  'ActivityIndicator',
  'KeyboardAvoidingView',
  'Button',
];

const useUi = 'Screens are built from @scaleway-manager/ui only.';

const onlyDevice = 'Only adapters/device uses the login receiver.';

const onlyWiring = 'Only apps/mobile/src/wiring imports adapters.';

// Package paths only; each folder adds its own relative paths.
const onlyCore = {
  group: [
    'react',
    'react-native',
    'react-native-*',
    '@react-native-*/*',
    'expo*',
    '@expo/*',
    '@tanstack/*',
    '@scaleway-manager/ui',
    '@scaleway-manager/adapters*',
    '@scaleway-manager/login-receiver',
  ],
  message: 'scaleway and demo adapters import only @scaleway-manager/core.',
};

const deviceNoReact = {
  group: ['react', '@scaleway-manager/ui'],
  message: 'device adapters never import React or the UI.',
};

const noSizes = 'Screens type no sizes: pass a ui token (sizes.logoHero) or use the component default.';

// A number typed directly in a prop: size={72}, height={-1}, in either branch of a condition (nested once too, but not
// in the test itself), either side of ??, inside an object or an `as` cast. A number kept in a const first isn't caught.
const sizeSyntax = [
  'JSXAttribute > JSXExpressionContainer > Literal[value=type(number)]',
  'JSXAttribute > JSXExpressionContainer > UnaryExpression > Literal[value=type(number)]',
  'JSXAttribute > JSXExpressionContainer > ConditionalExpression > Literal[value=type(number)]:not(.test)',
  'JSXAttribute > JSXExpressionContainer > ConditionalExpression > ConditionalExpression:not(.test) > Literal[value=type(number)]:not(.test)',
  'JSXAttribute > JSXExpressionContainer > LogicalExpression > Literal[value=type(number)]',
  'JSXAttribute > JSXExpressionContainer > ObjectExpression > Property > Literal[value=type(number)]',
  'JSXAttribute > JSXExpressionContainer > TSAsExpression > Literal[value=type(number)]',
].map((selector) => ({ selector, message: noSizes }));

// A sheet is its own window, above the lock screen: its `visible` comes only from the lock-aware hook
// useSheetVisible(open), so no screen can write `{ open, lockCovers: false }` and leave a sheet above the lock.
// Only objects being built: reading one (`const { lockCovers } = sheet`) is fine.
const lockSyntax = [
  {
    selector:
      "ObjectExpression > Property[key.name='lockCovers'], ObjectExpression > Property[key.value='lockCovers']",
    message: 'A sheet gets `visible` from useSheetVisible(open), never from an object written here.',
  },
];

// The one file allowed to build a sheet's visibility from the lock state, and its test.
const sheetVisibleHook = 'apps/mobile/src/features/lock/useSheetVisible{,.test}.{ts,tsx}';

export default defineConfig([
  expoConfig,
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.expo/**',
      'apps/mobile/ios/**',
      'apps/mobile/android/**',
    ],
  },
  {
    rules: {
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
      'no-restricted-syntax': ['error', ...ownerSyntax, ...colourSyntax],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    // Plain Node config plugin tests (Jest globals).
    files: ['apps/mobile/plugins/**/*.test.js'],
    languageOptions: { globals: { test: 'readonly', expect: 'readonly' } },
  },
  {
    // Native config can't import the tokens, so it may hold colour literals.
    files: ['packages/ui/src/tokens/**', 'apps/mobile/app.config.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...ownerSyntax],
    },
  },
  {
    files: ['packages/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-native',
                'react-native-*',
                'expo',
                'expo-*',
                '@expo/*',
                '@tanstack/*',
                '@scaleway-manager/*',
              ],
              message: 'core is plain TypeScript: no framework or project imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/adapters/src/scaleway/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            onlyCore,
            { group: ['../device', '../device/*', '../demo', '../demo/*'], message: onlyCore.message },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/adapters/src/demo/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            onlyCore,
            { group: ['../device', '../device/*', '../scaleway', '../scaleway/*'], message: onlyCore.message },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/adapters/src/device/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            deviceNoReact,
            {
              group: [
                '../scaleway',
                '../scaleway/*',
                '../demo',
                '../demo/*',
                '@scaleway-manager/adapters/scaleway',
                '@scaleway-manager/adapters/scaleway/*',
                '@scaleway-manager/adapters/demo',
                '@scaleway-manager/adapters/demo/*',
              ],
              message: 'device adapters never import the scaleway or demo adapters.',
            },
          ],
        },
      ],
    },
  },
  {
    // Tests may use the demo adapters next to the native mocks. Must stay below the block above.
    files: ['packages/adapters/src/device/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [deviceNoReact] }],
    },
  },
  {
    // Our own native module; only adapters/device uses it.
    files: ['packages/login-receiver/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@scaleway-manager/*'],
              message: 'login-receiver imports no project package.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@scaleway-manager/core', '@scaleway-manager/adapters*'],
              message: 'ui knows nothing about Scaleway: no core or adapters.',
            },
            { group: ['@scaleway-manager/login-receiver'], message: onlyDevice },
          ],
        },
      ],
    },
  },
  {
    // The whole app, wiring included, reaches it through adapters/device.
    // Must stay above the next two blocks, which repeat the rule.
    files: ['apps/mobile/app/**', 'apps/mobile/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@scaleway-manager/login-receiver'], message: onlyDevice }] },
      ],
    },
  },
  {
    // Everything in src/ except the wiring. Must stay above the next block, which repeats both rules.
    files: ['apps/mobile/src/**'],
    ignores: ['apps/mobile/src/wiring/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@scaleway-manager/adapters*'], message: onlyWiring },
            { group: ['@scaleway-manager/login-receiver'], message: onlyDevice },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/mobile/app/**', 'apps/mobile/src/features/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react-native', importNames: visualReactNative, message: useUi },
            { name: 'expo-linear-gradient', message: useUi },
            { name: 'expo-blur', message: useUi },
            { name: 'react-native-svg', message: useUi },
            { name: 'lucide-react-native', message: useUi },
          ],
          patterns: [
            { group: ['@scaleway-manager/adapters*'], message: onlyWiring },
            { group: ['@scaleway-manager/login-receiver'], message: onlyDevice },
          ],
        },
      ],
      'react/forbid-component-props': ['error', { forbid: ['style'] }],
    },
  },
  {
    // Sizes live in the ui tokens, and sheets get their visibility from the lock-aware hook. This block
    // replaces the shared syntax rule, so it repeats it.
    files: ['apps/mobile/app/**', 'apps/mobile/src/features/**'],
    rules: {
      'no-restricted-syntax': ['error', ...ownerSyntax, ...colourSyntax, ...sizeSyntax, ...lockSyntax],
    },
  },
  {
    files: [sheetVisibleHook],
    rules: {
      'no-restricted-syntax': ['error', ...ownerSyntax, ...colourSyntax, ...sizeSyntax],
    },
  },
  {
    // One status bar, set by the ui StatusBar in the root layout. A second rule name, so it adds
    // to the import bans above instead of replacing them.
    files: ['apps/mobile/**/*.ts', 'apps/mobile/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-status-bar',
              message: 'Use StatusBar from @scaleway-manager/ui, drawn once in app/_layout.tsx.',
            },
          ],
        },
      ],
    },
  },
]);
