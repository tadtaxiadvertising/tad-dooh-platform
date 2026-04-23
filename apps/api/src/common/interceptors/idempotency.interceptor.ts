import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

// In-memory store for idempotency keys. In production, this should use Redis.
const processedKeys = new Map<string, any>();

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
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

      if (processedKeys.has(idempotencyKey)) {
        return of(processedKeys.get(idempotencyKey));
      }

      return next.handle().pipe(
        tap((response) => {
          processedKeys.set(idempotencyKey, response);
          // Auto-cleanup after 24 hours to prevent memory leak
          setTimeout(() => {
            processedKeys.delete(idempotencyKey);
          }, 86400000);
        }),
      );
    }

    return next.handle();
  }
}
