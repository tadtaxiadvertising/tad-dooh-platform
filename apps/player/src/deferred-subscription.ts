/**
 * Own a subscription created after an asynchronous module/provider load.
 * Disposing before the load resolves prevents the subscription from opening.
 * Consumers must use isActive() inside event callbacks to block late events.
 */
export function attachDeferredSubscription<T>(
  load: () => Promise<T>,
  subscribe: (provider: T, isActive: () => boolean) => () => void,
  onError: (error: unknown) => void,
): () => void {
  let active = true;
  let release: (() => void) | null = null;

  void Promise.resolve()
    .then(load)
    .then((provider) => {
      if (!active) return;
      const unsubscribe = subscribe(provider, () => active);
      if (!active) {
        unsubscribe();
      } else {
        release = unsubscribe;
      }
    })
    .catch((error: unknown) => {
      if (active) onError(error);
    });

  return () => {
    if (!active) return;
    active = false;
    const unsubscribe = release;
    release = null;
    unsubscribe?.();
  };
}
