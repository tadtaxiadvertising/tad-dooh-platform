import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { from, Observable, of } from "rxjs";
import { concatMap, map, tap } from "rxjs/operators";
import { PrismaService } from "../../modules/prisma/prisma.service";

type IdempotencyRequest = {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  user?: { id?: string };
  body?: unknown;
  query?: unknown;
};

/**
 * DB-backed, fail-closed HTTP idempotency guard.
 *
 * The unique database key is scoped to the authenticated user, HTTP method,
 * path, and client-provided key. A SHA-256 fingerprint prevents a caller from
 * reusing the same key with a different body/query.
 *
 * A downstream error is NOT proof that its side effects were rolled back.
 * Keep unknown-outcome records locked for reconciliation, rather than
 * allowing another attempt to charge/pay twice.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<IdempotencyRequest>();
    const method = request.method;

    if (!["POST", "PUT", "PATCH"].includes(method)) {
      return next.handle();
    }

    const suppliedKey = request.headers["idempotency-key"];
    if (
      typeof suppliedKey !== "string" ||
      suppliedKey.length === 0 ||
      suppliedKey.length > 256 ||
      suppliedKey.trim().length === 0
    ) {
      throw new BadRequestException({
        code: "INVALID_IDEMPOTENCY_KEY",
        message:
          "A nonempty Idempotency-Key header is required (max 256 characters).",
      });
    }

    const actor = request.user?.id || "public";
    const storageKey = createHash("sha256")
      .update(JSON.stringify([actor, method, request.path, suppliedKey]))
      .digest("hex");

    let requestHash: string;
    try {
      requestHash = createHash("sha256")
        .update(JSON.stringify([request.body ?? null, request.query ?? null]))
        .digest("hex");
    } catch {
      throw new BadRequestException({
        code: "INVALID_IDEMPOTENCY_BODY",
        message: "Request cannot be fingerprinted for a safe retry.",
      });
    }

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { key: storageKey },
    });

    if (existing) {
      if (
        existing.requestHash !== requestHash ||
        existing.method !== method ||
        existing.path !== request.path ||
        existing.driverId !== actor
      ) {
        throw new ConflictException({
          code: "IDEMPOTENCY_PAYLOAD_CONFLICT",
          message: "Idempotency-Key was already used with a different request.",
        });
      }

      // An in-flight or unknown-outcome operation must never be auto-retried,
      // even when its normal 24h TTL has expired.
      if (existing.isLocked) {
        throw new ConflictException({
          code: "IDEMPOTENCY_KEY_IN_PROGRESS",
          message: "Operation outcome is pending reconciliation.",
        });
      }

      // Financial/offline retries can arrive after the 24-hour review horizon.
      // A completed request must never be executed again just because its
      // metadata expired. Replay the recorded result for the same fingerprint.
      // Deduplication records require explicit archival with permanent key
      // tombstones before deletion is ever safe (see issue #217).
      if (existing.response == null || existing.response === "{ }") {
        throw new ConflictException({
          code: "IDEMPOTENCY_RESULT_UNAVAILABLE",
          message: "Stored outcome is unavailable; reconciliation required.",
        });
      }
      try {
        return of(JSON.parse(existing.response) as unknown);
      } catch {
        throw new ConflictException({
          code: "IDEMPOTENCY_RESULT_UNAVAILABLE",
          message: "Stored outcome could not be decoded.",
        });
      }
    }

    try {
      await this.prisma.idempotencyKey.create({
        data: {
          key: storageKey,
          driverId: actor,
          path: request.path,
          method,
          requestHash,
          response: null,
          isLocked: true,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });
    } catch (error) {
      // A concurrent request won the unique-key race. Fail closed.
      if (
        error != null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException({
          code: "IDEMPOTENCY_KEY_IN_PROGRESS",
          message: "Operation is being processed concurrently.",
        });
      }
      throw error;
    }

    return next.handle().pipe(
      // Unlike tap(async ...), concatMap waits for the persisted result
      // before acknowledging a successful write to the HTTP caller.
      concatMap((response) =>
        from(
          this.prisma.idempotencyKey.update({
            where: { key: storageKey },
            data: {
              response: JSON.stringify(response ?? null),
              isLocked: false,
            },
          }),
        ).pipe(map(() => response)),
      ),
      // A thrown error can occur AFTER an external payment/DB commit.
      // Keep the lock and log a safe reconciliation signal, not raw keys.
      tap({
        error: () =>
          this.logger.error(
            "[IDEMPOTENCY_RECONCILIATION_REQUIRED] " +
              "Unknown operation outcome; record remains locked.",
          ),
      }),
    );
  }
}
