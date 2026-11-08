import * as ScreenCapture from 'expo-screen-capture';

import { createScreenPrivacy } from './screenPrivacy';

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(async () => {}),
  allowScreenCaptureAsync: jest.fn(async () => {}),
}));

beforeEach(() => {
  jest.mocked(ScreenCapture.preventScreenCaptureAsync).mockClear();
  jest.mocked(ScreenCapture.allowScreenCaptureAsync).mockClear();
});

test('on Android, protecting the screen blocks screenshots and the app switcher snapshot, and allowing lifts it', async () => {
  const privacy = createScreenPrivacy({ platform: 'android' });

  await privacy.protect();

  expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledTimes(1);

  await privacy.allow();

  expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalledTimes(1);
});

test('on iOS it does nothing: the lock feature covers the app itself', async () => {
  const privacy = createScreenPrivacy({ platform: 'ios' });

  await privacy.protect();
  await privacy.allow();

  expect(ScreenCapture.preventScreenCaptureAsync).not.toHaveBeenCalled();
  expect(ScreenCapture.allowScreenCaptureAsync).not.toHaveBeenCalled();
});
