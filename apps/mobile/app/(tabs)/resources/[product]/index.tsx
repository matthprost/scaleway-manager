import type { ProductKey } from '@scaleway-manager/core';
import { EmptyState, ListRow, Screen, ScreenHeader, Section, Stack } from '@scaleway-manager/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useIsOnline } from '../../../../src/features/connectivity/useIsOnline';
import { ActionFailed } from '../../../../src/features/errors/ActionFailed';
import { LoadFailed } from '../../../../src/features/errors/LoadFailed';
import { isProduct, PRODUCTS } from '../../../../src/features/resources/products';
import { UnknownProduct } from '../../../../src/features/resources/UnknownProduct';
import { useProductList } from '../../../../src/features/resources/useProductList';
import { usePullToRefresh } from '../../../../src/features/resources/usePullToRefresh';
import { useWorkspace } from '../../../../src/features/workspace/useWorkspace';

export default function ProductResources() {
  const { product } = useLocalSearchParams<{ product: string }>();

  return isProduct(product) ? <ProductList product={product} /> : <UnknownProduct />;
}

// One product's resources: pinned first, then by name.
function ProductList({ product }: { product: ProductKey }) {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { project } = useWorkspace();
  const list = useProductList(product);
  const { refreshing, refresh } = usePullToRefresh(list.refetch);
  const { title } = PRODUCTS[product];
  // The list itself: the screen draws only the rows near it, however many resources there are
  const shown = list.error === null && !list.isLoading ? list.summaries : [];

  // Offline, no pull to refresh: it would wait for the network with its spinner up (the offline pill says why)
  return (
    <Screen
      topInset="belowNotice"
      onRefresh={isOnline ? refresh : undefined}
      refreshing={refreshing}
      rows={{
        title: project?.name,
        data: shown,
        rowKey: (summary) => summary.key,
        renderRow: (summary) => (
          <ListRow
            title={summary.name}
            subtitle={`${summary.detail} · ${summary.locality}`}
            trailing={{
              type: 'status',
              label: summary.statusLabel,
              health: summary.health,
              pinned: list.pinned.includes(summary.key),
            }}
            onPress={() =>
              router.push({
                pathname: '/resources/[product]/[locality]/[id]',
                params: { product, locality: summary.locality, id: summary.id },
              })
            }
          />
        ),
      }}
    >
      <Stack>
        <ScreenHeader title={title} onBack={router.back} />

        {list.error?.kind === 'forbidden' ? (
          <EmptyState
            icon="server"
            title="Resources aren't available"
            message="You don't have access to resources in this project."
          />
        ) : list.error !== null ? (
          <LoadFailed title={`Couldn't load your ${title}`} onRetry={() => void list.refetch()} />
        ) : list.isLoading ? (
          <Section loading />
        ) : list.summaries.length === 0 ? (
          <EmptyState
            icon="layers"
            title={`No ${title} in this project`}
            message="Resources you create on Scaleway show up here."
          />
        ) : list.refreshFailed ? (
          <ActionFailed />
        ) : null}
      </Stack>
    </Screen>
  );
}
