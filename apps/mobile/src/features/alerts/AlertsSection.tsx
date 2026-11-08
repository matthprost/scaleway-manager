import { AlertRow, AnimatedSplashEntrance, Stack } from '@scaleway-manager/ui';
import type { SplashEntranceState } from '@scaleway-manager/ui';

import { useFiringAlerts } from './useFiringAlerts';

type AlertsSectionProps = {
  // Rises in after the "by product" card as the splash leaves
  entrance: SplashEntranceState;
};

// One row per firing monitoring alert; nothing at all when none fire (or Cockpit isn't allowed).
export function AlertsSection({ entrance }: AlertsSectionProps) {
  const { alerts } = useFiringAlerts();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <AnimatedSplashEntrance state={entrance} order="second">
      <Stack gap="sm">
        {alerts.map((alert) => (
          <AlertRow key={alert.id} title={alert.name} detail={alert.summary ?? alert.region} />
        ))}
      </Stack>
    </AnimatedSplashEntrance>
  );
}
