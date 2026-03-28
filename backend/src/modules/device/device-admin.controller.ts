import { Controller, Get, Delete, Param, Post, Put, Body, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceService } from './device.service';

@Controller('devices')
export class DeviceAdminController {
  private readonly logger = new Logger(DeviceAdminController.name);

  constructor(
    private prisma: PrismaService,
    private deviceService: DeviceService,
  ) {}

  // ─── PENDING DEVICE APPROVAL QUEUE ──────────────────────────────────────────

  /** List all devices awaiting admin approval */
  @Get('pending')
  getPendingDevices() {
    return this.deviceService.getPendingDevices();
  }

  /** Admin approves a device → sets it ACTIVE */
  @Post(':deviceId/approve')
  approveDevice(@Param('deviceId') deviceId: string) {
    return this.deviceService.approveDevice(deviceId);
  }

  /** Admin rejects a device → deletes it */
  @Delete(':deviceId/reject')
  rejectDevice(@Param('deviceId') deviceId: string) {
    return this.deviceService.rejectDevice(deviceId);
  }

  // Ver los anuncios asignados a un taxi específico
  @Get(':deviceId/campaigns')
  async getDeviceCampaigns(@Param('deviceId') paramId: string) {
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id: paramId }, { deviceId: paramId }] },
      select: { id: true }
    });

    if (!device) return [];

    const assignments = await this.prisma.deviceCampaign.findMany({
      where: { device_id: device.id },
      include: {
        campaign: true, 
      },
    });
    
    return assignments.map(a => ({
      ...a.campaign,
      assigned_at: a.assigned_at
    }));
  }

  // Quitar un anuncio de un taxi específico
  @Delete(':deviceId/campaigns/:campaignId')
  async removeCampaignFromDevice(
    @Param('deviceId') paramDeviceId: string,
    @Param('campaignId') campaignId: string
  ) {
    // Find device by either UUID or Hardware ID
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id: paramDeviceId }, { deviceId: paramDeviceId }] },
      select: { id: true, deviceId: true }
    });

    if (!device) {
      return { success: false, message: 'Dispositivo no encontrado' };
    }

    // 1. Borramos en la tabla v2
    try {
      await this.prisma.deviceCampaign.deleteMany({
        where: {
          device_id: device.id,
          campaign_id: campaignId,
        },
      });
    } catch(e) {}

    // 2. Intentamos borrar en la tabla v1 (legacy)
    try {
      await this.prisma.playlistItem.deleteMany({
        where: {
          campaignId: campaignId,
          deviceId: device.deviceId
        }
      });
    } catch(e) {}

    return { success: true, message: 'Campaña removida del dispositivo exitosamente' };
  }

  // Crear un nuevo dispositivo manualmente
  @Post()
  async createDevice(@Body() data: { deviceId: string, taxiNumber?: string, city?: string }) {
    if (!data.deviceId) throw new BadRequestException('ID de dispositivo (hardware) es obligatorio');
    
    // Check if hardware ID already exists
    const existing = await this.prisma.device.findUnique({ where: { deviceId: data.deviceId } });
    if (existing) throw new BadRequestException(`El ID ${data.deviceId} ya está registrado`);

    return this.prisma.device.create({
      data: {
        deviceId: data.deviceId,
        taxiNumber: data.taxiNumber,
        city: data.city || 'Santo Domingo',
        status: 'ACTIVE',
      }
    });
  }

  // Actualizar datos de un dispositivo
  @Put(':id')
  async updateDevice(
    @Param('id') id: string,
    @Body() data: { taxiNumber?: string, city?: string, status?: string }
  ) {
    return this.prisma.device.update({
      where: { id },
      data: {
        taxiNumber: data.taxiNumber,
        city: data.city,
        status: data.status,
      }
    });
  }

  // Eliminar un dispositivo completamente
  @Delete(':deviceId')
  async deleteDevice(@Param('deviceId') deviceId: string) {
    // Find device by deviceId (hardware ID) or by UUID
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id: deviceId }, { deviceId: deviceId }] }
    });
    if (!device) return { success: false, message: 'Dispositivo no encontrado' };

    const uuid = device.id;
    const hwId = device.deviceId;

    // Perform atomic deletion of all related telemetry and assignments
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Analytics & Metrics (References by UUID or Hardware ID)
        await tx.analyticsEvent.deleteMany({ where: { deviceId: hwId } });
        await tx.campaignMetric.deleteMany({ where: { deviceId: uuid } });
        
        // 2. Telemetry & Logs (References by Hardware ID)
        await tx.playbackEvent.deleteMany({ where: { deviceId: hwId } });
        await tx.deviceHeartbeat.deleteMany({ where: { deviceId: hwId } });
        await tx.playlistItem.deleteMany({ where: { deviceId: hwId } });
        await tx.driverLocation.deleteMany({ where: { deviceId: hwId } });
        
        // 3. Operational Data (References by UUID or Hardware ID)
        await tx.deviceCommand.deleteMany({ where: { deviceId: uuid } });
        await tx.deviceCampaign.deleteMany({ where: { device_id: uuid } });
        await tx.subscription.deleteMany({ where: { deviceId: hwId } });
        
        // 4. Notifications (References by either ID in string field)
        await tx.notification.deleteMany({ 
          where: { 
            OR: [
              { entityId: uuid },
              { entityId: hwId }
            ] 
          } 
        });

        // 5. Finally delete the device identity
        await tx.device.delete({ where: { id: uuid } });

        this.logger.log(`🗑️ Device ${hwId} (${uuid}) completely purged from system.`);
        return { success: true, message: `Dispositivo ${hwId} eliminado correctamente` };
      });
    } catch (error: any) {
      this.logger.error(`❌ Failed to delete device ${hwId}: ${error.message}`);
      throw new Error(`Error al eliminar nodo: ${error.message}`);
    }
  }

  // Perfil completo del nodo (device + driver + campaigns)
  @Get(':deviceId/profile')
  async getDeviceProfile(@Param('deviceId') deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id: deviceId }, { deviceId: deviceId }] },
      include: {
        driver: true,
        campaigns: { include: { campaign: { select: { id: true, name: true, advertiser: true, active: true } } } },
      }
    });
    if (!device) return { error: 'Dispositivo no encontrado' };

    return {
      id: device.id,
      device_id: device.deviceId,
      taxi_number: device.taxiNumber,
      city: device.city,
      status: device.status,
      battery_level: device.batteryLevel,
      storage_free: device.storageFree,
      app_version: device.appVersion,
      last_seen: device.lastSeen,
      player_status: device.playerStatus,
      driver: device.driver ? {
        id: device.driver.id,
        fullName: device.driver.fullName,
        phone: device.driver.phone,
        cedula: device.driver.cedula,
        licensePlate: device.driver.licensePlate,
        taxiPlate: device.driver.taxiPlate,
        subscriptionPaid: device.driver.subscriptionPaid,
        status: device.driver.status,
      } : null,
      campaigns: device.campaigns.map(c => ({
        id: c.campaign.id,
        name: c.campaign.name,
        advertiser: c.campaign.advertiser,
        active: c.campaign.active,
        assigned_at: c.assigned_at,
      })),
    };
  }

  // Actualizar perfil completo (dispositivo y chofer)
  @Put(':deviceId/profile')
  async updateDeviceProfile(@Param('deviceId') deviceId: string, @Body() data: any) {
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id: deviceId }, { deviceId: deviceId }] },
      include: { driver: true }
    });
    
    if (!device) throw new BadRequestException('Dispositivo no encontrado');

    // Update Device
    const updateData: any = {};
    if (data.taxi_number !== undefined) updateData.taxiNumber = data.taxi_number;
    if (data.status !== undefined) updateData.status = data.status;

    // Update Driver if exists
    if (device.driver) {
      updateData.driver = {
        update: {
          fullName: data.driver_name !== undefined ? data.driver_name : device.driver.fullName,
          phone: data.driver_phone !== undefined ? data.driver_phone : device.driver.phone,
          subscriptionPaid: data.subscription_paid !== undefined ? data.subscription_paid : device.driver.subscriptionPaid
        }
      };
    } else if (data.driver_name) {
      // Create driver if not exists but name is provided
      updateData.driver = {
        create: {
          fullName: data.driver_name,
          phone: data.driver_phone || 'N/A',
          subscriptionPaid: data.subscription_paid || false,
          licensePlate: data.taxi_number || 'N/A',
          taxiNumber: data.taxi_number || 'N/A',
        }
      };
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: updateData
    });

    return { success: true, message: 'Perfil actualizado', device: updated };
  }
}
