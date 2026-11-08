import { AnimatedSplashEntrance, NoticeCard, Skeleton, Stack, StatusLine } from '@scaleway-manager/ui';
import type { SplashEntranceState } from '@scaleway-manager/ui';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { ActionFailed } from '../errors/ActionFailed';
import { useServiceStatus } from './useServiceStatus';

// How serious an incident is, in words first: the dot's colour can't say it alone
const SEVERITY: Record<string, { words: string; tone: 'warning' | 'danger' }> = {
  critical: { words: 'Major outage', tone: 'danger' },
  major: { words: 'Partial outage', tone: 'danger' },
};
const MINOR = { words: 'Minor issue', tone: 'warning' } as const;

type StatusSectionProps = {
  // Rises in after the alerts as the splash leaves
  entrance: SplashEntranceState;
};

// Scaleway status for the chosen project: one card per incident affecting it, or one calm line.
// Nothing when the status page can't be reached, or when a product is missing and nothing matched.
export function StatusSection({ entrance }: StatusSectionProps) {
  const { incidents, isLoading, unavailable } = useServiceStatus();
  // An incident's page that couldn't open: its quiet line shows under the cards
  const [failed, setFailed] = useState(false);

  if (unavailable) {
    return null;
  }

  return (
    <AnimatedSplashEntrance state={entrance} order="third">
      {isLoading ? (
        <Skeleton width="100%" variant="subhead" />
      ) : incidents.length === 0 ? (
        <StatusLine label="All Scaleway services running normally" />
      ) : (
        <Stack gap="sm">
          {incidents.map((incident) => {
            const severity = SEVERITY[incident.impact] ?? MINOR;
            // "investigating" → "Investigating"
            const state = `${incident.status.charAt(0).toUpperCase()}${incident.status.slice(1).replaceAll('_', ' ')}`;

            return (
              <NoticeCard
                key={incident.id}
                title={incident.name}
                message={incident.latestUpdate ?? undefined}
                meta={[severity.words, state, incident.components.join(', ')]
                  .filter((part) => part !== '')
                  .join(' · ')}
                tone={severity.tone}
                onPress={() => {
                  setFailed(false);
                  void WebBrowser.openBrowserAsync(incident.url).catch(() => setFailed(true));
                }}
              />
            );
          })}

          {failed ? <ActionFailed /> : null}
        </Stack>
      )}
    </AnimatedSplashEntrance>
  );
}
