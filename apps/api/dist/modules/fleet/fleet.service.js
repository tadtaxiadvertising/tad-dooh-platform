"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FleetService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const device_service_1 = require("../device/device.service");
const supabase_service_1 = require("../supabase/supabase.service");
const business_rules_1 = require("../../common/constants/business-rules");
let FleetService = class FleetService {
    constructor(prisma, deviceService, supabaseService) {
        this.prisma = prisma;
        this.deviceService = deviceService;
        this.supabaseService = supabaseService;
    }
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
                storageUsed: true,
                storageTotal: true,
                appVersion: true,
                status: true,
                city: true,
                fleet: true,
                lastHeartbeat: true,
                lastPlayback: true,
                driver: {
                    select: {
                        fullName: true,
                        id: true,
                    }
                }
            },
            orderBy: {
                lastSeen: 'desc',
            }
        });
        const now = new Date();
        const tenMinMs = 10 * 60 * 1000;
        return devices.map((d) => {
            let isOnline = false;
            if (d.lastSeen && now.getTime() - d.lastSeen.getTime() <= tenMinMs) {
                isOnline = true;
            }
            return {
                ...d,
                id: d.id,
                device_id: d.deviceId,
                status: isOnline ? 'online' : (d.status === business_rules_1.BUSINESS_RULES.STATUS.DEVICE.SUSPENDED ? 'inactive' : 'offline'),
                last_seen: d.lastSeen,
                battery_level: d.batteryLevel,
                player_status: d.playerStatus,
                storage_free: d.storageFree,
                storage_used: d.storageUsed ? Number(d.storageUsed) : null,
                storage_total: d.storageTotal ? Number(d.storageTotal) : null,
                is_online: isOnline,
                driver_name: d.driver?.fullName || 'Sín Conductor',
                last_playback: d.lastPlayback,
            };
        });
    }
    async getFleetStats() {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
        const [total, online, withErrors] = await Promise.all([
            this.prisma.device.count(),
            this.prisma.device.count({
                where: { lastSeen: { gte: tenMinAgo } }
            }),
            this.prisma.device.count({
                where: {
                    playerStatus: {
                        not: null,
                    },
                    NOT: {
                        playerStatus: {
                            in: ['playing', '']
                        }
                    }
                }
            })
        ]);
        return {
            total,
            online,
            offline: total - online,
            withErrors
        };
    }
    async getFleetMap(advertiserId) {
        try {
            const now = new Date();
            const onlineWindowMs = 90 * 1000;
            const where = {};
            if (advertiserId) {
                where.campaigns = {
                    some: {
                        campaign: {
                            advertiserId: advertiserId,
                            active: true,
                            startDate: { lte: now },
                            endDate: { gte: now },
                        }
                    }
                };
            }
            const devices = await this.prisma.device.findMany({
                where,
                select: {
                    id: true,
                    deviceId: true,
                    driverId: true,
                    taxiNumber: true,
                    city: true,
                    lastSeen: true,
                    lastLat: true,
                    lastLng: true,
                    status: true,
                    driver: {
                        select: {
                            id: true,
                            fullName: true,
                            taxiPlate: true,
                            licensePlate: true,
                            status: true,
                            subscriptionPaid: true,
                            subscriptionEnd: true,
                        }
                    },
                    locations: {
                        orderBy: { timestamp: 'desc' },
                        take: 1,
                        select: {
                            latitude: true,
                            longitude: true,
                            speed: true,
                            timestamp: true,
                        },
                    }
                }
            });
            return devices.map(d => {
                const lastLocation = d.locations[0] || null;
                const lastLat = d.lastLat ?? lastLocation?.latitude ?? null;
                const lastLng = d.lastLng ?? lastLocation?.longitude ?? null;
                const lastSeen = d.lastSeen ?? lastLocation?.timestamp ?? null;
                const isOnline = !!(lastSeen && (now.getTime() - new Date(lastSeen).getTime()) <= onlineWindowMs);
                let subscriptionStatus = 'PENDING';
                if (d.driver) {
                    if (d.driver.subscriptionPaid) {
                        const notExpired = !d.driver.subscriptionEnd || d.driver.subscriptionEnd > now;
                        subscriptionStatus = notExpired ? 'ACTIVE' : 'EXPIRED';
                    }
                    else {
                        subscriptionStatus = d.driver.status || 'PENDING';
                    }
                }
                return {
                    driverId: d.driver?.id ?? d.driverId ?? null,
                    deviceId: d.deviceId,
                    taxiNumber: d.taxiNumber ?? null,
                    city: d.city ?? null,
                    lastSeen,
                    lastLat,
                    lastLng,
                    status: d.status,
                    isOnline,
                    driverName: d.driver?.fullName ?? null,
                    plate: d.driver?.taxiPlate ?? d.driver?.licensePlate ?? null,
                    subscriptionStatus,
                    speed: lastLocation?.speed ?? null,
                };
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const logger = new common_1.Logger('FleetService');
            logger.error(`[FleetService] getFleetMap() failed — returning empty array: ${errorMessage}`);
            return [];
        }
    }
    async getOfflineDevices() {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
        return this.prisma.device.findMany({
            where: {
                OR: [
                    { lastSeen: { lt: tenMinAgo } },
                    { lastSeen: null }
                ]
            },
            select: {
                deviceId: true,
                taxiNumber: true,
                lastSeen: true,
            }
        });
    }
    async getFleetFinance() {
        const RATE_PER_AD = 1.25;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
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
        const playsMap = new Map();
        for (const row of playbackCounts) {
            playsMap.set(row.deviceId, row._count.id);
        }
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
        const tenMinMs = 10 * 60 * 1000;
        const fleetFinance = devices.map((d) => {
            const isOnline = d.lastSeen && now.getTime() - d.lastSeen.getTime() <= tenMinMs;
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
    async sendCommand(deviceId, type, params = {}) {
        return this.prisma.deviceCommand.create({
            data: {
                deviceId: (await this.prisma.device.findUnique({ where: { deviceId } }))?.id || deviceId,
                commandType: type,
                commandParams: JSON.stringify(params || {}),
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }
        });
    }
    async registerDeviceByAdmin(placa, nombreChofer, providedDeviceId) {
        const crypto = require('crypto');
        let deviceId = providedDeviceId?.trim();
        if (!deviceId) {
            deviceId = 'TAD-' + crypto.randomUUID().split('-')[0].toUpperCase();
        }
        const phone = 'PH-' + deviceId;
        const [existingDevice, existingDriver] = await Promise.all([
            this.prisma.device.findUnique({
                where: { deviceId },
                include: { driver: true }
            }),
            this.prisma.driver.findFirst({
                where: {
                    OR: [
                        { devices: { some: { deviceId } } },
                        { phone }
                    ]
                }
            })
        ]);
        if (existingDevice) {
            const updated = await this.prisma.device.update({
                where: { deviceId },
                data: {
                    taxiNumber: placa,
                    status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
                    driver: existingDevice.driver
                        ? {
                            update: {
                                fullName: nombreChofer,
                                licensePlate: placa,
                                taxiNumber: placa,
                                status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE
                            }
                        }
                        : {
                            connectOrCreate: {
                                where: { phone },
                                create: {
                                    fullName: nombreChofer,
                                    phone: phone,
                                    licensePlate: placa,
                                    taxiNumber: placa,
                                    status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE
                                }
                            }
                        }
                }
            });
            return { success: true, device_id: updated.deviceId, driver_name: nombreChofer, linked: true };
        }
        if (existingDriver) {
            const device = await this.prisma.device.create({
                data: {
                    deviceId,
                    status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
                    taxiNumber: placa,
                    driver: {
                        connect: { id: existingDriver.id }
                    }
                }
            });
            await this.prisma.driver.update({
                where: { id: existingDriver.id },
                data: { fullName: nombreChofer, status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE }
            });
            return { success: true, device_id: device.deviceId, driver_name: nombreChofer, linked_driver: true };
        }
        const device = await this.prisma.device.create({
            data: {
                deviceId,
                status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
                taxiNumber: placa,
                appVersion: '3.0.0',
                lastSeen: new Date(),
                driver: {
                    create: {
                        fullName: nombreChofer,
                        phone: phone,
                        licensePlate: placa,
                        taxiNumber: placa,
                        status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE
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
    async getTrackingSummary(advertiserId) {
        try {
            const where = { devices: { some: {} } };
            if (advertiserId) {
                where.devices = {
                    some: {
                        campaigns: {
                            some: {
                                campaign: {
                                    advertiserId: advertiserId
                                }
                            }
                        }
                    }
                };
            }
            const drivers = await this.prisma.driver.findMany({
                where,
                include: {
                    devices: {
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
            if (drivers.length === 0)
                return [];
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const driverIds = drivers.map(d => d.id);
            let countMap = new Map();
            let totalMap = new Map();
            try {
                const [counts, totalCounts] = await Promise.all([
                    this.prisma.driverLocation.groupBy({
                        by: ['driverId'],
                        _count: { id: true },
                        _avg: { speed: true },
                        where: {
                            driverId: { in: driverIds },
                            timestamp: { gte: todayStart },
                        },
                    }),
                    this.prisma.driverLocation.groupBy({
                        by: ['driverId'],
                        _count: { id: true },
                        where: { driverId: { in: driverIds } },
                    }),
                ]);
                countMap = new Map(counts.map((c) => [
                    c.driverId,
                    {
                        count: c._count.id,
                        avgSpeed: c._avg?.speed ?? 0
                    }
                ]));
                totalMap = new Map(totalCounts.map((c) => [c.driverId, c._count.id]));
            }
            catch (groupByError) {
                const errorMessage = groupByError instanceof Error ? groupByError.message : String(groupByError);
                const logger = new common_1.Logger('FleetService');
                logger.warn(`[FleetService] groupBy on driverLocation failed, degrading gracefully: ${errorMessage}`);
            }
            const now = new Date();
            const fiveMinMs = 5 * 60 * 1000;
            return drivers.map((d) => {
                const lastLocation = d.locations[0] || null;
                const todayStats = countMap.get(d.id) || { count: 0, avgSpeed: 0 };
                const totalPoints = totalMap.get(d.id) || 0;
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
                    devicesCount: d.devices.length,
                    device: d.devices[0] ? {
                        deviceId: d.devices[0].deviceId,
                        taxiNumber: d.devices[0].taxiNumber,
                        city: d.devices[0].city,
                        batteryLevel: d.devices[0].batteryLevel,
                        lastSeen: d.devices[0].lastSeen,
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const logger = new common_1.Logger('FleetService');
            logger.error(`CRITICAL: Error in getTrackingSummary: ${errorMessage}`);
            return [];
        }
    }
    async broadcastCommand(type, params = {}) {
        common_1.Logger.log(`[FLEET_C2] Broadcasting global command: ${type}`);
        await this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
            command: type,
            params,
            timestamp: new Date().toISOString()
        }).catch(e => common_1.Logger.error(`[FLEET_C2] Realtime broadcast failed: ${e.message}`));
        const activeDevices = await this.prisma.device.findMany({
            where: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
            select: { id: true }
        });
        if (activeDevices.length > 0) {
            await this.prisma.deviceCommand.createMany({
                data: activeDevices.map(d => ({
                    deviceId: d.id,
                    commandType: type,
                    commandParams: JSON.stringify(params),
                    status: 'PENDING',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }))
            });
        }
        return {
            success: true,
            broadcastType: type,
            deviceCount: activeDevices.length
        };
    }
    async getFleetStatusSummary() {
        return this.deviceService.getFleetStatusSummary();
    }
    async getDeviceRecentPath(deviceId) {
        const locations = await this.prisma.driverLocation.findMany({
            where: { deviceId },
            orderBy: { timestamp: 'desc' },
            take: 60,
            select: {
                latitude: true,
                longitude: true,
                speed: true,
                timestamp: true
            }
        });
        return locations;
    }
    async ingestTelemetryBatch(data) {
        const logger = new common_1.Logger('FleetService');
        if (!data?.points || data.points.length === 0) {
            logger.warn(`⚠️ Telemetry batch with 0 points from driver [${data?.driverId ?? 'unknown'}]`);
            return { count: 0 };
        }
        const [driver, device] = await Promise.all([
            this.prisma.driver.findUnique({
                where: { id: data.driverId },
                select: { id: true, subscriptionPaid: true, status: true, fullName: true },
            }),
            this.prisma.device.findUnique({
                where: { deviceId: data.deviceId },
                select: { id: true, deviceId: true },
            }),
        ]);
        if (!driver) {
            logger.warn(`⚠️ Telemetry Rejected: Driver [${data.driverId}] not found.`);
            throw new common_1.HttpException('Driver Not Found', common_1.HttpStatus.NOT_FOUND);
        }
        if (!device) {
            logger.warn(`⚠️ Telemetry Rejected: Device [${data.deviceId}] not found.`);
            throw new common_1.HttpException('Device Not Found', common_1.HttpStatus.NOT_FOUND);
        }
        if (driver.status !== business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE || !driver.subscriptionPaid) {
            logger.warn(`🚫 Telemetry Rejected (402): Driver [${driver.fullName}] is delinquent or inactive.`);
            throw new common_1.HttpException('Payment Required - Subscription Inactive', common_1.HttpStatus.PAYMENT_REQUIRED);
        }
        const telemetryData = data.points.map(p => ({
            driverId: data.driverId,
            deviceId: data.deviceId,
            latitude: p.lat,
            longitude: p.lng,
            speed: p.speed,
            timestamp: new Date(p.timestamp),
        }));
        const result = await this.prisma.driverLocation.createMany({
            data: telemetryData,
            skipDuplicates: true,
        });
        logger.log(`✅ Telemetry Batch Processed: ${result.count} points from [${driver.fullName}] (input=${telemetryData.length})`);
        if (data.points.length > 0) {
            const lastPoint = data.points.reduce((a, b) => (b.timestamp > a.timestamp) ? b : a, data.points[0]);
            try {
                await this.prisma.device.update({
                    where: { deviceId: data.deviceId },
                    data: {
                        lastSeen: new Date(),
                        lastLat: lastPoint.lat,
                        lastLng: lastPoint.lng,
                    }
                });
                logger.debug(`[FleetService] Device snapshot updated: ${data.deviceId} → (${lastPoint.lat}, ${lastPoint.lng}) @ ${new Date(lastPoint.timestamp).toISOString()}`);
            }
            catch (e) {
                const errMessage = e instanceof Error ? e.message : String(e);
                logger.error(`Failed to update device status (snapshot): ${errMessage}`);
            }
        }
        return { count: result.count, input: telemetryData.length };
    }
};
exports.FleetService = FleetService;
exports.FleetService = FleetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        device_service_1.DeviceService,
        supabase_service_1.SupabaseService])
], FleetService);
//# sourceMappingURL=fleet.service.js.map