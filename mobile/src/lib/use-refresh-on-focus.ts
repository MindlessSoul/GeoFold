import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

/**
 * Re-runs a loader every time the screen comes into focus.
 *
 * Tab screens stay mounted, so without this a surveyor who captures a point and taps back to
 * Records would still be looking at the list from before the capture.
 */
export function useRefreshOnFocus(load: () => void | Promise<void>): void {
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
}
