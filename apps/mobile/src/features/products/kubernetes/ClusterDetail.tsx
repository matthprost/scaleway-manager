import { nodeStatus, poolStatus } from '@scaleway-manager/core';
import type { KubernetesCluster, KubernetesNode, KubernetesPool, ResourceSummary } from '@scaleway-manager/core';
import { AlertRow, Card, DetailHero, ListRow, Section } from '@scaleway-manager/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';

import { useServices } from '../../../wiring/ServicesProvider';
import { LoadFailed } from '../../errors/LoadFailed';
import { isRefused } from '../../errors/queryFailure';
import { DetailScreen } from '../../resources/DetailScreen';
import { resourceKey } from '../../resources/products';
import { NodeSheet } from './NodeSheet';

type ClusterBodyProps = {
  cluster: KubernetesCluster;
  summary: ResourceSummary;
  pinned: boolean;
  region: string;
  id: string;
  pools: UseQueryResult<KubernetesPool[]>;
  poolName: (node: KubernetesNode) => string | undefined;
  // The node whose sheet is open, kept while the sheet slides away
  picked: KubernetesNode | null;
  sheetOpen: boolean;
  onCloseSheet: () => void;
};

// Below the header: the cluster, its upgrade note and its pools (its nodes are the screen's rows, after this). A node
// opens its sheet, with its actions.
function ClusterBody({
  cluster,
  summary,
  pinned,
  region,
  id,
  pools,
  poolName,
  picked,
  sheetOpen,
  onCloseSheet,
}: ClusterBodyProps) {
  const queryClient = useQueryClient();
  // Refused (403): the pools are left out, since trying again can't help
  const poolsRefused = pools.data === undefined && isRefused(pools.error);
  // Nothing to show: they failed, or they wait for the network with nothing saved
  const poolsFailed = pools.data === undefined && !poolsRefused && (pools.isError || pools.fetchStatus === 'paused');
  // Its fresh state comes from the cluster
  const shown = picked === null ? null : (cluster.nodes?.find((node) => node.id === picked.id) ?? picked);

  return (
    <>
      <DetailHero
        product="kubernetes"
        subtitle={`Kubernetes ${cluster.version} · ${cluster.region}`}
        statusLabel={summary.statusLabel}
        health={summary.health}
        pinned={pinned}
      />

      {cluster.upgradeAvailable ? (
        <AlertRow
          tone="info"
          title="Upgrade available"
          detail="A newer Kubernetes version is available. Upgrade from the Scaleway console."
        />
      ) : null}

      {pools.data !== undefined ? (
        pools.data.length === 0 ? null : (
          <Section title="Node pools">
            {pools.data.map((pool) => {
              const status = poolStatus(pool);
              const autoscaling = pool.autoscaling ? ` · autoscaling ${pool.minSize}–${pool.maxSize}` : '';

              return (
                <ListRow
                  key={pool.id}
                  title={pool.name}
                  subtitle={`${pool.size} × ${pool.nodeType}${autoscaling}`}
                  trailing={{ type: 'status', label: status.label, health: status.health }}
                />
              );
            })}
          </Section>
        )
      ) : poolsFailed ? (
        <Card>
          <LoadFailed title="Couldn't load your node pools" onRetry={() => void pools.refetch()} />
        </Card>
      ) : poolsRefused ? null : (
        <Section title="Node pools" loading />
      )}

      {cluster.nodes === null ? (
        <Card>
          <LoadFailed
            title="Couldn't load your nodes"
            onRetry={() =>
              void queryClient.refetchQueries({ queryKey: resourceKey('kubernetes', region, id), exact: true })
            }
            // The node pools' Try again above already says "You're offline"
            offlineSaidAbove={poolsFailed}
          />
        </Card>
      ) : null}

      {shown === null ? null : (
        <NodeSheet node={shown} poolName={poolName(shown)} region={region} visible={sheetOpen} onClose={onCloseSheet} />
      )}
    </>
  );
}

// A Kubernetes cluster's screen: its version and health, an upgrade note, its node pools and its nodes.
export function ClusterDetail({ locality, id }: { locality: string; id: string }) {
  const services = useServices();
  const pools = useQuery({
    queryKey: [...resourceKey('kubernetes', locality, id), 'pools'],
    queryFn: () => services.kubernetes.pools(locality, id),
  });
  // The node whose sheet is open, kept while the sheet slides away (the rows and the sheet both need it)
  const [picked, setPicked] = useState<KubernetesNode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const poolName = (node: KubernetesNode) => pools.data?.find((pool) => pool.id === node.poolId)?.name;

  return (
    <DetailScreen<'kubernetes', KubernetesNode>
      product="kubernetes"
      locality={locality}
      id={id}
      // A big cluster has many nodes: the screen draws only those near it
      rows={({ item }) => ({
        title: 'Nodes',
        data: item.nodes ?? [],
        rowKey: (node) => node.id,
        renderRow: (node) => {
          const status = nodeStatus(node);

          return (
            <ListRow
              title={node.name}
              subtitle={node.publicIpv4 ?? poolName(node)}
              trailing={{ type: 'status', label: status.label, health: status.health }}
              onPress={() => {
                setPicked(node);
                setSheetOpen(true);
              }}
            />
          );
        },
      })}
    >
      {({ item, summary, pinned }) => (
        <ClusterBody
          cluster={item}
          summary={summary}
          pinned={pinned}
          region={locality}
          id={id}
          pools={pools}
          poolName={poolName}
          picked={picked}
          sheetOpen={sheetOpen}
          onCloseSheet={() => setSheetOpen(false)}
        />
      )}
    </DetailScreen>
  );
}
