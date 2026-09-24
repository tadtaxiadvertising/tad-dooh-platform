/**
 * Injection tokens for payment providers.
 *
 * This file intentionally has no module or controller imports. Keeping the
 * tokens separate prevents the controller from creating a circular runtime
 * import with `PaymentsModule` while its decorators are being evaluated.
 */
export const PAYMENT_PROVIDER_FACTORY = "PAYMENT_PROVIDER_FACTORY";
export const CURRENT_PAYMENT_PROVIDER = "CURRENT_PAYMENT_PROVIDER";
