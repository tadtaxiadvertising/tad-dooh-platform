import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
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
        id: true,
        deviceId: true,
        taxiNumber: true,
        lastSeen: true,
        batteryLevel: true,
        playerStatus: true,
        storageFree: true,
        status: true,
        city: true,
        lastHeartbeat: true,
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
        ...d,
        id: d.id,
        device_id: d.deviceId,
        status: isOnline ? 'online' : (d.status === 'INACTIVE' ? 'inactive' : 'offline'),
        last_seen: d.lastSeen,
        battery_level: d.batteryLevel,
        player_status: d.playerStatus,
        storage_free: d.storageFree,
        is_online: isOnline
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
        id: true,
        deviceId: true,
        taxiNumber: true,
        city: true,
        lastSeen: true,
        lastLat: true,
        lastLng: true,
        status: true
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
          paid: !!subscription.paidAt,
          expiresAt: subscription.validUntil,
        } : null
,
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

  async registerDeviceByAdmin(placa: string, nombreChofer: string, providedDeviceId?: string) {
    const crypto = require('crypto');
    let deviceId = providedDeviceId?.trim();
    if (!deviceId) {
      deviceId = 'TAD-' + crypto.randomUUID().split('-')[0].toUpperCase();
    }
    
    // 1. Verificar simultáneamente Dispositivo y Driver (por ID o por Teléfono generado)
    const phone = 'PH-' + deviceId;
    
    const [existingDevice, existingDriver] = await Promise.all([
      this.prisma.device.findUnique({
        where: { deviceId },
        include: { driver: true }
      }),
      this.prisma.driver.findFirst({
        where: { 
          OR: [
            { deviceId },
            { phone }
          ]
        }
      })
    ]);

    // Lógica de Unión (Upsert):
    // Si ya existe el dispositivo, lo actualizamos.
    if (existingDevice) {
      const updated = await this.prisma.device.update({
        where: { deviceId },
        data: {
          taxiNumber: placa,
          status: 'ACTIVE',
          driver: existingDevice.driver 
            ? {
                update: {
                  fullName: nombreChofer,
                  licensePlate: placa,
                  taxiNumber: placa,
                  status: 'ACTIVE'
                }
              }
            : {
                // Si el dispositivo no tiene driver pero encontramos uno huérfano con este ID/Phone
                connectOrCreate: {
                  where: { phone },
                  create: {
                    fullName: nombreChofer,
                    phone: phone,
                    licensePlate: placa,
                    taxiNumber: placa,
                    deviceId: deviceId, // Vincular
                    status: 'ACTIVE'
                  }
                }
              }
        }
      });
      return { success: true, device_id: updated.deviceId, driver_name: nombreChofer, linked: true };
    }

    // 2. Si el dispositivo es nuevo pero el driver ya existía (ej: registro manual previo del chofer)
    if (existingDriver) {
      const device = await this.prisma.device.create({
        data: {
          deviceId,
          status: 'ACTIVE',
          taxiNumber: placa,
          driver: {
            connect: { id: existingDriver.id }
          }
        }
      });
      // Actualizar datos del driver vinculado
      await this.prisma.driver.update({
        where: { id: existingDriver.id },
        data: { fullName: nombreChofer, status: 'ACTIVE', deviceId }
      });
      return { success: true, device_id: device.deviceId, driver_name: nombreChofer, linked_driver: true };
    }

    // 3. Creación total desde cero
    const device = await this.prisma.device.create({
      data: {
        deviceId,
        status: 'ACTIVE',
        taxiNumber: placa,
        appVersion: '3.0.0',
        lastSeen: new Date(),
        driver: {
          create: {
            fullName: nombreChofer,
            phone: phone,
            licensePlate: placa,
            taxiNumber: placa,
            status: 'ACTIVE'
          }
        }
      }
    });

    return { 
      success: true, 
      device_id: device.deviceId,
      driver_name: nombreChofer,
      new_registration: true
    };
  }

  /**
   * Retorna las últimas ubicaciones con datos de chofer y dispositivo.
   * Usado por la pestaña de Rastreo GPS en el Dashboard Admin.
   */
  async getTrackingData() {
    const locations = await this.prisma.driverLocation.findMany({
      orderBy: { timestamp: 'desc' },
      take: 500,
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            taxiNumber: true,
            taxiPlate: true,
            licensePlate: true,
            status: true,
            subscriptionPaid: true,
          },
        },
        device: {
          select: {
            deviceId: true,
            taxiNumber: true,
            city: true,
            status: true,
            batteryLevel: true,
            lastSeen: true,
          },
        },
      },
    });

    return locations.map((loc) => ({
      id: loc.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      speed: loc.speed,
      timestamp: loc.timestamp,
      driver: loc.driver ? {
        id: loc.driver.id,
        name: loc.driver.fullName,
        phone: loc.driver.phone,
        taxiNumber: loc.driver.taxiNumber || loc.driver.licensePlate,
        plate: loc.driver.taxiPlate || loc.driver.licensePlate,
        status: loc.driver.status,
        subscriptionPaid: loc.driver.subscriptionPaid,
      } : null,
      device: loc.device ? {
        deviceId: loc.device.deviceId,
        taxiNumber: loc.device.taxiNumber,
        city: loc.device.city,
        status: loc.device.status,
        batteryLevel: loc.device.batteryLevel,
        lastSeen: loc.device.lastSeen,
      } : null,
    }));
  }

  /**
   * Retorna un resumen por chofer: total de puntos GPS, última ubicación, velocidad promedio.
   */
  async getTrackingSummary() {
    try {
      // 1. Obtener todos los drivers con su tablet vinculada
      const drivers = await this.prisma.driver.findMany({
        where: { deviceId: { not: null } },
        include: {
          device: {
            select: {
              deviceId: true,
              taxiNumber: true,
              city: true,
              batteryLevel: true,
              lastSeen: true,
            },
          },
          locations: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      if (drivers.length === 0) return [];

      // 2. Contar puntos GPS de HOY (batch optimization)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const driverIds = drivers.map(d => d.id);

      const counts = await this.prisma.driverLocation.groupBy({
        by: ['driverId'],
        _count: { id: true },
        _avg: { speed: true },
        where: {
          driverId: { in: driverIds },
          timestamp: { gte: todayStart },
        },
      });

      const countMap = new Map(counts.map((c) => [
        c.driverId, 
        { 
          count: c._count.id, 
          avgSpeed: c._avg?.speed || 0 
        }
      ]));

      // 3. Total histórico por chofer
      const totalCounts = await this.prisma.driverLocation.groupBy({
        by: ['driverId'],
        _count: { id: true },
        where: {
          driverId: { in: driverIds }
        }
      });
      const totalMap = new Map(totalCounts.map((c) => [c.driverId, c._count.id]));

      const now = new Date();
      const fiveMinMs = 5 * 60 * 1000;

      return drivers.map((d) => {
        const lastLocation = d.locations[0] || null;
        const todayStats = countMap.get(d.id) || { count: 0, avgSpeed: 0 };
        const totalPoints = totalMap.get(d.id) || 0;
        
        // Determinar si está activo (señal en los últimos 5 minutos)
        const isActive = lastLocation
          ? (now.getTime() - new Date(lastLocation.timestamp).getTime()) < fiveMinMs
          : false;

        return {
          driverId: d.id,
          driverName: d.fullName,
          phone: d.phone,
          taxiNumber: d.taxiNumber || d.licensePlate,
          plate: d.taxiPlate || d.licensePlate,
          status: d.status,
          subscriptionPaid: d.subscriptionPaid,
          device: d.device ? {
            deviceId: d.device.deviceId,
            taxiNumber: d.device.taxiNumber,
            city: d.device.city,
            batteryLevel: d.device.batteryLevel,
            lastSeen: d.device.lastSeen,
          } : null,
          tracking: {
            isActive,
            pointsToday: todayStats.count,
            totalPoints,
            avgSpeedToday: typeof todayStats.avgSpeed === 'number' ? parseFloat(todayStats.avgSpeed.toFixed(1)) : 0,
            lastPosition: lastLocation ? {
              lat: lastLocation.latitude,
              lng: lastLocation.longitude,
              speed: lastLocation.speed || 0,
              timestamp: lastLocation.timestamp,
            } : null,
          },
        };
      });
    } catch (error) {
      console.error('CRITICAL: Error in getTrackingSummary:', error);
      throw new HttpException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error al procesar el resumen de rastreo.',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async trackBatch(data: { driverId?: string; deviceId: string; locations: any[] }) {
    const device = await this.prisma.device.findUnique({
      where: { deviceId: data.deviceId },
      include: { driver: true }
    });

    if (!device?.driver) {
      throw new HttpException({
        status: HttpStatus.NOT_FOUND,
        error: 'Dispositivo no registrado o sin chofer asignado.',
        code: 'NOT_FOUND'
      }, HttpStatus.NOT_FOUND);
    }

    const resolvedDriverId = data.driverId || device.driver.id;

    // 1. VALIDACIÓN DE REGLA DE NEGOCIO: Suscripción Activa
    // Verificamos tanto el flag manual del chofer como la entidad Subscription
    const isPaidManual = device.driver.subscriptionPaid;
    
    const sub = await this.prisma.subscription.findUnique({
      where: { deviceId: data.deviceId },
    });

    const isSubActive = sub && sub.status === 'ACTIVE' && (!sub.validUntil || new Date() <= sub.validUntil);

    if (!isPaidManual && !isSubActive) {
      throw new HttpException({
        status: HttpStatus.PAYMENT_REQUIRED,
        error: 'Acceso denegado: Suscripción de RD$6,000 pendiente o vencida.',
        code: 'PAYMENT_REQUIRED'
      }, HttpStatus.PAYMENT_REQUIRED);
    }

    // 2. GUARDADO MASIVO
    const records = data.locations.map(loc => ({
      driverId: resolvedDriverId,
      deviceId: data.deviceId,
      latitude: loc.lat,
      longitude: loc.lng,
      speed: loc.speed || 0,
      timestamp: new Date(loc.ts)
    }));

    if (records.length > 0) {
      await this.prisma.driverLocation.createMany({
        data: records
      });
    }

    return { success: true, count: records.length, driverId: resolvedDriverId };
  }

  /**
   * TAREA A: Backend Refactor - Batch Status Summary
   * Devuelve un resumen de todos los dispositivos con sus slots ocupados en una sola consulta.
   * Elimina la necesidad de 100+ peticiones individuales desde el frontend.
   */
  async getFleetStatusSummary() {
    const now = new Date();
    
    // 1. Obtener conteo de campañas globales vigentes
    const globalCampaignsCount = await this.prisma.campaign.count({
      where: {
        active: true,
        targetAll: true,
        startDate: { lte: now },
        endDate: { gte: now },
      }
    });

    // 2. Obtener todos los dispositivos con sus relaciones necesarias en un query optimizado
    const devices = await this.prisma.device.findMany({
      include: {
        _count: {
          select: {
            campaigns: {
              where: {
                campaign: {
                  active: true,
                  startDate: { lte: now },
                  endDate: { gte: now },
                }
              }
            }
          }
        },
        driver: {
          select: {
            fullName: true,
            status: true,
            subscriptionPaid: true,
          }
        }
      }
    });

    const thirtyMinMs = 30 * 60 * 1000;

    return devices.map(d => {
      const isOnline = d.lastSeen && (now.getTime() - d.lastSeen.getTime() <= thirtyMinMs);
      
      // Slots ocupados = Globales + Específicos asignados
      const assignedCount = d._count?.campaigns || 0;
      const totalSlots = Math.min(15, globalCampaignsCount + assignedCount);

      return {
        id: d.id,
        device_id: d.deviceId,
        taxi_number: d.taxiNumber,
        status: isOnline ? 'online' : (d.status === 'INACTIVE' ? 'inactive' : 'offline'),
        is_online: isOnline,
        battery_level: d.batteryLevel,
        occupied_slots: totalSlots,
        max_slots: 15,
        player_status: d.playerStatus,
        last_seen: d.lastSeen,
        driver_name: d.driver?.fullName || 'No asignado',
        subscription_status: d.driver?.subscriptionPaid ? 'PAID' : 'PENDING'
      };
    });
  }
}

