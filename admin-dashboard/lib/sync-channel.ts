export type TabSyncEvent = 'DEVICES' | 'TAD_DRIVERS' | 'CAMPAIGNS' | 'FINANCE' | 'MEDIA' | 'ADVERTISERS';

const CHANNEL_NAME = 'tad_dashboard_sync';

// Singleton for the channel
let channel: BroadcastChannel | null = null;

if (typeof window !== 'undefined') {
  channel = new BroadcastChannel(CHANNEL_NAME);
}

export const notifyChange = (event: TabSyncEvent) => {
  if (channel) {
    channel.postMessage({ type: event, timestamp: Date.now() });
  }
};

export const subscribeToSync = (callback: (event: TabSyncEvent) => void) => {
  if (!channel) return () => {};

  const handler = (msg: MessageEvent) => {
    if (msg.data && msg.data.type) {
      callback(msg.data.type as TabSyncEvent);
    }
  };

  channel.addEventListener('message', handler);
  return () => channel?.removeEventListener('message', handler);
};
