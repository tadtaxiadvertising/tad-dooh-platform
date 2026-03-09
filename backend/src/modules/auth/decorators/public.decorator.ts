import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';

/**
 * Mark a route as public (no JWT required).
 * Use on tablet-facing endpoints: sync, heartbeat, register, analytics.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
