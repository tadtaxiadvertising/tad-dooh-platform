import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { PlaybackConfirmationDto } from './dto/playback-confirmation.dto';
import { SyncDeviceDto } from './dto/sync-device.dto';
import { BulkSyncDto } from './dto/bulk-sync.dto';
import { CampaignService } from '../campaign/campaign.service';
import { FinanceService } from '../finance/finance.service';
import { throttledMap } from '../../utils/throttler.util';
import * as jwt from 'jsonwebtoken';

const MAX_SLOTS_PER_DEVICE = 15;

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'tad-default-secret-2026';

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
    const thirtyMinMs = 30 * 60 * 1000;

    // SRE FIX: Single batch query — eliminates N+1 problem (getDeviceSlots per device)
    // Was timing out after 25s due to serial throttledMap(N devices × campaign joins).
    const [devices, campaignAssignments] = await Promise.all([
      // 1. Fetch all non-pending devices with minimal fields
      this.prisma.device.findMany({
        where: { status: { not: 'PENDING' } },
        select: {
          id: true,
          deviceId: true,
          taxiNumber: true,
          status: true,
          lastSeen: true,
          batteryLevel: true,
          playerStatus: true,
          city: true,
          driver: {
            select: { id: true, fullName: true, subscriptionPaid: true }
          }
        }
      }),
      // 2. Count campaign assignments per device in one query
      (this.prisma as any).deviceCampaign.groupBy({
        by: ['device_id'],
        _count: { campaign_id: true }
      }).catch(() => []) // Graceful fallback — table may not exist in all envs
    ]);

    // Build a deviceId -> assignedCampaigns count map
    const slotMap = new Map<string, number>();
    for (const row of (campaignAssignments || [])) {
      slotMap.set(row.device_id, row._count?.campaign_id || 0);
    }

    return devices.map((d) => {
      const isOnline = !!(d.lastSeen && (now.getTime() - d.lastSeen.getTime() <= thirtyMinMs));
      const assignedSlots = slotMap.get(d.id) || 0;

      return {
        id: d.id,
        device_id: d.deviceId,
        deviceId: d.deviceId,
        taxi_number: d.taxiNumber,
        status: isOnline ? 'online' : (d.status === 'INACTIVE' ? 'inactive' : 'offline'),
        is_online: isOnline,
        battery_level: d.batteryLevel,
        occupied_slots: assignedSlots,
        available_slots: Math.max(0, MAX_SLOTS_PER_DEVICE - assignedSlots),
        max_slots: MAX_SLOTS_PER_DEVICE,
        player_status: d.playerStatus,
        last_seen: d.lastSeen,
        city: d.city || 'Santiago',
        driver_id: d.driver?.id || null,
        driver_name: d.driver?.fullName || 'No asignado',
        subscription_status: d.driver?.subscriptionPaid ? 'PAID' : 'PENDING'
      };
    });
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
      return { blocked: false, reason: undefined };
    }

    const { driver } = device;

    // [ACTUALIZADO]: Siempre permitir reproducción sin importar el estado de suscripción
    if (driver.subscriptionPaid && (!driver.subscriptionEnd || driver.subscriptionEnd >= new Date())) {
      return { blocked: false, reason: undefined };
    }

    // Suscripción expirada o no pagada - Registramos pero NO bloqueamos
    this.logger.warn(`⚠️ Device ${deviceId}: suscripción de ${driver.fullName} vencida o no pagada. Permitido por política TAD.`);
    
    // Trigger notification para administración (opcional)
    try {
      await this.financeService.notifyMorosidad(deviceId);
    } catch (e) {
      this.logger.error(`Failed to trigger morosidad notification for ${deviceId}: ${e.message}`);
    }

    return { blocked: false, reason: undefined }; // IMPORTANTE: Siempre desbloqueado
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

    // 2. Alert Logic (Critical Inactivity & Battery)
    if (batteryLevel !== undefined && batteryLevel < 15) {
      this.logger.warn(`🚨 [CRITICAL_BATTERY] Device ${deviceId} at ${batteryLevel}%`);
      await this.prisma.notification.create({
        data: {
          title: 'Batería Crítica detectada',
          message: `La tablet ${device.taxiNumber || deviceId} reporta un nivel crítico (${batteryLevel}%).`,
          type: 'CRITICAL',
          category: 'DEVICE',
          entityId: deviceId,
        }
      });
    }

    // Detect recovery from long offline (Re-entry alert)
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (deviceCheck.lastSeen && (new Date().getTime() - deviceCheck.lastSeen.getTime() > threeDaysMs)) {
      await this.prisma.notification.create({
        data: {
          title: 'Dispositivo Recuperado (+3D Offline)',
          message: `La tablet ${device.taxiNumber || deviceId} ha vuelto a conectar tras más de 3 días de inactividad crítica.`,
          type: 'SUCCESS',
          category: 'DEVICE',
          entityId: deviceId,
        }
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

    const licenseToken = jwt.sign(
      { 
        deviceId, 
        taxi: device.taxiNumber,
        type: 'OFFLINE_LICENSE',
        iat: Math.floor(Date.now() / 1000)
      }, 
      this.JWT_SECRET, 
      { expiresIn: '48h' }
    );

    return {
      update: true,
      blocked: false,
      licenseToken,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
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

  async processBulkSync(dto: BulkSyncDto) {
    this.logger.log(`🔄 [BULK_SYNC] Processing batch from device: ${dto.device_id}`);
    
    // 1. Validate Device
    const device = await this.prisma.device.findUnique({
      where: { deviceId: dto.device_id }
    });

    if (!device) {
      this.logger.warn(`BulkSync from unknown device: ${dto.device_id}`);
      return { success: false, reason: 'unknown_device' };
    }

    if (device.status === 'PENDING') {
      return { success: false, reason: 'awaiting_approval' };
    }

    // 2. Update Heartbeat / Telemetry
    await this.prisma.device.update({
      where: { deviceId: dto.device_id },
      data: {
        lastSeen: new Date(),
        batteryLevel: dto.battery_level ?? device.batteryLevel,
        storageFree: dto.storage_free ?? device.storageFree,
        isOnline: true,
      }
    });

    // 3. Batch insert Playback Events
    if (dto.playbacks && dto.playbacks.length > 0) {
      this.logger.log(`   -> Inserting ${dto.playbacks.length} playback events`);
      const playbackData = dto.playbacks.map(p => ({
        deviceId: dto.device_id,
        videoId: p.video_id,
        eventType: 'play_confirm',
        timestamp: new Date(p.timestamp),
        lat: p.lat,
        lng: p.lng
      }));
      await this.prisma.playbackEvent.createMany({
        data: playbackData,
        skipDuplicates: true
      });
      
      // Update lastPlayback
      await this.prisma.device.update({
         where: { deviceId: dto.device_id },
         data: { lastPlayback: new Date() }
      });
    }

    // 4. Batch insert Locations (GPS)
    if (dto.locations && dto.locations.length > 0 && device.driverId) {
      this.logger.log(`   -> Inserting ${dto.locations.length} location events`);
      const locationData = dto.locations.map(l => ({
        deviceId: dto.device_id,
        driverId: device.driverId,
        latitude: l.lat,
        longitude: l.lng,
        timestamp: new Date(l.timestamp)
      }));
      
      await this.prisma.driverLocation.createMany({
        data: locationData,
        skipDuplicates: true
      });

      // Update current known location
      const latestLoc = dto.locations[dto.locations.length - 1];
      if (latestLoc) {
        await this.prisma.device.update({
          where: { deviceId: dto.device_id },
          data: { lastLat: latestLoc.lat, lastLng: latestLoc.lng }
        });
      }
    }

    // Capture telemetry history
    await this.prisma.deviceHeartbeat.create({
      data: {
        deviceId: dto.device_id,
        batteryLevel: dto.battery_level,
        storageFree: dto.storage_free,
        timestamp: new Date(),
      },
    });

    return { success: true, processedPlaybacks: dto.playbacks?.length || 0, processedLocations: dto.locations?.length || 0 };
  }
}
