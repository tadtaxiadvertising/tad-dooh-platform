import { advertiserSafeSelect } from "../advertisers/advertiser-safe-select";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PortalRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A referenced campaign must belong to the authenticated advertiser.
   * A matching request body advertiserId is NOT evidence of ownership.
   */
  async advertiserOwnsCampaign(
    campaignId: string,
    advertiserId: string,
  ): Promise<boolean> {
    if (!campaignId || !advertiserId) return false;
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { advertiserId: true },
    });
    return campaign?.advertiserId === advertiserId;
  }

  async create(data: {
    advertiserId?: string;
    driverId?: string;
    campaignId?: string;
    type: string;
    title: string;
    description?: string;
    data?: unknown;
  }) {
    return this.prisma.portalRequest.create({
      data: {
        advertiserId: data.advertiserId,
        driverId: data.driverId,
        campaignId: data.campaignId,
        type: data.type,
        title: data.title,
        description: data.description,
        data: data.data ? JSON.stringify(data.data) : "{}",
        status: "PENDING",
      },
    });
  }

  async findAll() {
    return this.prisma.portalRequest.findMany({
      include: {
        advertiser: {
          select: {
            companyName: true,
            email: true,
          },
        },
        driver: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByAdvertiser(advertiserId: string) {
    return this.prisma.portalRequest.findMany({
      where: { advertiserId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByDriver(driverId: string) {
    return this.prisma.portalRequest.findMany({
      where: { driverId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    return this.prisma.portalRequest.findUnique({
      where: { id },
      include: {
        advertiser: { select: advertiserSafeSelect },
        driver: true,
      },
    });
  }

  /**
   * Fail-closed containment for #299.
   *
   * This endpoint is NOT an accounting, payment-confirmation or publishing
   * workflow. The previous approval handler could mark payments PAID without
   * settlement evidence, activate unpaid campaigns and re-run side effects.
   *
   * Only a GENERAL request without a campaign reference can be approved here.
   * Other approvals require a separate, audited idempotent workflow.
   */
  async update(
    id: string,
    updateData: {
      status?: string;
      adminNotes?: string;
    },
  ) {
    if (
      !updateData ||
      (updateData.status === undefined && updateData.adminNotes === undefined)
    ) {
      throw new BadRequestException("No se proporcionaron cambios.");
    }
    if (
      updateData.status !== undefined &&
      updateData.status !== "APPROVED" &&
      updateData.status !== "REJECTED"
    ) {
      throw new BadRequestException("Transición de estado no permitida.");
    }

    const request = await this.prisma.portalRequest.findUnique({
      where: { id },
      select: { type: true, campaignId: true, status: true },
    });
    if (!request) {
      throw new NotFoundException("Solicitud no encontrada.");
    }

    // This guard must run BEFORE any write. Never silently approve a request
    // whose consequences cannot be committed and reconciled atomically.
    if (
      updateData.status === "APPROVED" &&
      (request.type !== "GENERAL" || request.campaignId !== null)
    ) {
      throw new ConflictException(
        "Aprobación automática suspendida para solicitudes financieras, " +
          "campañas o contenido. Requiere revisión y flujo seguro.",
      );
    }

    // Notes are administrative metadata, not a state transition.
    if (updateData.status === undefined) {
      return this.prisma.portalRequest.update({
        where: { id },
        data: { adminNotes: updateData.adminNotes },
        include: {
          advertiser: { select: advertiserSafeSelect },
          driver: true,
        },
      });
    }

    // Atomic compare-and-set: two admins (or repeated HTTP retries) cannot
    // both transition the same PENDING request. Approved/rejected is terminal.
    const transition = await this.prisma.portalRequest.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: updateData.status,
        ...(updateData.adminNotes !== undefined
          ? { adminNotes: updateData.adminNotes }
          : {}),
      },
    });
    if (transition.count !== 1) {
      throw new ConflictException(
        "La solicitud ya fue procesada por otro administrador.",
      );
    }

    return this.prisma.portalRequest.findUnique({
      where: { id },
      include: { advertiser: { select: advertiserSafeSelect }, driver: true },
    });
  }

  async remove(id: string) {
    return this.prisma.portalRequest.delete({
      where: { id },
    });
  }
}
