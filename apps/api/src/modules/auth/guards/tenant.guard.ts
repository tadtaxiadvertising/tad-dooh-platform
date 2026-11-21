import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";

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

    // Resource ownership can be encoded under several route param names.
    // Treat all tenant IDs as binding. A request with both :id and another
    // tenant parameter must satisfy ALL ownership checks (never first-match).
    // Do not change generic :id behavior: existing controllers depend on it.
    const params = request.params || {};
    const scopedIds: Array<{
      key: string;
      id: string;
      requiredRole?: UserRole;
    }> = [
      { key: "id", id: params.id },
      {
        key: "advertiserId",
        id: params.advertiserId,
        requiredRole: UserRole.ADVERTISER,
      },
      { key: "driverId", id: params.driverId, requiredRole: UserRole.DRIVER },
    ].filter((param) => param.id !== undefined);

    for (const param of scopedIds) {
      if (
        typeof param.id !== "string" ||
        !param.id.trim() ||
        !user.entityId ||
        user.entityId !== param.id ||
        (param.requiredRole !== undefined && user.role !== param.requiredRole)
      ) {
        this.logger.warn(
          `[TENANT_VIOLATION] Rejected ${param.key} resource ownership mismatch`,
        );
        throw new UnauthorizedException(
          "No tienes permiso para acceder a este recurso.",
        );
      }
    }

    // Paramless KYC and similar routes may additionally verify body ownership
    // in their controller. This guard does not inspect untrusted body IDs.
    return true;
  }
}
