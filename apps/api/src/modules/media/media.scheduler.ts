import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class MediaScheduler {
  private readonly logger = new Logger(MediaScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Limpieza de archivos huérfanos en Supabase Storage.
   * Se ejecuta cada día a las 3:00 AM AST.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleOrphanCleanup() {
    this.logger.log('🧹 Iniciando limpieza de archivos huérfanos en Storage...');
    
    try {
      const buckets = ['campaign-videos', 'ads-videos'];
      let deletedCount = 0;

      for (const bucket of buckets) {
        // 1. Obtener todos los archivos en el bucket (recursivamente si hay carpetas)
        const { data: files, error } = await this.supabaseService.getClient().storage.from(bucket).list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        });

        if (error || !files) {
          this.logger.warn(`No se pudo listar archivos en bucket ${bucket}: ${error?.message}`);
          continue;
        }

        // 2. Obtener todas las llaves de almacenamiento en uso en la DB
        const mediaKeys = await this.prisma.media.findMany({
          where: { storageKey: { not: null } },
          select: { storageKey: true }
        });
        
        const assetUrls = await this.prisma.mediaAsset.findMany({
          select: { url: true }
        });

        const activeKeys = new Set([
          ...mediaKeys.map(m => m.storageKey),
          ...assetUrls.map(a => {
            // Extraer el path del storage desde la URL si es posible
            // Formato esperado: .../bucket/path/to/file
            const parts = a.url.split(`/${bucket}/`);
            return parts.length > 1 ? parts[1] : null;
          }).filter(Boolean)
        ]);

        // 3. Identificar y borrar huérfanos con más de 24h de antigüedad
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const orphans = files.filter(f => {
          // Si es una carpeta (en Supabase list, las carpetas no tienen id o metadata regular)
          if (!f.id && !f.metadata) return false; 
          
          const isOlderThanADay = f.created_at ? new Date(f.created_at) < dayAgo : false;
          return !activeKeys.has(f.name) && isOlderThanADay;
        });

        if (orphans.length > 0) {
          const keysToDelete = orphans.map(o => o.name);
          const { error: delError } = await this.supabaseService.getClient().storage
            .from(bucket)
            .remove(keysToDelete);

          if (delError) {
            this.logger.error(`Error borrando huérfanos en ${bucket}: ${delError.message}`);
          } else {
            deletedCount += keysToDelete.length;
            this.logger.log(`✅ Borrados ${keysToDelete.length} archivos huérfanos en ${bucket}.`);
          }
        }
      }

      this.logger.log(`🏁 Resumen de limpieza: ${deletedCount} archivos eliminados.`);
    } catch (error) {
      this.logger.error(`❌ Fallo crítico en MediaScheduler: ${error.message}`);
    }
  }
}
