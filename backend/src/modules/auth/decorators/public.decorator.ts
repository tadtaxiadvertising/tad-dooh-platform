import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public (no JWT required).
 * Use on tablet-facing endpoints: sync, heartbeat, register, analytics.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
