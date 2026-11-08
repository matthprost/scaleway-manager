import { createDemoAccount } from './account';
import { demoConnectivity } from './connectivity';
import { DEMO_USER } from './data';

test('demo account returns the demo user', async () => {
  expect(await createDemoAccount().getCurrentUser()).toEqual(DEMO_USER);
});

test('demo connectivity is always online', async () => {
  expect(await demoConnectivity.isOnline()).toBe(true);
});
