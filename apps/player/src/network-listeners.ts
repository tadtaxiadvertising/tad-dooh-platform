/**
 * Register a browser connectivity listener and return idempotent cleanup.
 */
export function attachNetworkListener(
  target: Pick<Window, "addEventListener" | "removeEventListener">,
  event: "online" | "offline",
  listener: () => void,
): () => void {
  target.addEventListener(event, listener);
  let attached = true;
  return () => {
    if (!attached) return;
    attached = false;
    target.removeEventListener(event, listener);
  };
}
