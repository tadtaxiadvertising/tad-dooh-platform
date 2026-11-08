import { SWRConfiguration } from "swr";
import { enqueueOfflineAction } from "./offlineQueue";

export const swrConfig: SWRConfiguration = {
  fetcher: async (url: string) => {
    if (!navigator.onLine) {
      throw new Error("NETWORK_OFFLINE");
    }
    const res = await fetch(url);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.code || "API_ERROR");
    }
    return res.json();
  },
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    if (error.message === "NETWORK_OFFLINE") return false;
    if (error.message === "FUNDS_ERROR") return false;
    if (error.message === "AUTH_EXPIRED") return false;
    return true;
  },
  errorRetryCount: 3,
};

// Custom fetcher for mutations that supports offline queueing
export const fetchWithOfflineQueue = async (
  url: string,
  payload: Record<string, unknown>,
) => {
  if (!navigator.onLine) {
    await enqueueOfflineAction(url, payload);
    return { queued: true };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.code || "API_ERROR");
  }
  return res.json();
};
