import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          let data = request?.headers?.authorization;
          if (!data) return null;
          data = data.replace(/bearer\s+/i, '').replace(/['"]/g, '').trim();
          return data;
        },
      ]),
      ignoreExpiration: false,
      // We still need a secret for the base Strategy to not error, 
      // but we will do the real verification in validate() using Supabase.
      secretOrKey: configService.get<string>('JWT_SECRET') || 'tad-default-secret-change-me-in-production',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    let token = req.headers.authorization;
    if (!token) throw new UnauthorizedException('No token provided');
    token = token.replace(/bearer\s+/i, '').replace(/['"]/g, '').trim();


    const supabase = this.supabaseService.getClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Sesión inválida o expirada en Supabase');
    }

    return {
      id: user.id,
      email: user.email,
      role: 'ADMIN',
    };
  }
}
