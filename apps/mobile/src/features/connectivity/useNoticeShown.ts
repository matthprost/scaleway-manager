import { screenshotBuild } from '../../wiring/buildConfig';
import { useServices } from '../../wiring/ServicesProvider';
import { useOfflineNotice } from './useOfflineNotice';

// A notice floats at the top (the offline pill, "Back online", or the Demo badge, always up in demo mode except in
// screenshot builds): a purple header's content makes room for it while it shows.
export function useNoticeShown(): boolean {
  const { mode } = useServices();
  const notice = useOfflineNotice();

  return (mode === 'demo' && !screenshotBuild) || notice !== null;
}
