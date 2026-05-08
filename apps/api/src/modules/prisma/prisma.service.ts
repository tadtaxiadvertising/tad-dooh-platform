import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    let url = process.env.DATABASE_URL;
    if (url && !url.includes('connection_limit=')) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}connection_limit=20`;
    }
    
    super({
      datasources: {
        db: {
          // REGLA SRE: Forzar el uso del Pooler de Supabase (Puerto 6543)
          // DATABASE_URL debe incluir ?connection_limit=5 en EasyPanel
          url,
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

        // Async background initialization to keep startup lean
        this.initializeSreViews().catch(e => {
          this.logger.error(`❌ Fallo en inicialización de fondo: ${e.message}`);
        });

        return;
      } catch (e) {
        attempts++;
        const delay = attempts * 2000;
        this.logger.error(`❌ Intento ${attempts}/${MAX_RETRIES} fallido al conectar a Supabase. Reintentando en ${delay/1000}s...`);
        if (attempts >= MAX_RETRIES) {
          this.logger.error('🚨 ERROR FATAL: No se pudo conectar a la base de datos tras 5 intentos.');
          // Don't exit immediately, let Nest trial continue if possible, or use a health check
          return; 
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * REGLA SRE: Inicializar Vistas Materializadas en segundo plano
   */
  private async initializeSreViews() {
    try {
      this.logger.log('🏗️ Sincronizando Vistas Materializadas (Master Sync)...');
      const fs = require('fs');
      const path = require('path');
      const viewsFile = path.resolve(process.cwd(), 'prisma/views.sql');
      
      if (!fs.existsSync(viewsFile)) {
        this.logger.warn('⚠️ No se encontró prisma/views.sql. Saltando.');
        return;
      }

      const sql = fs.readFileSync(viewsFile, 'utf8');
      const queries = sql.split(';').map((q: string) => q.trim()).filter((q: string) => q.length > 0);
      
      for (const query of queries) {
        await this.$executeRawUnsafe(query).catch(e => {
          if (!e.message.includes('already exists')) {
            this.logger.error(`Error SQL en vista: ${e.message}`);
          }
        });
      }
      this.logger.log('✅ Master Sync Views configuradas.');
    } catch (viewError) {
      this.logger.error(`❌ Fallo al cargar script de vistas: ${viewError.message}`);
    }
  }

  // REGLA SRE: Cerrar conexiones zombie al re-desplegar en EasyPanel
  async onModuleDestroy() {
    this.logger.log('🔌 Cierre de conexiones al Pooler solicitado (Shutdown/Redeploy)...');
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
