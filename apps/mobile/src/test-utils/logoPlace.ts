import { fireEvent, screen } from '@testing-library/react-native';

type Measure = (callback: (x: number, y: number, width: number, height: number) => void) => void;

// Where Welcome's and the lock screen's logo sit on a 390 x 844 phone
export const LOGO_PLACE = { x: 20, y: 91, width: 72, height: 84.7 };

// Jest has no layout (its measureInWindow does nothing): every View "measures" at the logo's place
export function mockLogoPlace() {
  const { View } = jest.requireActual<{ View: { prototype: { measureInWindow: Measure } } }>('react-native');

  return jest
    .spyOn(View.prototype, 'measureInWindow')
    .mockImplementation((callback) => callback(LOGO_PLACE.x, LOGO_PLACE.y, LOGO_PLACE.width, LOGO_PLACE.height));
}

// The screen's logo slot lays out, so it measures its logo and reports the place
export async function layOutLogoSlot() {
  await fireEvent(screen.getByTestId('splash-logo-slot'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: LOGO_PLACE.width, height: LOGO_PLACE.height } },
  });
}
