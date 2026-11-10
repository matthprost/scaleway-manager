import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../theme';
import { sizes } from '../tokens';
import { LogoMark } from './LogoMark';

describe('LogoMark', () => {
  it('is skipped by screen readers on iOS and Android', async () => {
    await render(
      <ThemeProvider preference="light">
        <LogoMark size={sizes.logoHero} />
      </ThemeProvider>,
    );
    const logo = screen.getByTestId('logo-mark');

    // Decorative: Welcome and the lock screen show the name as text
    expect(logo.props.accessible).toBe(false);
    expect(logo.props.importantForAccessibility).toBe('no');
    expect(logo.props.accessibilityLabel).toBeUndefined();
    expect(screen.queryByLabelText('Scaleway Manager')).toBeNull();
  });

  it('runs onTripleTap after three quick taps, and stays hidden from screen readers', async () => {
    const onTripleTap = jest.fn();
    await render(
      <ThemeProvider preference="light">
        <LogoMark size={sizes.logoHero} onTripleTap={onTripleTap} />
      </ThemeProvider>,
    );
    const logo = screen.getByTestId('logo-mark');

    await fireEvent.press(logo);
    await fireEvent.press(logo);

    expect(onTripleTap).not.toHaveBeenCalled();

    await fireEvent.press(logo);

    expect(onTripleTap).toHaveBeenCalledTimes(1);
    expect(logo.parent?.props.style).toMatchObject({ alignSelf: 'flex-start' });
    expect(logo.props.accessible).toBe(false);
    expect(screen.queryAllByRole('button')).toHaveLength(0);

    // It starts counting again from zero
    await fireEvent.press(logo);
    await fireEvent.press(logo);

    expect(onTripleTap).toHaveBeenCalledTimes(1);
  });

  it('slow taps never add up to three', async () => {
    const onTripleTap = jest.fn();
    const now = jest.spyOn(Date, 'now');
    await render(
      <ThemeProvider preference="light">
        <LogoMark size={sizes.logoHero} onTripleTap={onTripleTap} />
      </ThemeProvider>,
    );
    const logo = screen.getByTestId('logo-mark');

    // 600 ms between taps: more than the half second allowed
    for (const at of [1000, 1600, 2200, 2800]) {
      now.mockReturnValue(at);
      await fireEvent.press(logo);
    }

    expect(onTripleTap).not.toHaveBeenCalled();

    // Half a second apart still counts
    for (const at of [5000, 5500, 6000]) {
      now.mockReturnValue(at);
      await fireEvent.press(logo);
    }

    expect(onTripleTap).toHaveBeenCalledTimes(1);

    now.mockRestore();
  });
});
