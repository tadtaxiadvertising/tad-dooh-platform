import { Injectable, UnauthorizedException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getClient();

    // 1. Intentar login en Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session || !data.user) {
      this.logger.error(`❌ Fallo Login: ${dto.email} - ${error?.message}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const userId = data.user.id;
    const email = data.user.email;

    // FIX A-4: Ejecutar las 3 queries en paralelo en lugar de serialmente.
    // Antes: 3 queries secuenciales → ~90ms. Ahora: paralelo → ~30ms.
    const [adminUser, advertiser, driver] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.advertiser.findUnique({ where: { email } }),
      this.prisma.driver.findFirst({
        where: {
          OR: [
            { phone: email.split('@')[0] },
            { phone: email },
          ],
        },
      }),
    ]);

    // Determinar rol e ID de entidad según el primer resultado encontrado
    let role = 'GUEST';
    let entityId: string | null = null;

    if (adminUser) {
      role = adminUser.role || 'ADMIN';
    } else if (advertiser) {
      role = 'ADVERTISER';
      entityId = advertiser.id;
    } else if (driver) {
      role = 'DRIVER';
      entityId = driver.id;
    }

    if (role === 'GUEST') {
      this.logger.warn(`🚫 Usuario sin rol asignado en DB: ${email}`);
      throw new ForbiddenException('Tu cuenta no tiene un rol asignado en la plataforma.');
    }

    // 3. Inyectar Custom Claims en app_metadata vía Admin SDK
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { role, entityId },
    });

    if (updateError) {
      this.logger.error(`⚠️ Error inyectando metadata en Supabase: ${updateError.message}`);
    }

    this.logger.log(`✅ Login exitoso: ${email} | Rol: ${role} | Entity: ${entityId || 'N/A'}`);

    return {
      access_token: data.session.access_token,
      user: {
        id: userId,
        email: email,
        role: role,
        entityId: entityId,
      },
    };
  }

  async getProfile(userId: string) {
    // FIX A-4: También paralelizar getProfile
    const [user, advertiser, driver] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: userId } }),
      this.prisma.advertiser.findFirst({ where: { id: userId } }),
      this.prisma.driver.findFirst({ where: { id: userId } }),
    ]);

    if (user) return { ...user, role: user.role };
    if (advertiser) return { ...advertiser, role: 'ADVERTISER' };
    if (driver) return { ...driver, role: 'DRIVER' };

    return { id: userId, role: 'GUEST' };
  }

  async seedAdminUser() {
    this.logger.log('🔐 Seeding users must be done via Supabase Dashboard');
  }
}
