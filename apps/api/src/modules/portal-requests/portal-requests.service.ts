import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PortalRequestsService {
  private readonly logger = new Logger(PortalRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async create(data: {
    advertiserId: string;
    campaignId?: string;
    type: string;
    title: string;
    description?: string;
    data?: any;
  }) {
    return (this.prisma as any).portalRequest.create({
      data: {
        advertiserId: data.advertiserId,
        campaignId: data.campaignId,
        type: data.type,
        title: data.title,
        description: data.description,
        data: data.data ? JSON.stringify(data.data) : '{}',
        status: 'PENDING',
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByAdvertiser(advertiserId: string) {
    return (this.prisma as any).portalRequest.findMany({
      where: { advertiserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return (this.prisma as any).portalRequest.findUnique({
      where: { id },
      include: {
        advertiser: true,
      },
    });
  }

  async update(id: string, updateData: {
    status?: string;
    adminNotes?: string;
  }) {
    const request = await (this.prisma as any).portalRequest.findUnique({
      where: { id },
      include: { advertiser: true },
    });

    if (!request) throw new Error(`PortalRequest ${id} not found`);

    const updated = await (this.prisma as any).portalRequest.update({
      where: { id },
      data: updateData,
    });

    // ===========================================================
    // BUG FIX: Trigger content deployment on APPROVAL
    // ===========================================================
    if (updateData.status === 'APPROVED' && request.campaignId) {
      try {
        this.logger.log(`[APPROVAL_FLOW] Processing approval for request ${id}, type: ${request.type}`);

        // 1. Always activate + update the campaign
        await this.prisma.campaign.update({
          where: { id: request.campaignId },
          data: { active: true, status: 'ACTIVE', updatedAt: new Date() }
        });

        // 2. If it's a content update, link the new media asset
        if (request.type === 'CONTENT_UPDATE' && request.data) {
          let mediaData: any;
          try {
            mediaData = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
          } catch (e) {
            this.logger.warn(`[APPROVAL_FLOW] Invalid media data JSON for request ${id}`);
          }

          if (mediaData?.mediaId) {
            // Link an existing media record
            await this.prisma.media.update({
              where: { id: mediaData.mediaId },
              data: { campaign_id: request.campaignId }
            }).catch(() => {});
          } else if (mediaData?.url) {
            // Create a new MediaAsset from the portal submission
            await this.prisma.mediaAsset.create({
              data: {
                campaignId: request.campaignId,
                type: mediaData.type || 'VIDEO',
                filename: mediaData.filename || 'portal-upload.mp4',
                url: mediaData.url,
                fileSize: Math.round(Number(mediaData.fileSize || 0)),
                checksum: mediaData.checksum || mediaData.hashMd5 || 'portal-upload',
                duration: Math.round(Number(mediaData.duration || 30)),
                version: 1,
              }
            }).catch(e => this.logger.warn(`[APPROVAL_FLOW] MediaAsset create failed: ${e.message}`));
          }
        }

        // 3. Dispatch FORCE_SYNC to all assigned devices
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: request.campaignId },
          select: { targetAll: true, isGlobal: true }
        });

        let devicesToSync: { id: string }[] = [];
        if (campaign?.targetAll || campaign?.isGlobal) {
          devicesToSync = await this.prisma.device.findMany({
            where: { status: 'ACTIVE' }, select: { id: true }
          });
        } else {
          const assignments = await this.prisma.deviceCampaign.findMany({
            where: { campaign_id: request.campaignId }
          });
          devicesToSync = assignments.map(a => ({ id: a.device_id }));
        }

        if (devicesToSync.length > 0) {
          await this.prisma.deviceCommand.createMany({
            data: devicesToSync.map(d => ({
              deviceId: d.id,
              commandType: 'FORCE_SYNC',
              commandParams: JSON.stringify({
                reason: 'portal_request_approved',
                campaignId: request.campaignId,
                requestId: id,
              }),
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
            }))
          });
        }

        // 4. Broadcast WAKE_UP_CALL for real-time tablets
        this.supabase.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
          reason: 'portal_request_approved',
          campaignId: request.campaignId,
          requestId: id,
        }).catch(() => {});

        this.logger.log(`[APPROVAL_FLOW] ✅ Campaign ${request.campaignId} activated, FORCE_SYNC sent to ${devicesToSync.length} devices.`);
      } catch (err) {
        this.logger.error(`[APPROVAL_FLOW] ❌ Approval dispatch failed: ${err.message}`);
        // Do NOT re-throw — the status was already saved. The admin should see this in logs.
      }
    }

    return updated;
  }

  async remove(id: string) {
    return (this.prisma as any).portalRequest.delete({
      where: { id },
    });
  }
}
