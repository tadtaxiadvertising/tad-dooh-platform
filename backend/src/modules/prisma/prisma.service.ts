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
    
    // REGLA SRE: Validar configuración de Pool en Producción (Doc 05)
    const dbUrl = process.env.DATABASE_URL || '';
    if (process.env.NODE_ENV === 'production' && !dbUrl.includes('connection_limit=')) {
      this.logger.warn('⚠️ ADVERTENCIA SRE: DATABASE_URL no tiene "connection_limit". Riesgo de saturación en VPS de 512MB.');
    }

    const MAX_RETRIES = 5;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        await this.$connect();
        this.logger.log(`✅ Conexión establecida con éxito en el intento ${attempts + 1}`);

        // REGLA SRE: Inicializar Vistas Materializadas (Master Sync)
        try {
          this.logger.log('🏗️ Sincronizando Vistas Materializadas (Master Sync)...');
          // Nota: El path es relativo a la raíz del backend una vez compilado (dist)
          const fs = require('fs');
          const path = require('path');
          const viewsFile = path.resolve(process.cwd(), 'prisma/views.sql');
          if (fs.existsSync(viewsFile)) {
            const sql = fs.readFileSync(viewsFile, 'utf8');
             // Split queries by semicolon if needed, but for simple views executeRawUnsafe should work
             await this.$executeRawUnsafe(sql).catch(e => {
                if (!e.message.includes('already exists')) {
                   this.logger.error(`Error SQL en vista: ${e.message}`);
                }
             });
            this.logger.log('✅ mv_active_campaigns configurada.');
          }
        } catch (viewError) {
          this.logger.error(`❌ Fallo al cargar script de vistas: ${viewError.message}`);
        }

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

  /**
   * Refresca la vista materializada para el "Master Sync".
   * Se debe llamar cada vez que una campaña sea aprobada o modificada.
   */
  async refreshActiveCampaignsView() {
    this.logger.log('🔄 Refrescando Materialized View (Master Sync)...');
    try {
      await this.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_campaigns;');
      this.logger.log('✅ mv_active_campaigns actualizada con éxito.');
    } catch (e) {
      if (e.message.includes('not been populated')) {
         // Fallback if not populated yet
         await this.$executeRawUnsafe('REFRESH MATERIALIZED VIEW mv_active_campaigns;');
      } else {
         this.logger.error(`❌ Error al refrescar vista: ${e.message}`);
      }
    }
  }
}
