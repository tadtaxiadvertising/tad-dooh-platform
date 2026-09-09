import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../decorators/roles.decorator";

/**
 * SHELTER C-A1: TenantGuard — Aislamiento de Datos por Tenant
 *
 * Verifica que el recurso solicitado (vía :id param) pertenezca al usuario autenticado.
 * Los ADMIN pueden acceder a cualquier recurso.
 * Los ADVERTISER/DRIVER solo pueden acceder a sus propios recursos (entityId === param.id).
 *
 * Uso:
 *   @UseGuards(TenantGuard)
 *   @Get(':id')
 *   async findOne(@Param('id') id: string) { ... }
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si no hay usuario autenticado, el AuthGuard ya lo manejó
    if (!user) return false;

    // Los ADMIN tienen acceso irrestricto
    if (user.role === UserRole.ADMIN) return true;

    // Extraer el ID del recurso del param de ruta
    const resourceId = request.params?.id;

    // Si no hay param :id, no hay nada que validar (ej: GET /advertisers sin param)
    if (!resourceId) return true;

    // Verificar que el entityId del token coincida con el recurso solicitado
    if (user.entityId !== resourceId) {
      this.logger.warn(
        `🚨 [TENANT_VIOLATION] User ${user.sub || user.id} (entity: ${user.entityId}) ` +
          `intentó acceder al recurso ${resourceId}`,
      );
      throw new UnauthorizedException(
        "No tienes permiso para acceder a este recurso.",
      );
    }

    return true;
  }
}
