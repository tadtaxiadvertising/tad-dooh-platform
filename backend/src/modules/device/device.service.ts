import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { PlaybackConfirmationDto } from './dto/playback-confirmation.dto';
import { CampaignService } from '../campaign/campaign.service';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignService: CampaignService,
  ) {}

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

    // Record the heartbeat
    return this.prisma.deviceHeartbeat.create({
      data: {
        deviceId: dto.device_id,
        batteryLevel: dto.battery_level,
        storageFree: dto.storage_free,
        timestamp: new Date(),
      },
    });
  }

  async recordPlayback(dto: PlaybackConfirmationDto) {
    this.logger.log(`Playback confirmed on device: ${dto.device_id} for video: ${dto.video_id}`);
    
    // Updates the device's last playback time (and last seen time)
    return this.prisma.device.updateMany({
      where: { deviceId: dto.device_id },
      data: {
        lastPlayback: new Date(dto.timestamp),
        lastSeen: new Date(),
      },
    });
  }

  async syncDeviceCampaigns(deviceId: string) {
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

    // ============================================
    // SUBSCRIPTION CHECK — Block if payment overdue
    // ============================================
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

    // If device has a driver assigned, check their subscription
    if (driver) {
      const activeSubscription = driver.subscriptions[0];

      if (!activeSubscription) {
        this.logger.warn(`⛔ Device ${deviceId}: driver ${driver.fullName} has NO active subscription`);
        return { blocked: true, reason: 'no_subscription' };
      }

      if (activeSubscription.dueDate < new Date()) {
        this.logger.warn(`⛔ Device ${deviceId}: subscription expired on ${activeSubscription.dueDate.toISOString()}`);
        
        // Mark subscription as expired
        await this.prisma.subscription.update({
          where: { id: activeSubscription.id },
          data: { status: 'EXPIRED' },
        });

        // Mark driver as suspended
        await this.prisma.driver.update({
          where: { id: driver.id },
          data: { status: 'SUSPENDED', blockedAt: new Date() },
        });

        return { blocked: true, reason: 'payment_overdue' };
      }

      this.logger.log(`✅ Device ${deviceId}: subscription valid until ${activeSubscription.dueDate.toISOString()}`);
    }
    // If no driver assigned, allow sync (grace period for new devices being set up)

    const payload = await this.campaignService.getActiveSyncVideos(deviceId);

    if (!payload.media_assets || payload.media_assets.length === 0) {
      return { update: false, blocked: false };
    }

    return {
      blocked: false,
      campaign_version: payload.version,
      media_assets: payload.media_assets,
    };
  }
}
