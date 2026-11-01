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
import * as jwt from "jsonwebtoken";
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

  // In-memory cache to avoid repeated network calls for the same token in a short window
  private static sessionCache = new Map<
    string,
    { user: AuthUser; expiry: number }
  >();
  private readonly CACHE_TTL_MS = 10000; // 10 seconds cache for same token

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
    private configService: ConfigService,
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

    // Cleanup stale cache occasionally
    if (Math.random() > 0.95) {
      const now = Date.now();
      for (const [token, data] of SupabaseAuthGuard.sessionCache.entries()) {
        if (data.expiry < now) SupabaseAuthGuard.sessionCache.delete(token);
      }
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

    // --- CACHE LOOKUP ---
    const cached = SupabaseAuthGuard.sessionCache.get(token);
    if (cached && cached.expiry > Date.now()) {
      request.user = cached.user;
      return;
    }

    const jwtSecret =
      this.configService.get<string>("SUPABASE_JWT_SECRET") ||
      this.configService.get<string>("JWT_SECRET");

    // --- ESTRATEGIA 1: Validación Local JWT ---
    if (jwtSecret) {
      try {
        const decodedToken = jwt.decode(token, { complete: true }) as any;
        const alg = decodedToken?.header?.alg || "HS256";

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
            typeof payload.sub !== "string" || !payload.sub ||
            typeof payload.session_id !== "string" || !payload.session_id ||
            payload.role !== "authenticated"
          ) {
            throw new UnauthorizedException("JWT sin sesión de usuario válida.");
          }

          if (payload) {
            request.user = {
              id: payload.sub,
              email: payload.email,
              role: payload.app_metadata?.role || payload.role || "GUEST",
              entityId: payload.app_metadata?.entityId || null,
            };

            // Cache sucessful validation
            SupabaseAuthGuard.sessionCache.set(token, {
              user: request.user,
              expiry: Date.now() + this.CACHE_TTL_MS,
            });

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
        const decoded = jwt.decode(token) as jwt.JwtPayload;
        const roleFromMeta =
          data.user.app_metadata?.role ||
          decoded?.app_metadata?.role ||
          (data.user as any).role ||
          decoded?.role ||
          "GUEST";
        const entityId =
          data.user.app_metadata?.entityId ||
          decoded?.app_metadata?.entityId ||
          null;

        request.user = {
          id: data.user.id,
          email: data.user.email,
          role: roleFromMeta,
          entityId,
        };

        // Cache sucessful validation
        SupabaseAuthGuard.sessionCache.set(token, {
          user: request.user,
          expiry: Date.now() + this.CACHE_TTL_MS,
        });

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
