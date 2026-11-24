import { ConflictException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import { isCanonicalUuid } from "../campaign/device-identity-lookup";

/**
 * DeviceCampaign.device_id is a transitional TEXT identifier and can contain
 * either the physical devices.id UUID or the hardware device_id.
 * Prevent newly supplied hardware IDs from aliasing another tablet's UUID.
 *
 * On the hot heartbeat/event path this runs only before creating an UNKNOWN
 * device, not for every packet. No database mutation is performed here.
 */
export async function assertNoDeviceHardwareUuidAlias(
  prisma: PrismaService,
  hardwareId: string,
): Promise<void> {
  if (!isCanonicalUuid(hardwareId)) return;

  const owner = await prisma.device.findUnique({
    where: { id: hardwareId },
    select: { id: true, deviceId: true },
  });

  if (owner && owner.deviceId !== hardwareId) {
    throw new ConflictException("Identificador de hardware no disponible");
  }
}
