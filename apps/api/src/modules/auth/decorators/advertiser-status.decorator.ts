import { SetMetadata } from "@nestjs/common";

/**
 * Explicit exceptions to the default ACTIVE-only commercial account gate.
 *
 * Only decorate endpoints needed for onboarding/approval-state transitions.
 * This metadata does not authenticate, grant RBAC or bypass tenant ownership.
 */
export const ADVERTISER_ALLOWED_STATUSES_KEY = "advertiser_allowed_statuses";
export const AllowAdvertiserStatuses = (...statuses: string[]) =>
  SetMetadata(ADVERTISER_ALLOWED_STATUSES_KEY, statuses);
