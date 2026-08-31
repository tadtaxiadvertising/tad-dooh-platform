import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException, Logger } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * VULN #4 PATCH (v12.1.2): DB-backed IdempotencyInterceptor
 *
 * Replaces in-memory Map with PostgreSQL-backed store:
 * - Survives pod restarts and OOM kills
 * - Works across multiple instances (horizontal scaling)
 * - Uses row-level locking (isLocked) to prevent concurrent processing of same key
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly prisma: PrismaService) { }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const idempotencyKey = request.headers['idempotency-key'];

      if (!idempotencyKey) {
        throw new BadRequestException({
          code: 'IDEMPOTENCY_KEY_MISSING',
          message: 'Idempotency-Key header is required for this operation',
        });
      }

      // Check DB for existing idempotency record with advisory lock
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey }
      });

      if (existing) {
        // If locked, another request is currently processing this key — reject
        if (existing.isLocked) {
          this.logger.warn(`Idempotency key ${idempotencyKey} is currently being processed by another request.`);
          throw new BadRequestException({
            code: 'IDEMPOTENCY_KEY_IN_PROGRESS',
            message: 'This operation is currently being processed. Please retry in a few seconds.',
          });
        }

        // Already completed — return cached response
        this.logger.log(`Idempotency key ${idempotencyKey} already processed. Returning cached response.`);
        try {
          return of(JSON.parse(existing.response));
        } catch {
          // If response is not valid JSON, return a generic success
          return of({ success: true, idempotent: true });
        }
      }

      // Acquire lock: create record with isLocked=true
      await this.prisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          driverId: request.user?.entityId || request.body?.driverId || 'unknown',
          path: request.path,
          response: '{}',
          isLocked: true,
          expiresAt: new Date(Date.now() + 86400000), // 24h TTL
        }
      });

      return next.handle().pipe(
        tap(async (response) => {
          // Release lock: update record with response payload and isLocked=false
          await this.prisma.idempotencyKey.update({
            where: { key: idempotencyKey },
            data: {
              response: JSON.stringify(response),
              isLocked: false,
            }
          });
        }),
        catchError(async (err) => {
          // FASE 2 (Item 7): liberar el lock si el handler falló (p. ej. validaciones
          // o rollback de $transaction). Sin esto la key quedaría "locked" 24h y el
          // cliente no podría reintentar pese a que nada se persistió.
          try {
            await this.prisma.idempotencyKey.delete({ where: { key: idempotencyKey } });
          } catch (e) {
            // ignore: key pudo no existir o ya fue eliminada
          }
          return throwError(() => err);
        }),
      );
    }

    return next.handle();
  }
}
