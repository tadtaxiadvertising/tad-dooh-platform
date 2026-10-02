import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SupabaseService } from "../supabase/supabase.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

@Injectable()
export class PortalRequestsService {
  private readonly logger = new Logger(PortalRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async create(data: {
    advertiserId?: string;
    driverId?: string;
    campaignId?: string;
    type: string;
    title: string;
    description?: string;
    data?: any;
  }) {
    return (this.prisma as any).portalRequest.create({
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
    return (this.prisma as any).portalRequest.findMany({
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
    return (this.prisma as any).portalRequest.findMany({
      where: { advertiserId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByDriver(driverId: string) {
    return (this.prisma as any).portalRequest.findMany({
      where: { driverId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    return (this.prisma as any).portalRequest.findUnique({
      where: { id },
      include: {
        advertiser: true,
        driver: true,
      },
    });
  }

  async update(
    id: string,
    updateData: {
      status?: string;
      adminNotes?: string;
    },
  ) {
    const request = await (this.prisma as any).portalRequest.findUnique({
      where: { id },
      include: { advertiser: true, driver: true },
    });

    if (!request) throw new Error(`PortalRequest ${id} not found`);

    const updated = await (this.prisma as any).portalRequest.update({
      where: { id },
      data: updateData,
    });

    // ===========================================================
    // BUG FIX: Trigger content deployment on APPROVAL
    // ===========================================================
    if (updateData.status === "APPROVED") {
      // ===========================================================
      // REGLA DE SEGURIDAD 07 + R4: Valida media y límites ANTES de cualquier efecto colateral.
      // Si falla, la solicitud NO se aprueba (el error corta la actualización).
      // ===========================================================
      if (request.type === "CAMPAIGN_CREATE" && request.data) {
        const cData = JSON.parse(request.data);

        if (cData.mediaUrl) {
          this.validateMediaUrl(cData.mediaUrl);
        }

        // R4: Máximo de campañas activas simultáneas por anunciante
        if (request.advertiserId) {
          const activeCount = await this.prisma.campaign.count({
            where: {
              advertiserId: request.advertiserId,
              status: { in: ["ACTIVE", "PENDING_REVIEW", "PENDING_PAYMENT"] },
            },
          });
          if (activeCount >= BUSINESS_RULES.MAX_CAMPAIGNS_PER_ADVERTISER) {
            throw new BadRequestException(
              `Límite alcanzado: este anunciante ya tiene ${activeCount} campañas activas (máx. ${BUSINESS_RULES.MAX_CAMPAIGNS_PER_ADVERTISER}).`,
            );
          }
        }
      }

      if (request.type === "CONTENT_UPDATE" && request.data) {
        const mediaData = JSON.parse(request.data);
        if (mediaData?.url) {
          this.validateMediaUrl(mediaData.url);
        }
      }

      try {
        this.logger.log(
          `[APPROVAL_FLOW] Processing approval for request ${id}, type: ${request.type}`,
        );

        let targetCampaignId = request.campaignId;

        // NEW: Handle Campaign Creation Workflow
        if (request.type === "CAMPAIGN_CREATE" && request.data) {
          const cData = JSON.parse(request.data);

          // 1. Create the Campaign
          // Validate dates before passing to Prisma
          const parsedStartDate = Date.parse(cData.startDate);
          const parsedEndDate = Date.parse(cData.endDate);

          if (isNaN(parsedStartDate) || isNaN(parsedEndDate)) {
            this.logger.error(
              `[APPROVAL_FLOW] ❌ Invalid dates provided for request ${id}`,
            );
            throw new BadRequestException(
              "Las fechas de inicio y fin deben ser válidas y obligatorias.",
            );
          }

          const newCampaign = await this.prisma.campaign.create({
            data: {
              name: cData.name,
              advertiser:
                request.advertiser?.companyName || "Anunciante de Portal", // Required string field
              advertiserId: (request.advertiserId as string) || null, // Optional FK field
              description:
                request.description || "Inició vía Portal de Anunciante",
              startDate: new Date(parsedStartDate),
              endDate: new Date(parsedEndDate),
              status: "ACTIVE",
              active: true,
              isGlobal: true,
              targetAll: true,
              budget: 1000,
              category: cData.category || "General",
            },
          });

          targetCampaignId = newCampaign.id;

          // 2. Wrap MediaAsset creation
          if (cData.mediaUrl) {
            await this.prisma.mediaAsset.create({
              data: {
                campaignId: targetCampaignId,
                type: "VIDEO",
                filename: `portal-${newCampaign.id}.mp4`,
                url: cData.mediaUrl,
                fileSize: 1024 * 1024 * 5, // Simulated 5MB
                checksum: `MD5-${newCampaign.id}`, // Required field
                duration: 15, // Default 15s
                version: 1,
              },
            });
          }

          // 3. Update request with the new campaign reference
          await (this.prisma as any).portalRequest.update({
            where: { id },
            data: { campaignId: targetCampaignId },
          });

          this.logger.log(
            `[APPROVAL_FLOW] Created NEW Campaign ${targetCampaignId} for Advertiser ${request.advertiserId}`,
          );
        }

        // NEW: Handle Driver Payout Workflow
        if (request.type === "PAYOUT" && request.driverId) {
          let amount = 0;
          // Try structured data first, then fallback to description regex
          try {
            const payoutData =
              typeof request.data === "string"
                ? JSON.parse(request.data)
                : request.data;
            amount = parseFloat(payoutData?.amount) || 0;
          } catch {
            /* ignore parse errors */
          }
          if (amount === 0) {
            const amountStr =
              request.description
                ?.match(/RD\$([\d,.]+)/)?.[1]
                ?.replace(/,/g, "") || "0";
            amount = parseFloat(amountStr) || 0;
          }
          const month = new Date().getMonth() + 1;
          const year = new Date().getFullYear();

          if (amount > 0) {
            const existing = await this.prisma.payrollPayment.findUnique({
              where: {
                driverId_month_year: {
                  driverId: request.driverId,
                  month,
                  year,
                },
              },
            });

            if (existing) {
              await this.prisma.payrollPayment.update({
                where: { id: existing.id },
                data: {
                  amount: existing.amount + amount,
                  status: "PAID",
                  paidAt: new Date(),
                  referenceNum: `UPG-${id}`,
                },
              });
            } else {
              await this.prisma.payrollPayment.create({
                data: {
                  driverId: request.driverId,
                  amount: amount,
                  month,
                  year,
                  status: "PAID",
                  paidAt: new Date(),
                  referenceNum: `REQ-${id}`,
                },
              });
            }
            this.logger.log(
              `[APPROVAL_FLOW] 💰 PAID RD$${amount} to Driver ${request.driverId}`,
            );
          }
        }

        // Handle established Campaign activations/updates
        if (targetCampaignId) {
          // 1. Always activate + update the campaign
          await this.prisma.campaign.update({
            where: { id: targetCampaignId },
            data: { active: true, status: "ACTIVE", updatedAt: new Date() },
          });

          // 2. If it's a content update, link the new media asset
          if (request.type === "CONTENT_UPDATE" && request.data) {
            let mediaData: any;
            try {
              mediaData =
                typeof request.data === "string"
                  ? JSON.parse(request.data)
                  : request.data;
            } catch (e) {
              this.logger.warn(
                `[APPROVAL_FLOW] Invalid media data JSON for request ${id}`,
              );
            }

            if (mediaData?.mediaId) {
              // Link an existing media record
              await this.prisma.media
                .update({
                  where: { id: mediaData.mediaId },
                  data: { campaign_id: targetCampaignId },
                })
                .catch(() => {});
            } else if (mediaData?.url) {
              // FIX FINDING-004: Deduplicar antes de crear MediaAsset. Si el archivo ya fue
              // registrado como Media (v2) en register-bypassed (mismo hashMd5/storageKey o url),
              // NO crear un segundo registro: solo enlazarlo a la campaña.
              const checksum =
                mediaData.checksum || mediaData.hashMd5 || "portal-upload";
              const existingMedia = await this.prisma.media
                .findFirst({
                  where: {
                    OR: [{ hashMd5: checksum }, { url: mediaData.url }],
                  },
                })
                .catch(() => null);

              if (existingMedia) {
                if (existingMedia.campaign_id !== targetCampaignId) {
                  await this.prisma.media
                    .update({
                      where: { id: existingMedia.id },
                      data: { campaign_id: targetCampaignId },
                    })
                    .catch(() => {});
                }
                this.logger.log(
                  `[APPROVAL_FLOW] Media duplicado detectado (checksum/url ya registrado). ` +
                    `Enlazado a campaña, saltando creación de MediaAsset para ${mediaData.filename}. mediaId=${existingMedia.id}`,
                );
              } else {
                // Create a new MediaAsset from the portal submission
                await this.prisma.mediaAsset
                  .create({
                    data: {
                      campaignId: targetCampaignId,
                      type: mediaData.type || "VIDEO",
                      filename: mediaData.filename || "portal-upload.mp4",
                      url: mediaData.url,
                      fileSize: Math.round(Number(mediaData.fileSize || 0)),
                      checksum,
                      duration: Math.round(Number(mediaData.duration || 30)),
                      version: 1,
                    },
                  })
                  .catch((e) =>
                    this.logger.warn(
                      `[APPROVAL_FLOW] MediaAsset create failed: ${e.message}`,
                    ),
                  );
              }
            }
          }

          // 3. Create DeviceCampaign assignments for global/targetAll campaigns
          const campaign = await this.prisma.campaign.findUnique({
            where: { id: targetCampaignId },
            select: { targetAll: true, isGlobal: true },
          });

          let devicesToSync: { id: string }[] = [];
          if (campaign?.targetAll || campaign?.isGlobal) {
            devicesToSync = await this.prisma.device.findMany({
              where: { status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
              select: { id: true },
            });

            // Create DeviceCampaign assignments so sync endpoint serves this campaign
            if (devicesToSync.length > 0) {
              await this.prisma.deviceCampaign.createMany({
                data: devicesToSync.map((d) => ({
                  device_id: d.id,
                  campaign_id: targetCampaignId!,
                })),
                skipDuplicates: true,
              });
            }
          } else {
            const assignments = await this.prisma.deviceCampaign.findMany({
              where: { campaign_id: targetCampaignId },
            });
            devicesToSync = assignments.map((a) => ({ id: a.device_id }));
          }

          // 4. Dispatch FORCE_SYNC to all assigned devices
          if (devicesToSync.length > 0) {
            await this.prisma.deviceCommand.createMany({
              data: devicesToSync.map((d) => ({
                deviceId: d.id,
                commandType: "FORCE_SYNC",
                commandParams: JSON.stringify({
                  reason: "portal_request_approved",
                  campaignId: targetCampaignId,
                  requestId: id,
                }),
                status: "PENDING",
                expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
              })),
            });
          }

          // 5. Broadcast WAKE_UP_CALL for real-time tablets
          this.supabase
            .broadcastEvent("fleet_sync", "WAKE_UP_CALL", {
              reason: "portal_request_approved",
              campaignId: targetCampaignId,
              requestId: id,
            })
            .catch(() => {});

          this.logger.log(
            `[APPROVAL_FLOW] ✅ Campaign ${targetCampaignId} activated, assigned & synced to ${devicesToSync.length} devices.`,
          );
        }
      } catch (err) {
        this.logger.error(
          `[APPROVAL_FLOW] ❌ Approval dispatch failed: ${err.message}`,
        );
      }
    }

    // Return enriched response
    return (this.prisma as any).portalRequest.findUnique({
      where: { id },
      include: { advertiser: true, driver: true },
    });
  }

  async remove(id: string) {
    return (this.prisma as any).portalRequest.delete({
      where: { id },
    });
  }

  /**
   * REGLA DE SEGURIDAD 07: Solo URL de piezas MP4 (H.264), JPG o PNG.
   * Ignora query strings y hashes de CDN (p.ej. ".mp4?token=x").
   */
  private validateMediaUrl(url: string) {
    const cleanPath = url.split("?")[0].split("#")[0];
    const ext = cleanPath.split(".").pop()?.toLowerCase() || "";
    const isAllowed = BUSINESS_RULES.ALLOWED_MEDIA_EXTENSIONS.some(
      (allowed) => allowed === `.${ext}`,
    );
    if (!isAllowed) {
      throw new BadRequestException(
        `URL de pieza no válida: debe terminar en ${BUSINESS_RULES.ALLOWED_MEDIA_EXTENSIONS.join(", ")}. Recibido: ${cleanPath}`,
      );
    }
  }
}
