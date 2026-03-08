import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return all devices in the fleet, determining online/offline status logically.
   */
  async getFleetDevices() {
    const devices = await this.prisma.device.findMany({
      select: {
        deviceId: true,
        lastSeen: true,
        batteryLevel: true,
        playerStatus: true,
        storageFree: true,
      },
    });

    const now = new Date();
    // 30 min in ms
    const thirtyMinMs = 30 * 60 * 1000;

    return devices.map((d) => {
      let isOnline = false;
      if (d.lastSeen && now.getTime() - d.lastSeen.getTime() <= thirtyMinMs) {
        isOnline = true;
      }

      return {
        device_id: d.deviceId,
        status: isOnline ? 'online' : 'offline',
        last_seen: d.lastSeen,
        battery_level: d.batteryLevel,
        player_status: d.playerStatus,
        storage_free: d.storageFree,
      };
    });
  }

  async getFleetStats() {
    const devices = await this.prisma.device.findMany({
      select: {
        lastSeen: true,
        playerStatus: true,
        status: true
      }
    });

    const now = new Date();
    const thirtyMinMs = 30 * 60 * 1000;
    
    let online = 0;
    let offline = 0;
    let withErrors = 0;

    devices.forEach((d) => {
      const isOnline = d.lastSeen && now.getTime() - d.lastSeen.getTime() <= thirtyMinMs;
      if (isOnline) {
        online++;
      } else {
        offline++;
      }
      
      if (d.playerStatus && d.playerStatus !== 'playing') {
        withErrors++;
      }
    });

    return {
      total: devices.length,
      online,
      offline,
      withErrors
    };
  }

  async getFleetMap() {
    return this.prisma.device.findMany({
      select: {
        deviceId: true,
        taxiNumber: true,
        city: true,
        lastSeen: true,
      }
    });
  }

  async getOfflineDevices() {
    const devices = await this.getFleetDevices();
    return devices.filter(d => d.status === 'offline');
  }
}
