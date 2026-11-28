import { ForbiddenException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";

/**
 * A correlated public registration cannot become a different account through
 * role resolution or OAuth auto-provisioning. Only the server-owned committed
 * receipt may establish this link. Legacy identities have no correlation.
 */
export async function assertCommittedAdvertiserRegistration(
  prisma: Pick<PrismaService, "idempotencyKey">,
  correlation: unknown,
  authUserId: string,
  advertiserId: string | null,
): Promise<void> {
  if (correlation === undefined) return;

  const pending = () =>
    new ForbiddenException({
      code: "ADVERTISER_REGISTRATION_RECONCILIATION_REQUIRED",
      message:
        "No pudimos confirmar tu registro. Contacta a soporte de TAD antes de volver a registrarte.",
    });
  if (
    typeof correlation !== "string" ||
    !/^[a-f0-9]{64}$/.test(correlation) ||
    !advertiserId
  ) {
    throw pending();
  }

  const reservation = await prisma.idempotencyKey.findUnique({
    where: { key: correlation },
    select: {
      driverId: true,
      path: true,
      method: true,
      isLocked: true,
      response: true,
    },
  });
  if (
    !reservation ||
    reservation.driverId !== "public-advertiser-onboarding:single-use:v1" ||
    reservation.path !== "/onboarding/advertiser" ||
    reservation.method !== "POST" ||
    reservation.isLocked ||
    !reservation.response ||
    reservation.response.length > 4096
  ) {
    throw pending();
  }

  let receipt: unknown;
  try {
    receipt = JSON.parse(reservation.response);
  } catch {
    throw pending();
  }
  if (
    !receipt ||
    typeof receipt !== "object" ||
    !("state" in receipt) ||
    receipt.state !== "COMMITTED" ||
    !("authUserId" in receipt) ||
    receipt.authUserId !== authUserId ||
    !("advertiserId" in receipt) ||
    receipt.advertiserId !== advertiserId
  ) {
    throw pending();
  }
}
