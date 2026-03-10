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

  /**
   * Real financial data: playback counts per device + subscription status.
   * Replaces all simulated/hardcoded finance calculations.
   */
  async getFleetFinance() {
    const RATE_PER_AD = 1.25; // RD$ per 30s ad play

    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Count real playback events per device for this month
    const playbackCounts = await this.prisma.playbackEvent.groupBy({
      by: ['deviceId'],
      _count: { id: true },
      where: {
        timestamp: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Build a map: deviceId -> playCount
    const playsMap = new Map<string, number>();
    for (const row of playbackCounts) {
      playsMap.set(row.deviceId, row._count.id);
    }

    // Get all devices with driver + subscription info
    const devices = await this.prisma.device.findMany({
      include: {
        driver: {
          include: {
            subscriptions: {
              where: { status: 'ACTIVE' },
              orderBy: { dueDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const thirtyMinMs = 30 * 60 * 1000;

    const fleetFinance = devices.map((d) => {
      const isOnline = d.lastSeen && now.getTime() - d.lastSeen.getTime() <= thirtyMinMs;
      const adsPlayed = playsMap.get(d.deviceId) || 0;
      const revenue = parseFloat((adsPlayed * RATE_PER_AD).toFixed(2));
      const subscription = d.driver?.subscriptions?.[0] || null;

      return {
        device_id: d.deviceId,
        display_name: d.taxiNumber || d.name || `TAXI-${d.deviceId.slice(0, 8).toUpperCase()}`,
        city: d.city || 'Santo Domingo',
        status: isOnline ? 'online' : 'offline',
        ads_played: adsPlayed,
        revenue,
        driver: d.driver ? {
          name: d.driver.fullName,
          phone: d.driver.phone,
          status: d.driver.status,
        } : null,
        subscription: subscription ? {
          plan: subscription.plan,
          amount: subscription.amount,
          status: subscription.status,
          due_date: subscription.dueDate,
          paid: !!subscription.paidDate,
        } : null,
      };
    });

    const totalRevenue = fleetFinance.reduce((sum, d) => sum + d.revenue, 0);
    const totalAds = fleetFinance.reduce((sum, d) => sum + d.ads_played, 0);

    return {
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      rate_per_ad: RATE_PER_AD,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      total_ads_played: totalAds,
      devices: fleetFinance.sort((a, b) => b.revenue - a.revenue),
    };
  }

  async sendCommand(deviceId: string, type: string, params: any) {
    return this.prisma.deviceCommand.create({
      data: {
        deviceId: (await this.prisma.device.findUnique({ where: { deviceId } }))?.id || deviceId,
        commandType: type,
        commandParams: JSON.stringify(params || {}),
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h default
      }
    });
  }

  async registerDeviceByAdmin(placa: string, nombreChofer: string) {
    const crypto = require('crypto');
    const deviceId = 'TAD-' + crypto.randomUUID().split('-')[0].toUpperCase();
    
    // Create unit dynamically, discarding legacy burn-in tags
    const device = await this.prisma.device.create({
      data: {
        deviceId,
        status: 'ACTIVE',
        taxiNumber: placa,
        appVersion: '2.1.3',
        lastSeen: new Date(),
        driver: {
          create: {
            fullName: nombreChofer,
            phone: 'PH-' + deviceId, // Bypass unique phone constraint for rapid testing scaling
            licensePlate: placa,
            taxiNumber: placa,
          }
        }
      }
    });

    return { 
      success: true, 
      device_id: device.deviceId,
      driver_name: nombreChofer,
      taxi_number: placa 
    };
  }
}

