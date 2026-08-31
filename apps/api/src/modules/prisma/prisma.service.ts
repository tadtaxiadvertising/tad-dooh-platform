import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    let url = process.env.DATABASE_URL;
    let warnMsg: string | undefined;
    // SRE v12.1.1: Default 5 connections para Supabase Free Tier en EasyPanel.
    // 20 conexiones puede agotar el pool durante CRON bursts + heartbeat storms.
    if (url && !url.includes('connection_limit=')) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}connection_limit=5`;
    } else if (url && url.includes('connection_limit=')) {
      const match = url.match(/connection_limit=(\d+)/);
      if (match && parseInt(match[1]) > 10) {
        warnMsg = `⚠️ [SRE] connection_limit=${match[1]} detectado en DATABASE_URL. Recomendado: 5 para EasyPanel Free Tier.`;
      }
    }

    // SRE v12.2.5: pool_timeout=10s — evita que queries lentas bloqueen el pool durante spikes de telemetría
        if (url && !url.includes('pool_timeout=')) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}pool_timeout=10`;
        }

        // SRE: Forzar sslmode=require para Supabase Pooler (puerto 6543)
        // Sin esto, Prisma 5.x no puede conectarse al pooler transaccional de Supabase
        if (url && !url.includes('sslmode=')) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}sslmode=require`;
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

    if (warnMsg) {
      this.logger.warn(warnMsg);
    }
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
              const errMsg = e instanceof Error ? e.message : String(e);
              this.logger.error(`❌ Intento ${attempts}/${MAX_RETRIES} fallido: ${errMsg}`);
              if (attempts >= MAX_RETRIES) {
                this.logger.error('🚨 ERROR FATAL: No se pudo conectar a la base de datos tras 5 intentos.');
                this.logger.error(`Último error: ${errMsg}`);
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
      const viewsFile = path.resolve(process.cwd(), 'prisma/views.sql');

      if (!fs.existsSync(viewsFile)) {
        this.logger.warn('⚠️ No se encontró prisma/views.sql. Saltando.');
        return;
      }

      const sql = fs.readFileSync(viewsFile, 'utf8');

      // PgBouncer (Supabase Pooler) no soporta multi-statement; dividimos
      // el SQL en statements individuales respetando bloques PL/pgSQL
      // con dollar-quoted strings ($$...$$).
      const statements = this.splitSqlStatements(sql);

      for (const query of statements) {
        await this.$executeRawUnsafe(query).catch(e => {
          if (!e.message.includes('already exists')) {
            this.logger.error(`Error SQL en vista: ${e.message}`);
          }
        });
      }
      this.logger.log('✅ Master Sync Views configuradas.');
    } catch (viewError) {
      this.logger.error(`❌ Fallo al cargar script de vistas: ${(viewError as Error).message}`);
    }
  }

  /**
   * Divide SQL en statements individuales respetando bloques de código
   * PL/pgSQL delimitados por $$ (dollar-quoted strings). El split simple
   * por `;` rompe definiciones de función en medio (CREATE FUNCTION ... $$).
   */
  private splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let dollarDepth = 0;
    for (let i = 0; i < sql.length; i++) {
      const c = sql[i];
      current += c;
      // Track dollar-quote depth: "$$" toggles inside/outside PL block
      if (c === '$' && i + 1 < sql.length && sql[i + 1] === '$') {
        dollarDepth++;
        i++;
        current += sql[i];
      } else if (c === ';' && dollarDepth % 2 === 0) {
        // Semicolon outside dollar-quoted block → statement boundary
        const trimmed = current.replace(/;\s*$/, '').trim();
        if (trimmed.length > 0) statements.push(trimmed + ';');
        current = '';
      }
    }
    const trimmed = current.trim();
    if (trimmed.length > 0) statements.push(trimmed);
    return statements;
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

  /**
   * Expose Prisma connectivity metrics for health monitoring.
   */
  async getHealthMetrics(): Promise<{ connected: boolean; activeConnections?: number }> {
    try {
      const result: any[] = await this.$queryRaw`
        SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = current_database()
      `;
      return {
        connected: true,
        activeConnections: Number(result[0]?.active_connections ?? 0),
      };
    } catch {
      return { connected: false };
    }
  }
}