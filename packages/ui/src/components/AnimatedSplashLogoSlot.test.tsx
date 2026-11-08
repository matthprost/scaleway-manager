import { fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { ThemeProvider } from '../theme';
import { sizes } from '../tokens';
import { AnimatedSplashLogoSlot } from './AnimatedSplashLogoSlot';
import { LogoMark } from './LogoMark';

type Measure = (callback: (x: number, y: number, width: number, height: number) => void) => void;

// Jest has no layout: the slot "measures" Welcome's logo on a 390 x 844 phone
const measureInWindow = jest.spyOn(View.prototype as unknown as { measureInWindow: Measure }, 'measureInWindow');

function slot(hidden: boolean, onPlace = jest.fn()) {
  return (
    <ThemeProvider preference="light">
      <AnimatedSplashLogoSlot hidden={hidden} onPlace={onPlace}>
        <LogoMark size={sizes.logoHero} />
      </AnimatedSplashLogoSlot>
    </ThemeProvider>
  );
}

describe('AnimatedSplashLogoSlot', () => {
  afterEach(() => {
    measureInWindow.mockReset();
  });

  it('says where its logo is on screen once laid out', async () => {
    measureInWindow.mockImplementation((callback) => callback(20, 91, 72, 84.7));
    const onPlace = jest.fn();
    await render(slot(false, onPlace));
    await fireEvent(screen.getByTestId('splash-logo-slot'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 72, height: 84.7 } },
    });

    expect(onPlace).toHaveBeenCalledWith({ x: 20, y: 91, width: 72, height: 84.7 });
  });

  it('says nothing when the measure fails (all zeros): no place is better than a wrong one', async () => {
    measureInWindow.mockImplementation((callback) => callback(0, 0, 0, 0));
    const onPlace = jest.fn();
    await render(slot(false, onPlace));
    await fireEvent(screen.getByTestId('splash-logo-slot'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 72, height: 84.7 } },
    });

    expect(onPlace).not.toHaveBeenCalled();
  });

  it("hugs the logo, so the place is the logo's and not the column's", async () => {
    await render(slot(false));

    expect(screen.getByTestId('splash-logo-slot')).toHaveStyle({ alignSelf: 'flex-start' });
  });

  it("hides its logo while the splash's logo stands in for it, keeping its place", async () => {
    const { rerender } = await render(slot(true));

    expect(screen.getByTestId('splash-logo-slot')).toHaveStyle({ opacity: 0 });
    expect(screen.getByTestId('logo-mark')).toBeOnTheScreen();

    await rerender(slot(false));

    expect(screen.getByTestId('splash-logo-slot')).toHaveStyle({ opacity: 1 });
  });
});
