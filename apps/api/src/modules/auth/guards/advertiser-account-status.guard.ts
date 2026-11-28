import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdvertisersService } from "../../advertisers/advertisers.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { UserRole } from "../decorators/roles.decorator";
import { ADVERTISER_ALLOWED_STATUSES_KEY } from "../decorators/advertiser-status.decorator";
import type { AuthenticatedRequest } from "../auth.types";

const DEFAULT_ALLOWED_STATUSES = ["ACTIVE"] as const;

/**
 * Database-backed commercial eligibility for every private ADVERTISER API
 * request. Runs after SupabaseAuthGuard and RolesGuard in AppModule.
 *
 * A successful JWT and matching tenant do NOT imply the account has been
 * approved. Always consult the current DB state. No caching of revocation
 * status, no client-supplied status, no bearer token decoding.
 */
@Injectable()
export class AdvertiserAccountStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly advertisersService: AdvertisersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    // Authentication and RBAC are enforced by earlier APP_GUARD instances.
    // This guard adds an advertiser-specific account eligibility restriction.
    if (!user || user.role !== UserRole.ADVERTISER) {
      return true;
    }

    // The validator also checks verified role, entityId and email against DB.
    // It returns only recognized statuses and rejects suspended/deleted users.
    const current = await this.advertisersService.verifyOAuthAdvertiserStatus({
      role: user.role,
      entityId: user.entityId,
      email: user.email,
    });
    const allowed =
      this.reflector.getAllAndOverride<readonly string[]>(
        ADVERTISER_ALLOWED_STATUSES_KEY,
        targets,
      ) ?? DEFAULT_ALLOWED_STATUSES;
    if (!allowed.includes(current.status)) {
      throw new ForbiddenException(
        "La cuenta de anunciante no está habilitada para esta operación.",
      );
    }

    return true;
  }
}
