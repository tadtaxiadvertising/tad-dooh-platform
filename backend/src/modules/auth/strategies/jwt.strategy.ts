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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // We still need a secret for the base Strategy to not error, 
      // but we will do the real verification in validate() using Supabase.
      secretOrKey: configService.get<string>('JWT_SECRET') || 'tad-default-secret-change-me-in-production',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('No token provided');

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
