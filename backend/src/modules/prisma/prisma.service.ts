import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          // REGLA SRE: Forzar el uso del Pooler de Supabase (Puerto 6543)
          // DATABASE_URL debe incluir ?connection_limit=5 en EasyPanel
          url: process.env.DATABASE_URL,
        },
      },
      // Solo loguear errores en producción para no saturar el log de EasyPanel
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    this.logger.log('🔌 Inicializando conexión al Pooler de Supabase...');
    try {
      await this.$connect();
      this.logger.log('✅ Conexión establecida con éxito');
    } catch (e) {
      this.logger.error('❌ Error fatal al conectar a la base de datos', e);
    }
  }

  // REGLA SRE: Cerrar conexiones zombie al re-desplegar en EasyPanel
  async onModuleDestroy() {
    this.logger.warn('🔌 Cerrando conexiones al Pooler (EasyPanel redeploy)...');
    await this.$disconnect();
  }
}
