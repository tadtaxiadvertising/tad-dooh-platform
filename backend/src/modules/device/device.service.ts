import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { PlaybackConfirmationDto } from './dto/playback-confirmation.dto';
import { SyncDeviceDto } from './dto/sync-device.dto';
import { CampaignService } from '../campaign/campaign.service';
import { FinanceService } from '../finance/finance.service';

const MAX_SLOTS_PER_DEVICE = 15;

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignService: CampaignService,
    private readonly financeService: FinanceService,
  ) {}

  /**
   * Calculates availability slots for a device.
   * Based on current dynamic playlist generation.
   */
  async getDeviceSlots(deviceId: string) {
    try {
      const device = await this.prisma.device.findUnique({ where: { deviceId } });
      if (!device) throw new Error('Device not found');
      
      const payload = await this.campaignService.getActiveSyncVideos(deviceId, device.city || 'Santiago');
      const occupied = payload.media_assets?.length || 0;

      return {
        device_id: deviceId,
        max_slots: MAX_SLOTS_PER_DEVICE,
        assigned_slots: occupied,
        available_slots: Math.max(0, MAX_SLOTS_PER_DEVICE - occupied),
        usage_percentage: Math.round((occupied / MAX_SLOTS_PER_DEVICE) * 100)
      };
    } catch (error) {
      this.logger.warn(`⚠️ getDeviceSlots(${deviceId}): ${error?.message}`);
      return {
        device_id: deviceId,
        max_slots: MAX_SLOTS_PER_DEVICE,
        assigned_slots: 0,
        available_slots: MAX_SLOTS_PER_DEVICE,
        usage_percentage: 0
      };
    }
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
          driverId: dto.driver_id ?? undefined,
        },
      });
    }

    this.logger.log(`Registering new device (PENDING approval): ${dto.device_id}`);
    return this.prisma.device.create({
      data: {
        deviceId: dto.device_id,
        appVersion: dto.app_version,
        status: 'PENDING',          // 🔒 Requires admin approval before joining fleet
        lastSeen: new Date(),
        driverId: dto.driver_id,
      },
    });
  }

  /** Returns all devices that have PENDING approval — for the admin dashboard. */
  async getPendingDevices() {
    return this.prisma.device.findMany({
      where: { status: 'PENDING' },
      orderBy: { lastSeen: 'desc' },
      select: { id: true, deviceId: true, appVersion: true, lastSeen: true },
    });
  }

  /** Admin approves a device — sets it ACTIVE so it can join the fleet. */
  async approveDevice(deviceId: string) {
    this.logger.log(`✅ Admin approved device: ${deviceId}`);
    return this.prisma.device.update({
      where: { deviceId },
      data: { status: 'ACTIVE' },
    });
  }

  /** Admin rejects/deletes a phantom device. */
  async rejectDevice(deviceId: string) {
    this.logger.warn(`🗑️ Admin rejected device: ${deviceId}`);
    return this.prisma.device.delete({ where: { deviceId } });
  }

  async getFleetStatusSummary() {
    const now = new Date();

    // Only show ACTIVE devices in the fleet — PENDING devices are excluded
    const devices = await this.prisma.device.findMany({
      where: { status: { not: 'PENDING' } },
      include: {
        driver: {
          select: { id: true, fullName: true, status: true, subscriptionPaid: true }
        }
      }
    });

    const thirtyMinMs = 30 * 60 * 1000;
    
    // Process in parallel to be fast
    const fleetStatus = await Promise.all(devices.map(async d => {
      const isOnline = d.lastSeen && (now.getTime() - d.lastSeen.getTime() <= thirtyMinMs);
      
      // Call the unified slot counter
      const slotsInfo = await this.getDeviceSlots(d.deviceId);

      return {
        id: d.id,
        device_id: d.deviceId,
        deviceId: d.deviceId,
        taxi_number: d.taxiNumber,
        status: isOnline ? 'online' : (d.status === 'INACTIVE' ? 'inactive' : 'offline'),
        is_online: isOnline,
        battery_level: d.batteryLevel,
        occupied_slots: slotsInfo.assigned_slots,
        available_slots: slotsInfo.available_slots,
        max_slots: MAX_SLOTS_PER_DEVICE,
        player_status: d.playerStatus,
        last_seen: d.lastSeen,
        city: d.city || 'Santiago',
        driver_id: d.driver?.id || null,
        driver_name: d.driver?.fullName || 'No asignado',
        subscription_status: d.driver?.subscriptionPaid ? 'PAID' : 'PENDING'
      };
    }));

    return fleetStatus;
  }

  async deviceHeartbeat(dto: HeartbeatDto) {
    // Make sure device exists first
    let device = await this.prisma.device.findUnique({
      where: { deviceId: dto.device_id },
    });

    if (!device) {
      // 🔒 Unknown device: register as PENDING (not ACTIVE) and block content
      this.logger.warn(`Heartbeat from unknown device: ${dto.device_id}. Registering as PENDING — awaiting admin approval.`);
      await this.prisma.device.create({
        data: {
          deviceId: dto.device_id,
          status: 'PENDING',
          lastSeen: new Date(),
          batteryLevel: dto.battery_level,
          storageFree: dto.storage_free,
          playerStatus: dto.player_status,
        },
      });
      // Return blocked so the tablet does not receive content
      return { success: true, blocked: true, reason: 'awaiting_approval' };
    } else if (device.status === 'PENDING') {
      // Device exists but is still awaiting admin approval
      this.logger.log(`⏳ Heartbeat from PENDING device: ${dto.device_id}. Awaiting admin approval.`);
      await this.prisma.device.update({
        where: { deviceId: dto.device_id },
        data: { lastSeen: new Date() },
      });
      return { success: true, blocked: true, reason: 'awaiting_approval' };
    } else {
      await this.prisma.device.update({
        where: { deviceId: dto.device_id },
        data: {
          lastSeen: new Date(),
          batteryLevel: dto.battery_level,
          storageFree: dto.storage_free,
          playerStatus: dto.player_status,
          lastLat: dto.lat ?? undefined,
          lastLng: dto.lng ?? undefined,
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
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      include: { driver: true }
    });

    if (!device || !device.driver) {
      this.logger.log(`⚠️ Device ${deviceId}: Sin conductor vinculado (grace period).`);
      return { blocked: false };
    }

    const { driver } = device;

    // Validación basada en el registro consolidado del Driver
    if (driver.subscriptionPaid && (!driver.subscriptionEnd || driver.subscriptionEnd >= new Date())) {
      return { blocked: false };
    }

    // Suscripción expirada o no pagada
    this.logger.warn(`⛔ Device ${deviceId}: suscripción de ${driver.fullName} vencida o no pagada.`);
    
    // Trigger notification
    try {
      await this.financeService.notifyMorosidad(deviceId);
    } catch (e) {
      this.logger.error(`Failed to trigger morosidad notification for ${deviceId}: ${e.message}`);
    }

    return { blocked: true, reason: 'payment_overdue' };
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

  async syncDeviceCampaigns(dto: SyncDeviceDto) {
    const { deviceId, lat, lng, batteryLevel, lastHash } = dto;

    // 🔒 Block sync for PENDING devices
    const deviceCheck = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!deviceCheck) {
      return { blocked: true, reason: 'awaiting_approval', media_assets: [] };
    }
    if (deviceCheck.status === 'PENDING') {
      this.logger.log(`⏳ Sync blocked for PENDING device: ${deviceId}`);
      return { blocked: true, reason: 'awaiting_approval', media_assets: [] };
    }

    // 1. Update Telemetry & Health
    const device = await this.prisma.device.update({
      where: { deviceId },
      data: {
        lastLat: lat,
        lastLng: lng,
        batteryLevel: batteryLevel,
        lastSync: new Date(),
        isOnline: true,
      },
    });

    // 2. Alert Logic (Internal Log)
    if (batteryLevel !== undefined && batteryLevel < 15) {
      this.logger.warn(`🚨 [CRITICAL_BATTERY] Device ${deviceId} at ${batteryLevel}%`);
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

    // Capture device city for geofencing
    const deviceCity = device.city || 'Santiago';
    const payload = await this.campaignService.getActiveSyncVideos(deviceId, deviceCity);

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
