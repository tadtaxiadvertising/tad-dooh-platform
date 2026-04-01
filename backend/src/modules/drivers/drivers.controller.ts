import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException, Headers, ForbiddenException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { Public } from '../auth/decorators/public.decorator';
import * as jwt from 'jsonwebtoken';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  /**
   * GET /api/drivers — Listar todos los choferes
   */
  @Get()
  async findAll() {
    return this.driversService.findAll();
  }

  /**
   * GET /api/drivers/stats — Estadísticas de la red
   */
  @Get('stats')
  async getStats() {
    return this.driversService.getStats();
  }

  /**
   * GET /api/drivers/:id — Detalle de un chofer
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const driver = await this.driversService.findOne(id);
    if (!driver) throw new BadRequestException('Chofer no encontrado');
    return driver;
  }

  /**
   * POST /api/drivers — Registrar un nuevo chofer
   */
  @Public()
  @Post()
  async create(@Body() body: {
    fullName: string;
    cedula?: string;
    phone: string;
    taxiPlate?: string;
    licensePlate?: string;
    deviceId?: string;
    subscriptionPaid?: boolean;
    subscriptionEnd?: string;
    password?: string;
  }) {
    if (!body.fullName || !body.phone) {
      throw new BadRequestException('fullName y phone son obligatorios');
    }

    // Sanear campos opcionales: Convertir strings vacíos a undefined para evitar conflictos de unicidad en Prisma
    const sanitize = (val?: string) => (val && val.trim() !== '' ? val : undefined);

    return this.driversService.create({
      ...body,
      cedula: sanitize(body.cedula),
      taxiPlate: sanitize(body.taxiPlate),
      licensePlate: sanitize(body.licensePlate),
      deviceId: sanitize(body.deviceId),
      subscriptionEnd: body.subscriptionEnd ? new Date(body.subscriptionEnd) : undefined,
      password: body.password,
    });
  }

  /**
   * POST /api/drivers/login — Iniciar sesión chofer
   */
  @Public()
  @Post('login')
  async login(@Body() body: { phone: string; password?: string }) {
    if (!body.phone || !body.password) {
      throw new BadRequestException('El número de teléfono y contraseña son obligatorios');
    }
    return this.driversService.login(body.phone, body.password);
  }

  /**
   * GET /api/drivers/:id/earnings — Cálculo de ganancias mensuales
   */
  @Get(':id/earnings')
  async getEarnings(@Param('id') id: string) {
    return this.driversService.calculateMonthlyEarnings(id);
  }

  /**
   * PUT /api/drivers/:id/subscription — Actualizar estado de suscripción
   */
  @Put(':id/subscription')
  async updateSubscription(
    @Param('id') id: string,
    @Body() body: { paid: boolean; endDate?: string }
  ) {
    return this.driversService.updateSubscription(
      id,
      body.paid,
      body.endDate ? new Date(body.endDate) : undefined,
    );
  }

  /**
   * POST /api/drivers/:id/assign-device — Asignar pantalla al chofer
   */
  @Post(':id/assign-device')
  async assignDevice(
    @Param('id') id: string,
    @Body() body: { deviceId: string }
  ) {
    if (!body.deviceId) throw new BadRequestException('deviceId es requerido');
    return this.driversService.assignDevice(id, body.deviceId);
  }

  /**
   * POST /api/drivers/:id/unlink-device — Desvincular pantalla
   */
  @Post(':id/unlink-device')
  async unlinkDevice(@Param('id') id: string) {
    return this.driversService.unlinkDevice(id);
  }

  /**
   * GET /api/drivers/tablet/:tabletId/access — Verificar acceso de tablet
   * Usado por la PWA/FullyKiosk para saber si debe bloquear la pantalla.
   */
  @Get('tablet/:tabletId/access')
  async checkTabletAccess(@Param('tabletId') tabletId: string) {
    return this.driversService.checkTabletAccess(tabletId);
  }

  /**
   * GET /api/drivers/me/hub — Datos de negocio para el portal del chofer (Autenticado)
   * Nuevo flujo: Los choferes registrados usan su JWT para entrar, tengan o no pauta activa.
   */
  @Get('me/hub')
  async getMyHub(@Headers('authorization') auth: string) {
    if (!auth) throw new ForbiddenException('No autorizado');
    const token = auth.replace('Bearer ', '');
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'tad-super-secret-key-2024');
      return await this.driversService.getDriverHubDataById(decoded.sub);
    } catch (e) {
      throw new ForbiddenException('Token inválido o expirado');
    }
  }

  /**
   * GET /api/drivers/tablet/:tabletId/hub — Datos de negocio para el portal del chofer
   */
  @Public() // El portal del chofer usa solo el ID del hardware para autenticarse
  @Get('tablet/:tabletId/hub')
  async getDriverHub(@Param('tabletId') tabletId: string) {
    try {
      return await this.driversService.getDriverHubData(tabletId);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
  /**
   * DELETE /api/drivers/purge-all — Purge ALL drivers and devices (TEST ONLY)
   */
  @Post('purge-all')
  async purgeAll(@Headers('x-admin-secret') secret: string) {
    if (secret !== 'TAD_CLEAN_2026') {
      throw new ForbiddenException('Unauthorized purge attempt');
    }
    return this.driversService.purgeAll();
  }

  /**
   * DELETE /api/drivers/:id — Eliminar un chofer
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.driversService.remove(id);
  }
}
