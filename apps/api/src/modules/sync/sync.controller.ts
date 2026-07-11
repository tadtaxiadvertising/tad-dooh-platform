import { Controller, Get, Param, Headers, HttpException, HttpStatus, Res } from '@nestjs/common';
import { SyncService } from './sync.service';
import { Public } from '../auth/decorators/public.decorator';
import { Response } from 'express';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * GET /sync/:deviceId — Manifiesto de playlist + kill-switch.
   *
   * CAMBIO v12.1.3: cuando el servicio emite un manifest con `killSwitch:true`
   * (conductor moroso / sin suscripción activa), el endpoint responde HTTP 402
   * PAYMENT_REQUIRED en lugar de 200 con playlist vacía. La PWA del tablet y los
   * hooks `useBackgroundTelemetry`/`useTelemetry` se enteran del kill-switch
   * por código HTTP, no por inspección de payload (defensa en profundidad).
   *
   * El cuerpo del 402 sigue siendo el mismo manifest (incluye killSwitch, reason,
   * graceToken, expiresAt) para que cualquier cliente que inspeccione el body
   * también pueda tomar acción.
   */
  @Public()
  @Get(':deviceId')
  async getDeviceManifest(
    @Param('deviceId') deviceId: string,
    @Headers('if-none-match') ifNoneMatch: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!deviceId) {
      throw new HttpException('DEVICE_ID_REQUIRED', HttpStatus.BAD_REQUEST);
    }

    const manifest = await this.syncService.getDeviceManifest(deviceId);

    // ── KILL-SWITCH: 402 cuando el manifest marca bloqueo ──
    if ((manifest as any).killSwitch === true) {
      // Importante: NO fijar ETag en respuestas 402 para evitar
      // caching del estado de bloqueo por parte del cliente o proxy intermedio.
      res.setHeader('Cache-Control', 'no-store');
      throw new HttpException(manifest, HttpStatus.PAYMENT_REQUIRED);
    }

    // Fast-path 304 Not Modified cuando el cliente tenía ETag actualizado
    if (ifNoneMatch && ifNoneMatch === manifest.etag) {
      res.status(HttpStatus.NOT_MODIFIED).send();
      return;
    }

    res.setHeader('ETag', manifest.etag);
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return manifest;
  }
}
