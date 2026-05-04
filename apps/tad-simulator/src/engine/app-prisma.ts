type AsyncFn = (...args: any[]) => Promise<any>;

type PrismaDelegate = {
  [methodName: string]: AsyncFn;
};

export interface AppPrismaLike {
  playbackEvent: PrismaDelegate;
  analyticsEvent: PrismaDelegate;
  driverLocation: PrismaDelegate;
  subscription: PrismaDelegate;
  device: PrismaDelegate;
  driver: PrismaDelegate;
  $transaction: (queries: Promise<any>[]) => Promise<any[]>;
  $executeRawUnsafe: (query: string) => Promise<number>;
  $disconnect: () => Promise<void>;
}

const createNoopDelegate = (): PrismaDelegate =>
  new Proxy(
    {},
    {
      get: () => async () => ({ count: 0 })
    }
  ) as PrismaDelegate;

const createNoopClient = (): AppPrismaLike => ({
  playbackEvent: createNoopDelegate(),
  analyticsEvent: createNoopDelegate(),
  driverLocation: createNoopDelegate(),
  subscription: createNoopDelegate(),
  device: createNoopDelegate(),
  driver: createNoopDelegate(),
  $transaction: async (queries: Promise<any>[]) => Promise.all(queries),
  $executeRawUnsafe: async () => 0,
  $disconnect: async () => {}
});

import { PrismaClient } from '@prisma/client';

export function createAppPrismaClient(): AppPrismaLike {
  try {
    // We use a static import now to ensure Next.js standalone mode bundles the client.
    // The Dockerfile ensures prisma generate is run before building.
    return new PrismaClient() as unknown as AppPrismaLike;
  } catch (error: any) {
    console.warn(`[Engine] Prisma client unavailable, using no-op client: ${error?.message ?? 'unknown error'}`);
    return createNoopClient();
  }
}
