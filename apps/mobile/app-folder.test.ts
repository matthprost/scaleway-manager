/// <reference types="node" />

import { readdirSync } from 'fs';
import { join } from 'path';

// Expo Router treats every file in app/ as a route, so tests there break the app bundle.
test('app/ has no test files', () => {
  const files = readdirSync(join(__dirname, 'app'), { recursive: true, encoding: 'utf8' });

  expect(files.filter((file) => /\.(test|spec)\./.test(file))).toEqual([]);
});
