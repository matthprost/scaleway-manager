import { availableServerlessActions, formatDay, formatTime } from '@scaleway-manager/core';
import type { ResourceSummary, ServerlessAction, ServerlessApp } from '@scaleway-manager/core';
import { ActionGrid, AlertRow, DetailHero, ListRow, Section, Stack } from '@scaleway-manager/ui';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { useServices } from '../../../wiring/ServicesProvider';
import { ActionFailed } from '../../errors/ActionFailed';
import { DetailScreen } from '../../resources/DetailScreen';
import { statusReason } from '../../resources/statusReason';
import { useResourceAction } from '../../resources/useResourceAction';

type Product = 'containers' | 'functions';

type ServerlessDetailProps = {
  product: Product;
  locality: string;
  id: string;
};

// A serverless container's or function's screen: its status, its last deployment's error, where it answers, and
// Redeploy.
export function ServerlessDetail({ product, locality, id }: ServerlessDetailProps) {
  return (
    <DetailScreen product={product} locality={locality} id={id}>
      {({ item, summary, pinned }) => <ServerlessBody product={product} app={item} summary={summary} pinned={pinned} />}
    </DetailScreen>
  );
}

type ServerlessBodyProps = {
  product: Product;
  app: ServerlessApp;
  summary: ResourceSummary;
  pinned: boolean;
};

function ServerlessBody({ product, app, summary, pinned }: ServerlessBodyProps) {
  const services = useServices();
  const action = useResourceAction<ServerlessAction>();
  const [browserFailed, setBrowserFailed] = useState(false);
  const url = app.domainName === null ? null : `https://${app.domainName}`;
  const updated = new Date(app.updatedAt);
  // Not while it's already deploying, updating or locked: Redeploy stays, turned off, and the grid says why
  const offered = availableServerlessActions(app);

  return (
    <>
      <DetailHero
        product={product}
        subtitle={`${summary.kindLabel} · ${app.region}`}
        statusLabel={summary.statusLabel}
        health={summary.health}
        pinned={pinned}
      />

      {app.errorMessage === null ? null : <AlertRow title="Last deployment failed" detail={app.errorMessage} />}

      <Stack gap="xs">
        <Section title="Details">
          {url === null ? null : (
            <ListRow
              title="URL"
              trailing={{ type: 'text', text: url, onCopy: (text, options) => services.clipboard.copy(text, options) }}
            />
          )}

          {url === null ? null : (
            <ListRow
              title="Open in browser"
              trailing={{ type: 'external' }}
              onPress={() => {
                setBrowserFailed(false);
                void WebBrowser.openBrowserAsync(url).catch(() => setBrowserFailed(true));
              }}
            />
          )}

          <ListRow
            title={app.kind === 'container' ? 'Image' : 'Runtime'}
            trailing={{ type: 'text', text: app.runtimeOrImage }}
          />

          <ListRow
            title="Updated"
            trailing={{ type: 'text', text: `${formatDay(updated)} · ${formatTime(updated)}` }}
          />
        </Section>

        {browserFailed ? <ActionFailed /> : null}
      </Stack>

      <Stack gap="xs">
        <ActionGrid
          actions={[{ key: 'redeploy', label: 'Redeploy', icon: 'redeploy', disabled: !offered.includes('redeploy') }]}
          onPress={(key) =>
            action.run({
              key,
              confirm: {
                title: `Redeploy ${app.name}?`,
                message: 'Scaleway rebuilds and restarts it. It may be unavailable for a few seconds.',
                confirmLabel: 'Redeploy',
              },
              toast: 'Redeploy requested',
              perform: () => services.serverless.redeploy(app.region, app.kind, app.id),
            })
          }
          busyKey={action.running}
          disabledReason={action.disabledReason ?? statusReason(offered, summary.health, app.kind)}
        />

        {action.failure === null ? null : <ActionFailed message={action.failure.message} />}
      </Stack>

      {action.sheet}
    </>
  );
}
