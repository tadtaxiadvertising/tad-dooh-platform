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
    const MAX_RETRIES = 5;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        await this.$connect();
        this.logger.log(`✅ Conexión establecida con éxito en el intento ${attempts + 1}`);
        return;
      } catch (e) {
        attempts++;
        const delay = attempts * 2000; // Exponential backup 2s, 4s, 6s...
        this.logger.error(`❌ Intento ${attempts}/${MAX_RETRIES} fallido al conectar a Supabase. Reintentando en ${delay/1000}s...`);
        if (attempts >= MAX_RETRIES) {
          this.logger.error('🚨 ERROR FATAL: No se pudo conectar a la base de datos tras 5 intentos. Deteniendo proceso.');
          process.exit(1); 
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // REGLA SRE: Cerrar conexiones zombie al re-desplegar en EasyPanel
  async onModuleDestroy() {
    this.logger.warn('🔌 Cerrando conexiones al Pooler (EasyPanel redeploy)...');
    await this.$disconnect();
  }
}
