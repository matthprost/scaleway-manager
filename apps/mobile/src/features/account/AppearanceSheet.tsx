import type { Preferences } from '@scaleway-manager/core';
import { ListRow, Section, Sheet, Stack } from '@scaleway-manager/ui';
import { useState } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useAppearance, useSetAppearance } from '../appearance/AppearanceProvider';
import { ActionFailed } from '../errors/ActionFailed';
import { useSheetVisible } from '../lock/useSheetVisible';

type Appearance = Preferences['appearance'];

// In the order the sheet lists them
export const APPEARANCE_LABELS: Record<Appearance, string> = {
  system: 'Follow phone',
  light: 'Light',
  dark: 'Dark',
};

type AppearanceSheetProps = {
  // The screen wants it open
  visible: boolean;
  onClose: () => void;
};

// Follow phone, light or dark: saved, then applied to the whole app at once.
export function AppearanceSheet({ visible, onClose }: AppearanceSheetProps) {
  const { preferences } = useServices();
  const appearance = useAppearance();
  const setAppearance = useSetAppearance();
  const sheet = useSheetVisible(visible);
  const [failed, setFailed] = useState(false);

  const close = () => {
    setFailed(false);
    onClose();
  };

  // Not saved: the look stays as it is, and the sheet says so
  const choose = async (choice: Appearance) => {
    setFailed(false);
    try {
      await preferences.update({ appearance: choice });
      setAppearance(choice);
      close();
    } catch {
      setFailed(true);
    }
  };

  return (
    <Sheet visible={sheet} title="Appearance" onClose={close}>
      <Stack gap="xs">
        <Section>
          {(Object.keys(APPEARANCE_LABELS) as Appearance[]).map((choice) => (
            <ListRow
              key={choice}
              title={APPEARANCE_LABELS[choice]}
              trailing={{ type: 'check', selected: choice === appearance }}
              onPress={() => choose(choice)}
            />
          ))}
        </Section>

        {failed ? <ActionFailed /> : null}
      </Stack>
    </Sheet>
  );
}
