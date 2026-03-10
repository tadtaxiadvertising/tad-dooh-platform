import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      this.logger.error(`❌ Fallo Login: ${dto.email} - ${error?.message}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.logger.log(`✅ Login exitoso vía Supabase: ${data.user.email}`);

    return {
      access_token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || 'Admin',
        role: 'ADMIN', // Handled within Supabase or by platform rules
      },
    };
  }

  /**
   * En Supabase, el seeding se hace desde su dashboard o scripts de migración.
   * Por seguridad, deshabilitamos el seeding local en desarrollo.
   */
  async seedAdminUser() {
    this.logger.log('🔐 Seeding users must be done via Supabase Dashboard');
  }

  async getProfile(userId: string) {
    // Optionally fetch more data from Prisma if synced, 
    // but for now we trust the Supabase identity.
    return { id: userId, role: 'ADMIN' };
  }
}
