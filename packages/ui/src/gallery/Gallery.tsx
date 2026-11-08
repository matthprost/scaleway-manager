import { useState } from 'react';

import { ListRow } from '../components/ListRow';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { Stack } from '../components/Stack';
import { Text } from '../components/Text';
import { ThemeProvider } from '../theme';
import { GALLERY_SECTIONS } from './sections';

// Every building block on one page, in light or dark. Development builds only.
export function Gallery() {
  const [dark, setDark] = useState(false);

  // Each section is a padded content column itself, so a Carousel or a SectionHeader in it
  // can be a direct child of the column, as screens use them (bible, Touch targets)
  return (
    <ThemeProvider preference={dark ? 'dark' : 'light'}>
      <Screen withTabBar={false} padded={false}>
        <Stack gap="xxl" paddingVertical="md">
          <Stack gap="xxl" paddingHorizontal="md" contained>
            <Text variant="title" accessibilityRole="header">
              Component gallery
            </Text>

            <Section>
              <ListRow
                title="Dark mode"
                trailing={{ type: 'switch', value: dark, onValueChange: setDark }}
              />
            </Section>
          </Stack>

          {GALLERY_SECTIONS.map(({ name, render: Demo }) => (
            <Stack key={name} gap="sm" paddingHorizontal="md" contained>
              <Text variant="title" accessibilityRole="header">
                {name}
              </Text>

              <Demo />
            </Stack>
          ))}
        </Stack>
      </Screen>
    </ThemeProvider>
  );
}
