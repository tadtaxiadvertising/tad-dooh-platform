import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { PlaybackConfirmationDto } from './dto/playback-confirmation.dto';
import { CampaignService } from '../campaign/campaign.service';

const MAX_SLOTS_PER_DEVICE = 15;

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignService: CampaignService,
  ) {}

  /**
   * Calculates availability slots for a device.
   * Based on current dynamic playlist generation.
   */
  async getDeviceSlots(deviceId: string) {
    // We query the sync payload to see how many slots are "taking up" the device currently
    const syncData = await this.campaignService.getActiveSyncVideos(deviceId);
    const assignedSlots = syncData.media_assets?.length || 0;

    return {
      device_id: deviceId,
      max_slots: MAX_SLOTS_PER_DEVICE,
      assigned_slots: assignedSlots,
      available_slots: Math.max(0, MAX_SLOTS_PER_DEVICE - assignedSlots),
      usage_percentage: Math.round((assignedSlots / MAX_SLOTS_PER_DEVICE) * 100)
    };
  }


  async registerDevice(dto: RegisterDeviceDto) {
    const existingDevice = await this.prisma.device.findUnique({
      where: { deviceId: dto.device_id },
    });

    if (existingDevice) {
      this.logger.log(`Device already exists, updating lastSeen: ${dto.device_id}`);
      return this.prisma.device.update({
        where: { deviceId: dto.device_id },
        data: { 
          appVersion: dto.app_version,
          lastSeen: new Date(),
        },
      });
    }

    this.logger.log(`Registering new device: ${dto.device_id}`);
    return this.prisma.device.create({
      data: {
        deviceId: dto.device_id,
        appVersion: dto.app_version,
        status: 'ACTIVE',
        lastSeen: new Date(),
      },
    });
  }

  async deviceHeartbeat(dto: HeartbeatDto) {
    // Make sure device exists first
    let device = await this.prisma.device.findUnique({
      where: { deviceId: dto.device_id },
    });

    if (!device) {
      this.logger.warn(`Heartbeat received for unknown device: ${dto.device_id}, auto-registering.`);
      device = await this.prisma.device.create({
        data: {
          deviceId: dto.device_id,
          status: 'ACTIVE',
          lastSeen: new Date(),
          batteryLevel: dto.battery_level,
          storageFree: dto.storage_free,
          playerStatus: dto.player_status,
        },
      });
    } else {
      await this.prisma.device.update({
        where: { deviceId: dto.device_id },
        data: {
          lastSeen: new Date(),
          batteryLevel: dto.battery_level,
          storageFree: dto.storage_free,
          playerStatus: dto.player_status,
        },
      });
    }
    
    // Check if tablet is blocked
    const { blocked, reason } = await this.checkSubscriptionStatus(dto.device_id);

    // Record the heartbeat
    await this.prisma.deviceHeartbeat.create({
      data: {
        deviceId: dto.device_id,
        batteryLevel: dto.battery_level,
        storageFree: dto.storage_free,
        timestamp: new Date(),
      },
    });

    return { success: true, blocked, reason };
  }

  private async checkSubscriptionStatus(deviceId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { deviceId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { dueDate: 'desc' },
          take: 1,
        },
      },
    });

    if (driver) {
      const activeSubscription = driver.subscriptions[0];

      if (!activeSubscription) {
        this.logger.warn(`⛔ Device ${deviceId}: driver ${driver.fullName} has NO active subscription`);
        return { blocked: true, reason: 'no_subscription' };
      }

      if (activeSubscription.dueDate < new Date()) {
        this.logger.warn(`⛔ Device ${deviceId}: subscription expired on ${activeSubscription.dueDate.toISOString()}`);
        
        await this.prisma.subscription.update({
          where: { id: activeSubscription.id },
          data: { status: 'EXPIRED' },
        });

        await this.prisma.driver.update({
          where: { id: driver.id },
          data: { status: 'SUSPENDED', blockedAt: new Date() },
        });

        return { blocked: true, reason: 'payment_overdue' };
      }
    }

    return { blocked: false };
  }

  async recordPlayback(dto: PlaybackConfirmationDto) {
    this.logger.log(`Playback confirmed on device: ${dto.device_id} for video: ${dto.video_id}`);
    
    // Updates the device's last playback time (and last seen time)
    await this.prisma.device.updateMany({
      where: { deviceId: dto.device_id },
      data: {
        lastPlayback: new Date(dto.timestamp),
        lastSeen: new Date(),
      },
    });

    // Record the playback event in the database for tracking/analytics
    return this.prisma.playbackEvent.create({
      data: {
        deviceId: dto.device_id,
        videoId: dto.video_id,
        eventType: 'play_confirm',
        timestamp: new Date(dto.timestamp),
        lat: dto.lat,
        lng: dto.lng,
      },
    });
  }

  async syncDeviceCampaigns(deviceId: string, lastHash?: string) {
    if (deviceId) {
      await this.prisma.device.updateMany({
        where: { deviceId },
        data: { 
          lastSync: new Date(), 
          lastSeen: new Date(),
          lastOnline: new Date()
        },
      });
    }

    const { blocked, reason } = await this.checkSubscriptionStatus(deviceId);
    if (blocked) return { blocked, reason };

    // ============================================
    // REMOTE COMMANDS — Fetch pending tasks
    // ============================================
    const pendingCommands = await this.prisma.deviceCommand.findMany({
      where: { 
        device: { deviceId }, 
        status: 'PENDING',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      select: {
        id: true,
        commandType: true,
        commandParams: true,
      }
    });

    if (pendingCommands.length > 0) {
      this.logger.log(`📤 Sending ${pendingCommands.length} pending commands to Device ${deviceId}`);
      // Mark as PROCESSING so we don't send them multiple times if sync is fast
      await this.prisma.deviceCommand.updateMany({
        where: { id: { in: pendingCommands.map(c => c.id) } },
        data: { status: 'PROCESSING' }
      });
    }

    const payload = await this.campaignService.getActiveSyncVideos(deviceId);

    // ============================================
    // DELTA SYNC LOGIC
    // ============================================
    if (lastHash && lastHash === payload.sync_hash) {
      this.logger.log(`🔄 Device ${deviceId}: Delta Sync matches (${lastHash}). No update needed.`);
      return { 
        update: false, 
        blocked: false,
        sync_hash: payload.sync_hash 
      };
    }

    if (!payload.media_assets || payload.media_assets.length === 0) {
      return { 
        update: true, 
        blocked: false, 
        media_assets: [], 
        sync_hash: 'empty' 
      };
    }

    this.logger.log(`📥 Device ${deviceId}: New sync payload available (${payload.sync_hash})`);

    return {
      update: true,
      blocked: false,
      sync_hash: payload.sync_hash,
      campaign_version: payload.version,
      media_assets: payload.media_assets,
      commands: pendingCommands.map(c => ({
        id: c.id,
        type: c.commandType,
        params: c.commandParams ? JSON.parse(c.commandParams) : {}
      }))
    };
  }

  async acknowledgeCommand(commandId: string, result: any) {
    this.logger.log(`📥 Command ${commandId} acknowledged with result: ${JSON.stringify(result)}`);
    return this.prisma.deviceCommand.update({
      where: { id: commandId },
      data: {
        status: 'EXECUTED',
        executedAt: new Date(),
        result: JSON.stringify(result)
      }
    });
  }
}
