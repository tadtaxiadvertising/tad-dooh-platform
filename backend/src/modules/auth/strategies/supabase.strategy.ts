import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  async validate(req: any) {
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
