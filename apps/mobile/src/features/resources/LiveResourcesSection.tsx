import { pickLiveResources } from '@scaleway-manager/core';
import { Carousel, EmptyState, ResourceCard, SectionHeader, sizes } from '@scaleway-manager/ui';
import { useRouter } from 'expo-router';

import { LoadFailed } from '../errors/LoadFailed';
import { usePins } from './usePins';
import { useResourceSummaries } from './useResourceSummaries';

// Card shapes while the resources load: enough to fill the row
const LOADING_CARDS = ['first', 'second', 'third'];

// Home's Live resources: pinned first, then the most relevant, as cards that swipe sideways.
// Its parts stay direct children of Home's content column (touches in the screen margin).
// offlineSaidAbove: the header already says "You're offline"
export function LiveResourcesSection({ offlineSaidAbove = false }: { offlineSaidAbove?: boolean }) {
  const router = useRouter();
  const resources = useResourceSummaries();
  const pins = usePins();
  const live = pickLiveResources(resources.summaries, pins.pinned);

  return (
    <>
      <SectionHeader title="Live resources" action={{ label: 'See all', onPress: () => router.navigate('/resources') }} />

      {pins.isLoading || (live.length === 0 && resources.isLoading) ? (
        <Carousel itemWidth={sizes.resourceCard}>
          {LOADING_CARDS.map((key) => (
            <ResourceCard key={key} loading />
          ))}
        </Carousel>
      ) : live.length > 0 ? (
        <Carousel itemWidth={sizes.resourceCard}>
          {live.map((resource) => (
            <ResourceCard
              key={resource.key}
              product={resource.product}
              title={resource.name}
              subtitle={resource.kindLabel}
              meta={`${resource.locality} · ${resource.detail}`}
              statusLabel={resource.statusLabel}
              health={resource.health}
              pinned={pins.pinned.includes(resource.key)}
              // Opens inside the Resources tab, with its first screen under it (the tab bar and the pill stay)
              onPress={() =>
                router.navigate(
                  {
                    pathname: '/resources/[product]/[locality]/[id]',
                    params: { product: resource.product, locality: resource.locality, id: resource.id },
                  },
                  { withAnchor: true },
                )
              }
            />
          ))}
        </Carousel>
      ) : resources.forbidden ? (
        <EmptyState
          icon="server"
          title="Resources aren't available"
          message="You don't have access to resources in this project."
        />
      ) : resources.failed ? (
        <LoadFailed
          title="Couldn't load your resources"
          onRetry={resources.retry}
          offlineSaidAbove={offlineSaidAbove}
        />
      ) : (
        <EmptyState icon="server" title="Nothing running yet" message="Resources in this project will show up here." />
      )}
    </>
  );
}
