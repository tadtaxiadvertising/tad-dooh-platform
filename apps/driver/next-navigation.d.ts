declare module 'next/navigation' {
  export interface UseRouter {
    (): {
      push: (href: string, options?: { scroll?: boolean }) => Promise<void>;
      replace: (href: string, options?: { scroll?: boolean }) => Promise<void>;
      prefetch: (href: string, options?: { priority?: boolean }) => Promise<void>;
      back: () => void;
      forward: () => void;
      refresh: () => void;
      pathname: string;
      query: Record<string, string | string[] | undefined>;
      asPath: string;
      locale?: string;
      locales?: string[];
      defaultLocale?: string;
      isReady: boolean;
      isFallback: boolean;
      isPreview: boolean;
    };
  }

  export const useRouter: UseRouter;
  export const usePathname: () => string;
  export const useSearchParams: () => URLSearchParams;
  export const useParams: () => Record<string, string>;
  export const useSelectedLayoutSegment: (parallelRouteKey?: string) => string | undefined;
  export const useSelectedLayoutSegments: (parallelRouteKey?: string) => string[];
}