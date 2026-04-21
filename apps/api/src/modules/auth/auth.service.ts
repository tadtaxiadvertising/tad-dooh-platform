import { Injectable, UnauthorizedException, Logger, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
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
    this.logger.log(`🔐 Intentando login para: ${dto.email}`);
    
    try {
      const supabase = this.supabaseService.getClient();

      // 1. Intentar login en Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

      if (error || !data.session || !data.user) {
        this.logger.error(`❌ Fallo Login Supabase: ${dto.email} - ${error?.message}`);
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const userId = data.user.id;
      const email = data.user.email;

      if (!email) {
        throw new Error('El usuario autenticado no tiene email devuelto por Supabase');
      }

      // 2. Buscar rol en base de datos local
      this.logger.debug(`🔍 Buscando rol para ${email} en base de datos...`);
      
      const [adminUser, advertiser, driver] = await Promise.all([
        this.prisma.user.findUnique({ where: { email } }).catch(e => {
          this.logger.error(`Error buscando adminUser: ${e.message}`);
          return null;
        }),
        this.prisma.advertiser.findUnique({ where: { email } }).catch(e => {
          this.logger.error(`Error buscando advertiser: ${e.message}`);
          return null;
        }),
        this.prisma.driver.findFirst({
          where: {
            OR: [
              { phone: email.split('@')[0] },
              { phone: email },
            ],
          },
        }).catch(e => {
          this.logger.error(`Error buscando driver: ${e.message}`);
          return null;
        }),
      ]);

      // Determinar rol e ID de entidad
      let role = 'GUEST';
      let entityId: string | null = null;

      if (adminUser) {
        role = adminUser.role || 'ADMIN';
        this.logger.debug(`Found Admin User with role: ${role}`);
      } else if (advertiser) {
        role = 'ADVERTISER';
        entityId = advertiser.id;
        this.logger.debug(`Found Advertiser with ID: ${entityId}`);
      } else if (driver) {
        role = 'DRIVER';
        entityId = driver.id;
        this.logger.debug(`Found Driver with ID: ${entityId}`);
      }

      if (role === 'GUEST') {
        this.logger.warn(`🚫 Usuario sin rol asignado en DB: ${email}`);
        throw new ForbiddenException('Tu cuenta no tiene un rol asignado en la plataforma.');
      }

      // 3. Inyectar Custom Claims en app_metadata (Fire & Forget, don't block login if it fails)
      this.logger.debug(`💉 Inyectando metadata: role=${role}, entityId=${entityId}`);
      supabase.auth.admin.updateUserById(userId, {
        app_metadata: { role, entityId },
      }).then(({ error: updateError }) => {
        if (updateError) {
          this.logger.error(`⚠️ Error inyectando metadata en Supabase: ${updateError.message}`);
        }
      }).catch(e => {
        this.logger.error(`⚠️ Excepción inyectando metadata: ${e.message}`);
      });

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
    } catch (error) {
      this.logger.error(`💥 ERROR CRÍTICO EN LOGIN: ${error.message}`, error.stack);
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new HttpException(
        { 
          status: HttpStatus.INTERNAL_SERVER_ERROR, 
          error: 'Error interno en el proceso de autenticación',
          details: error.message 
        }, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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
