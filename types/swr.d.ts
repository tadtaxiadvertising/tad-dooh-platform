declare module 'swr' {
  export interface SWRConfiguration {
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
    shouldRetryOnError?: boolean;
    dedupingInterval?: number;
    focusThrottleInterval?: number;
    revalidateThrottleInterval?: number;
    errorRetryInterval?: number;
    loadingTimeout?: number;
    refreshInterval?: number;
    refreshWhenHidden?: boolean;
    refreshWhenOffline?: boolean;
    suspense?: boolean;
    keepPreviousData?: boolean;
  }

  interface SWRResponse<T> {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
    isValidating: boolean;
    mutate: (value: T | ((prev: T) => T)) => void;
  }

  function swr<T>(key: string | string[], fallback?: T | ((arg: T) => T), config?: SWRConfiguration): SWRResponse<T>;

  export default swr;
}
