import { useContext } from 'react';

import { ToastContext } from './ToastProvider';

// Shows a short success for 2 seconds ("SSH key added"). Never a failure: that's the quiet failure line.
export function useToast(): (message: string) => void {
  const show = useContext(ToastContext);

  if (show === null) {
    throw new Error('useToast must be used inside a ToastProvider');
  }

  return show;
}
