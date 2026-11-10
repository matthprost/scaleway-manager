import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as ui from '../index';
import { darkColors, lightColors } from '../tokens';
import { Gallery } from './Gallery';
import { GALLERY_SECTIONS } from './sections';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('Gallery', () => {
  it('every exported component has a gallery section', () => {
    const components = Object.keys(ui).filter(
      (key) => /^[A-Z][a-z]/.test(key) && key !== 'ThemeProvider' && key !== 'Gallery',
    );

    expect(GALLERY_SECTIONS.map((section) => section.name).sort()).toEqual(components.sort());
  });

  it('gallery renders in light and dark', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Gallery />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Component gallery')).toHaveStyle({ color: lightColors.text });

    await fireEvent(screen.getByRole('switch', { name: 'Dark mode' }), 'valueChange', true);

    expect(screen.getByRole('switch', { name: 'Dark mode' }).props.value).toBe(true);
    expect(screen.getByText('Component gallery')).toHaveStyle({ color: darkColors.text });
    expect(screen.getByText('Button')).toBeOnTheScreen();
  });
});
