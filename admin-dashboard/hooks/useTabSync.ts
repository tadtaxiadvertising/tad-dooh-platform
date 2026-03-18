import { useEffect } from 'react';
import { subscribeToSync, TabSyncEvent } from '../lib/sync-channel';

/**
 * Hook to listen for synchronization events across tabs.
 * 
 * @param event The event type to listen for (e.g., 'DEVICES', 'CONDUCTORES').
 * @param onSync Callback to trigger when a change is detected in another tab.
 */
export const useTabSync = (event: TabSyncEvent | TabSyncEvent[], onSync: () => void) => {
  useEffect(() => {
    const events = Array.isArray(event) ? event : [event];
    
    const unsubscribe = subscribeToSync((receivedEvent) => {
      if (events.includes(receivedEvent)) {
        onSync();
      }
    });

    return unsubscribe;
  }, [event, onSync]);
};
