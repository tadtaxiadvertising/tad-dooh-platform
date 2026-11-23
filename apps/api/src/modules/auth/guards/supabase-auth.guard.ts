import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  CanActivate,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { SupabaseService } from "../../supabase/supabase.service";
import { AdvertisersService } from "../../advertisers/advertisers.service";
import * as jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { AuthUser } from "../auth.types";

/**
 * SUPABASE AUTH GUARD — Política "Deny-by-Default".
 * Protege TODAS las rutas de la API globalmente (registrado en APP_GUARD).
 *
 * Flujo de validación (Híbrido):
 * 1. Validación LOCAL usando SUPABASE_JWT_SECRET o JWT_SECRET (< 1ms).
 * 2. Si falla, validamos contra la red de Supabase (> 200ms).
 *
 * Auth opcional en @Public(): si la petición trae un Bearer válido se puebla
 * `req.user` para que endpoints públicos puedan distinguir admins (p. ej.
 * POST /drivers); si no trae token o es inválido, la ruta sigue siendo pública
 * y `req.user` queda undefined. Nunca se lanza error en modo público.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly isDev: boolean;
  private readonly allowDevBypass: boolean;

  // Cache only opaque SHA-256 token digests, never raw bearer credentials.
  // The bounded LRU avoids indefinite process-memory growth with new sessions.
  private static sessionCache = new Map<
    string,
    { user: AuthUser; expiry: number }
  >();
  private static readonly MAX_CACHED_SESSIONS = 2_048;
  private static nextSessionCacheSweepAt = 0;
  private readonly CACHE_TTL_MS = 10000; // 10 seconds cache for same token

  private static cacheKey(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private static getCachedSession(token: string): AuthUser | undefined {
    const key = SupabaseAuthGuard.cacheKey(token);
    const cache = SupabaseAuthGuard.sessionCache;
    const stored = cache.get(key);
    if (!stored) return undefined;
    if (stored.expiry <= Date.now()) {
      cache.delete(key);
      return undefined;
    }
    // Refresh LRU recency without extending the session validation TTL.
    cache.delete(key);
    cache.set(key, stored);
    return stored.user;
  }

  private cacheVerifiedSession(token: string, user: AuthUser): void {
    const cache = SupabaseAuthGuard.sessionCache;
    const now = Date.now();
    // Bounded sweep only when full: avoid a linear scan per request at 10x.
    if (
      cache.size >= SupabaseAuthGuard.MAX_CACHED_SESSIONS &&
      now >= SupabaseAuthGuard.nextSessionCacheSweepAt
    ) {
      for (const [key, entry] of cache) {
        if (entry.expiry <= now) cache.delete(key);
      }
      SupabaseAuthGuard.nextSessionCacheSweepAt = now + this.CACHE_TTL_MS;
    }

    const key = SupabaseAuthGuard.cacheKey(token);
    cache.delete(key);
    cache.set(key, { user, expiry: now + this.CACHE_TTL_MS });
    if (cache.size > SupabaseAuthGuard.MAX_CACHED_SESSIONS) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
    private configService: ConfigService,
    private advertisersService: AdvertisersService,
  ) {
    this.isDev = process.env.NODE_ENV === "development";
    this.allowDevBypass = this.isDev && process.env.ALLOW_DEV_BYPASS === "true";

    const hasSecret = !!(
      this.configService.get("SUPABASE_JWT_SECRET") ||
      this.configService.get("JWT_SECRET")
    );
    if (!hasSecret) {
      this.logger.warn(
        "⚠️ [SECURITY] No hay JWT_SECRET configurado. Solo funcionará Estrategia 2 (Red).",
      );
    }

   }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Ruta pública: auth opcional. Se intenta poblar req.user, nunca se falla.
      await this.resolveRequestUser(context, false);
      return true;
    }

    await this.resolveRequestUser(context, true);
    return true;
  }

  /**
   * Valida el Bearer token y puebla `request.user`.
   * - strict=true (rutas protegidas): lanza UnauthorizedException ante cualquier fallo.
   * - strict=false (rutas @Public()): nunca lanza; si el token no es válido,
   *   simplemente deja `request.user` sin poblar.
   */
  private async resolveRequestUser(
    context: ExecutionContext,
    strict: boolean,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const authHeader =
      request.headers.authorization || request.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (strict) {
        this.logger.warn(
          `❌ [AUTH] Petición sin Header Authorization válido: ${request.url}`,
        );
        throw new UnauthorizedException("Token de acceso no válido o ausente.");
      }
      return;
    }

    const token = authHeader.split(" ")[1];

    // A hardware pairing JWT is NOT a Supabase user session. AuthModule signs
    // pairing tokens with the same configured secret used for local verification.
    // Reject before cache, network fallback, and the development bypass.
    // Reading an unverified claim is safe here because it can only DENY access.
    const tokenClaims = jwt.decode(token) as jwt.JwtPayload | null;
    if (tokenClaims?.type === "pairing") {
      if (strict) {
        throw new UnauthorizedException("Token de sesión no válido.");
      }
      return;
    }

    // Legacy password login intentionally issues an API-signed advertiser JWT
    // with no Supabase session_id / "authenticated" audience. Route only this
    // exact untrusted SHAPE to the independently signed+DB-backed verifier.
    // Decoding claims here is solely a dispatch hint, NEVER authorization.
    // Invalid/expired tokens fail closed without falling back to Supabase.
    const looksLikeLegacyAdvertiser =
      tokenClaims?.role === "ADVERTISER" &&
      tokenClaims?.app_metadata?.role === "ADVERTISER" &&
      tokenClaims.session_id === undefined;
    if (looksLikeLegacyAdvertiser) {
      // Public endpoints perform their own optional/business validation.
      // Avoid double DB reads on /advertisers/session, which verifies itself.
      if (!strict) return;
      try {
        const verified =
          await this.advertisersService.verifyAdvertiserSession(token);
        if (typeof tokenClaims.email !== "string" || !tokenClaims.email) {
          throw new UnauthorizedException("Sesión de anunciante inválida.");
        }
        request.user = {
          id: verified.advertiserId,
          email: tokenClaims.email, // signature and DB email already verified
          role: verified.role,
          entityId: verified.advertiserId,
        };
        return;
      } catch {
        throw new UnauthorizedException("Sesión de anunciante inválida.");
      }
    }

    // --- CACHE LOOKUP ---
    const cachedUser = SupabaseAuthGuard.getCachedSession(token);
    if (cachedUser) {
      request.user = cachedUser;
      return;
    }

    const jwtSecret =
      this.configService.get<string>("SUPABASE_JWT_SECRET") ||
      this.configService.get<string>("JWT_SECRET");

    // --- ESTRATEGIA 1: Validación Local JWT ---
    if (jwtSecret) {
      try {
        const decodedToken = jwt.decode(token, { complete: true });
        const alg = (decodedToken?.header?.alg || "HS256") as jwt.Algorithm;

        const isSymmetricSecret =
          !jwtSecret.includes("BEGIN PUBLIC KEY") &&
          !jwtSecret.includes("BEGIN CERTIFICATE");
        const isAsymmetricAlg =
          alg.startsWith("RS") || alg.startsWith("ES") || alg.startsWith("PS");

        if (isAsymmetricAlg && isSymmetricSecret) {
          // Skip Strategy 1: Cannot verify asymmetric token with a symmetric secret
          // Lo silenciamos para evitar spam en consola ya que es un flujo esperado (ES256 en lugar de HS256)
        } else {
          const payload = jwt.verify(token, jwtSecret, {
            algorithms: [alg, "HS256", "HS384", "HS512"],
            // The shared JWT secret must not make other application tokens
            // (pairing, service tokens) acceptable as Supabase user sessions.
            audience: "authenticated",
          }) as jwt.JwtPayload;

          // Supabase user access JWTs carry a session_id and a top-level
          // "authenticated" role; application RBAC lives in app_metadata.
          // This prevents other locally signed JWTs from becoming sessions.
          if (
            typeof payload.sub !== "string" ||
            !payload.sub ||
            typeof payload.session_id !== "string" ||
            !payload.session_id ||
            payload.role !== "authenticated"
          ) {
            throw new UnauthorizedException(
              "JWT sin sesión de usuario válida.",
            );
          }

          if (payload) {
            request.user = {
              id: payload.sub,
              email: payload.email,
              role: payload.app_metadata?.role || payload.role || "GUEST",
              entityId: payload.app_metadata?.entityId || null,
            };

            // Cache the verified identity without retaining the raw JWT.
            this.cacheVerifiedSession(token, request.user);

            this.logger.verbose(
              `✅ [AUTH] ESTRATEGIA 1 OK (Local JWT): ${request.user.email}`,
            );
            return;
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errName = err instanceof Error ? err.name : "";

        if (errName === "TokenExpiredError") {
          if (strict) {
            this.logger.warn(`🛑 [AUTH] TOKEN EXPIRADO: ${errorMessage}`);
            throw new UnauthorizedException("Tu sesión ha expirado.");
          }
          // En modo público seguimos a Estrategia 2 (Red) por si Supabase renueva/acepta.
        } else {
          // If it's a configuration issue with the secret/algorithm, we log it more clearly
          const isAlgError = errorMessage.toLowerCase().includes("algorithm");
          if (isAlgError) {
            this.logger.verbose(
              `[AUTH] Estrategia 1 falló (Algoritmo incompatible o Secret mal configurado: ${errorMessage}). Intentando Estrategia 2...`,
            );
          } else {
            this.logger.verbose(
              `[AUTH] Estrategia 1 falló (${errorMessage}). Intentando Estrategia 2 (Red)...`,
            );
          }
        }
      }
    }

    // --- ESTRATEGIA 2: Validación vía Supabase SDK (Red) ---
    try {
      // Use anon/publishable client for getUser() — service role key may be
      // in sb_secret_ format which GoTrue rejects as "Unregistered API key".
      const supabase =
        this.supabaseService.getAnonClient() ||
        this.supabaseService.getClient();
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data.user) {
        // Only server-returned app_metadata may authorize application roles.
        // JWT claims can be stale after an admin revokes a role or entity link.
        // Never restore revoked privileges from the presented token.
        const roleFromMeta = data.user.app_metadata?.role || "GUEST";
        const entityId = data.user.app_metadata?.entityId || null;

        request.user = {
          id: data.user.id,
          email: data.user.email,
          role: roleFromMeta,
          entityId,
        };

        // Cache the verified identity without retaining the raw JWT.
        this.cacheVerifiedSession(token, request.user);

        if (roleFromMeta === "GUEST") {
          this.logger.warn(
            `⚠️ [AUTH_GUARD] Usuario autenticado pero sin rol en metadata: ${data.user.email}. ` +
              `Verifica si las claims están correctas en Supabase.`,
          );
        } else {
          // Log a nivel verbose para que no inunde la consola en producción por cada request
          this.logger.verbose(
            `✅ [AUTH] ESTRATEGIA 2 OK (Red): ${data.user.email} [${roleFromMeta}]`,
          );
        }
        return;
      }

      if (error) {
        this.logger.warn(
          `❌ [AUTH] ESTRATEGIA 2 RECHAZÓ TOKEN: ${error.message}`,
        );
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `❌ [AUTH] ESTRATEGIA 2 ERROR CRÍTICO: ${errorMessage}`,
      );
    }

    // --- ESTRATEGIA 3: DEV BYPASS ---
    if (this.allowDevBypass) {
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      if (decoded) {
        this.logger.warn(`🚩 [AUTH] DEV BYPASS UTILIZADO: ${decoded.email}`);
        request.user = {
          id: decoded.sub || "dev-user",
          email: decoded.email || "dev@local",
          role: decoded.app_metadata?.role || decoded.role || "GUEST",
          entityId: decoded.app_metadata?.entityId || null,
        };
        return;
      }
    }

    if (strict) {
      throw new UnauthorizedException("Sesión inválida.");
    }
  }
}
