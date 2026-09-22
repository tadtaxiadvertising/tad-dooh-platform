import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    // SUPABASE_JWT_SECRET o JWT_SECRET es OBLIGATORIO.
    // Si no está configurado, la app falla al arrancar (no hay default inseguro).
    const secret =
      configService.get<string>("SUPABASE_JWT_SECRET") ||
      configService.get<string>("JWT_SECRET");

    if (!secret) {
      throw new Error(
        "JWT_SECRET o SUPABASE_JWT_SECRET no configurados. La app no puede iniciar sin secreto válido.",
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          let data = request?.headers?.authorization;
          if (!data) return null;
          data = data
            .replace(/bearer\s+/i, "")
            .replace(/['"]/g, "")
            .trim();
          return data;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    let token = req.headers.authorization;
    if (!token) throw new UnauthorizedException("No token provided");
    token = token
      .replace(/bearer\s+/i, "")
      .replace(/['"]/g, "")
      .trim();

    const supabase = this.supabaseService.getClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException("Sesión inválida o expirada en Supabase");
    }

    const appMeta = user.app_metadata || {};

    return {
      id: user.id,
      email: user.email,
      role: appMeta.role || "GUEST",
      entityId: appMeta.entityId || null,
    };
  }
}
