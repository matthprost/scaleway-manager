import { healthSummary } from '@scaleway-manager/core';
import { EmptyState, ListRow, Screen, ScreenHeader, Section, Stack } from '@scaleway-manager/ui';
import { useRouter } from 'expo-router';

import { useIsOnline } from '../../../src/features/connectivity/useIsOnline';
import { ActionFailed } from '../../../src/features/errors/ActionFailed';
import { LoadFailed } from '../../../src/features/errors/LoadFailed';
import { PRODUCT_KEYS, PRODUCTS } from '../../../src/features/resources/products';
import { usePullToRefresh } from '../../../src/features/resources/usePullToRefresh';
import { useResourceSummaries } from '../../../src/features/resources/useResourceSummaries';
import { useWorkspace } from '../../../src/features/workspace/useWorkspace';

// Every product the selected project uses, with how its resources are doing.
export default function Resources() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const workspace = useWorkspace();
  const resources = useResourceSummaries();
  const { refreshing, refresh } = usePullToRefresh(resources.refresh);
  // A product shows only when it has something; one that refused (403) has nothing, so it's left out
  const products = PRODUCT_KEYS.map((product) => ({
    product,
    items: resources.summaries.filter((summary) => summary.product === product),
  })).filter(({ items }) => items.length > 0);
  // The projects couldn't be loaded: there's no project to ask about
  const noProject = workspace.project === null && workspace.status === 'error';
  // Products that failed while others loaded say so, by name ("Kubernetes and Jobs"), instead of vanishing
  const failed = resources.failedProducts.map((product) => PRODUCTS[product].title);
  const failedNames = failed.length > 1 ? `${failed.slice(0, -1).join(', ')} and ${failed.at(-1)}` : failed.join('');

  // Offline, no pull to refresh: it would wait for the network with its spinner up (the offline pill says why)
  return (
    <Screen topInset="belowNotice" onRefresh={isOnline ? refresh : undefined} refreshing={refreshing}>
      <Stack>
        <ScreenHeader title="Resources" />

        {products.length > 0 ? (
          <>
            {resources.refreshFailed ? <ActionFailed /> : null}

            {/* A product still coming shows as one placeholder row */}
            <Section title={workspace.project?.name} loading={resources.isLoading ? 'one' : false}>
              {products.map(({ product, items }) => {
                const words = healthSummary(items);

                return (
                  <ListRow
                    key={product}
                    product={product}
                    title={PRODUCTS[product].title}
                    subtitle={words.text}
                    subtitleHealth={words.health ?? undefined}
                    // Heard as "4 resources": a bare number would be unclear
                    trailing={{
                      type: 'chevron',
                      text: String(items.length),
                      spokenText: items.length === 1 ? '1 resource' : `${items.length} resources`,
                    }}
                    onPress={() => router.push({ pathname: '/resources/[product]', params: { product } })}
                  />
                );
              })}
            </Section>

            {!resources.isLoading && failed.length > 0 ? (
              <LoadFailed title={`Couldn't load your ${failedNames}`} onRetry={resources.retry} />
            ) : null}
          </>
        ) : noProject || resources.failed ? (
          <LoadFailed title="Couldn't load your resources" onRetry={resources.retry} />
        ) : resources.isLoading ? (
          <Section loading />
        ) : resources.forbidden ? (
          <EmptyState
            icon="server"
            title="Resources aren't available"
            message="You don't have access to resources in this project."
          />
        ) : (
          <EmptyState
            icon="layers"
            title="No resources in this project"
            message="Resources you create on Scaleway show up here."
          />
        )}
      </Stack>
    </Screen>
  );
}
