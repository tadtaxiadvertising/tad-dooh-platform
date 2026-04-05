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

    // 2. Determinar Rol e ID de Entidad (Prisma)
    let role = 'GUEST';
    let entityId = null;

    // Intentar encontrar en Tabla User (Admin)
    const adminUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (adminUser) {
      role = adminUser.role || 'ADMIN';
    } else {
      // Intentar encontrar en Tabla Advertiser
      const advertiser = await this.prisma.advertiser.findUnique({
        where: { email },
      });

      if (advertiser) {
        role = 'ADVERTISER';
        entityId = advertiser.id;
      } else {
        // Intentar encontrar en Tabla Driver (buscando por email si Supabase lo tiene)
        const driver = await this.prisma.driver.findFirst({
          where: { 
            OR: [
              { phone: email.split('@')[0] }, // Fallback si se usa phone as email
              { phone: email } 
            ]
          },
        });

        if (driver) {
          role = 'DRIVER';
          entityId = driver.id;
        }
      }
    }

    if (role === 'GUEST') {
      this.logger.warn(`🚫 Usuario sin rol asignado en DB: ${email}`);
      throw new ForbiddenException('Tu cuenta no tiene un rol asignado en la plataforma.');
    }

    // 3. Inyectar Custom Claims en app_metadata vía Admin SDK
    // Esto asegura que el JWT generado (o el siguiente) tenga el rol y entityId
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) return { ...user, role: user.role };

    const advertiser = await this.prisma.advertiser.findFirst({ where: { id: userId } });
    if (advertiser) return { ...advertiser, role: 'ADVERTISER' };

    const driver = await this.prisma.driver.findFirst({ where: { id: userId } });
    if (driver) return { ...driver, role: 'DRIVER' };

    return { id: userId, role: 'GUEST' };
  }

  async seedAdminUser() {
    this.logger.log('🔐 Seeding users must be done via Supabase Dashboard');
  }
}
