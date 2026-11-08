import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { ScreenReaderShield } from './ScreenReaderShield';

const wrap = (hidden: boolean) => (
  <ScreenReaderShield hidden={hidden}>
    <View testID="inside" />
  </ScreenReaderShield>
);

describe('ScreenReaderShield', () => {
  it('hides what is inside from screen readers while hidden', async () => {
    await render(wrap(true));
    const shield = screen.getByTestId('screen-reader-shield', { includeHiddenElements: true });

    expect(shield?.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(shield?.props.accessibilityElementsHidden).toBe(true);
  });

  it('leaves everything reachable when not hidden', async () => {
    await render(wrap(false));
    const shield = screen.getByTestId('screen-reader-shield', { includeHiddenElements: true });

    expect(shield?.props.importantForAccessibility).toBe('auto');
    expect(shield?.props.accessibilityElementsHidden).toBe(false);
  });

  it('keeps filling the screen', async () => {
    await render(wrap(false));

    expect(screen.getByTestId('screen-reader-shield')).toHaveStyle({ flexGrow: 1 });
  });
});
