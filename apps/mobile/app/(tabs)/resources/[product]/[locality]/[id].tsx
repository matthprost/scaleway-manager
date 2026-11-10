import type { ProductKey } from '@scaleway-manager/core';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

import { DatabaseDetail } from '../../../../../src/features/products/databases/DatabaseDetail';
import { ElasticMetalDetail } from '../../../../../src/features/products/elastic-metal/ElasticMetalDetail';
import { InstanceDetail } from '../../../../../src/features/products/instances/InstanceDetail';
import { JobDetail } from '../../../../../src/features/products/jobs/JobDetail';
import { ClusterDetail } from '../../../../../src/features/products/kubernetes/ClusterDetail';
import { LoadBalancerDetail } from '../../../../../src/features/products/load-balancers/LoadBalancerDetail';
import { ServerlessDetail } from '../../../../../src/features/products/serverless/ServerlessDetail';
import { isProduct } from '../../../../../src/features/resources/products';
import { UnknownProduct } from '../../../../../src/features/resources/UnknownProduct';
import { useWorkspace } from '../../../../../src/features/workspace/useWorkspace';

// Each product's own screen (containers and functions share one)
const DETAILS: Record<
  Exclude<ProductKey, 'containers' | 'functions'>,
  ComponentType<{ locality: string; id: string }>
> = {
  instances: InstanceDetail,
  'elastic-metal': ElasticMetalDetail,
  kubernetes: ClusterDetail,
  databases: DatabaseDetail,
  jobs: JobDetail,
  'load-balancers': LoadBalancerDetail,
};

// A resource's screen, opened from its product's list or from Home.
export default function ResourceDetail() {
  const { product, locality, id } = useLocalSearchParams<{ product: string; locality: string; id: string }>();
  const navigation = useNavigation();
  const projectId = useWorkspace().project?.id;
  // The project it opened in, once known. Another one picked meanwhile (from Home or Account, while this tab keeps
  // the screen open) closes it: the resource, its pin and its list belong to the old project
  const [openedIn, setOpenedIn] = useState(projectId);
  const switched = openedIn !== undefined && projectId !== undefined && projectId !== openedIn;

  if (openedIn === undefined && projectId !== undefined) {
    setOpenedIn(projectId);
  }

  // Back to the Resources tab's first screen, without changing tab
  useEffect(() => {
    if (switched) {
      navigation.dispatch({ type: 'POP_TO_TOP' });
    }
  }, [switched, navigation]);

  if (switched) {
    return null;
  }
  if (!isProduct(product)) {
    return <UnknownProduct />;
  }
  if (product === 'containers' || product === 'functions') {
    return <ServerlessDetail product={product} locality={locality} id={id} />;
  }
  const Detail = DETAILS[product];

  return <Detail locality={locality} id={id} />;
}
