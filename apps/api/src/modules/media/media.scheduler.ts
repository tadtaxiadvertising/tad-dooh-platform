import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { SupabaseService } from "../supabase/supabase.service";

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
    // Fail closed until an independently restored media catalog and
    // Storage object-byte backup have been verified by the operator.
    if (
      process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL !==
      "AUTHORIZED_AFTER_VERIFIED_RESTORE"
    ) {
      this.logger.warn("STORAGE_GC_DISABLED_PENDING_RECOVERY");
      return;
    }
    this.logger.log(
      "🧹 Iniciando limpieza de archivos huérfanos en Storage...",
    );

    try {
      const buckets = ["campaign-videos", "ads-videos"];
      let deletedCount = 0;

      for (const bucket of buckets) {
        // 1. Obtener todos los archivos en el bucket (recursivamente si hay carpetas)
        const { data: files, error } = await this.supabaseService
          .getClient()
          .storage.from(bucket)
          .list("", {
            limit: 1000,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (error || !files) {
          this.logger.warn(
            `No se pudo listar archivos en bucket ${bucket}: ${error?.message}`,
          );
          continue;
        }

        // Supabase list("") is root-scoped and limited to one page.
        // A full page, folder entry or malformed file means this snapshot cannot
        // prove any absence. Never delete from an incomplete inventory.
        if (
          files.length >= 1000 ||
          files.some(
            (file) =>
              !file.id ||
              !file.metadata ||
              !file.name ||
              file.name.includes("/"),
          )
        ) {
          this.logger.warn("STORAGE_GC_SKIPPED_INCOMPLETE_BUCKET_INVENTORY");
          continue;
        }

        // 2. Obtener todas las llaves de almacenamiento en uso en la DB
        const mediaKeys = await this.prisma.media.findMany({
          where: { storageKey: { not: null } },
          select: { storageKey: true },
        });

        const assetUrls = await this.prisma.mediaAsset.findMany({
          select: { url: true },
        });

        // Empty catalogs cannot prove an object is unreferenced; the
        // current production catalog contains zero media/media_assets rows.
        if (mediaKeys.length === 0 && assetUrls.length === 0) {
          this.logger.warn("STORAGE_GC_SKIPPED_EMPTY_REFERENCE_CATALOG");
          continue;
        }

        const activeKeys = new Set<string>();
        let ambiguousReference = false;

        // storageKey has no bucket field in the current Prisma contract.
        // Preserve its exact path in either bucket rather than guessing.
        for (const media of mediaKeys) {
          const key = media.storageKey;
          if (
            typeof key !== "string" ||
            !key.trim() ||
            key.startsWith("/") ||
            key.includes("..") ||
            key.includes("\\")
          ) {
            ambiguousReference = true;
            break;
          }
          activeKeys.add(key);
        }

        // Parse the URL pathname, never split the entire URL: queries/fragments,
        // encoded names and unrelated CDN paths must not result in deletion.
        if (!ambiguousReference) {
          for (const asset of assetUrls) {
            try {
              const url = new URL(asset.url);
              if (url.protocol !== "https:" && url.protocol !== "http:") {
                throw new Error("INVALID_STORAGE_ASSET_PROTOCOL");
              }
              const match = url.pathname.match(
                /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
              );
              if (!match) throw new Error("UNKNOWN_STORAGE_ASSET_PATH");

              const refBucket = decodeURIComponent(match[1]);
              const refKey = decodeURIComponent(match[2]);
              if (
                !buckets.includes(refBucket) ||
                !refKey ||
                refKey.startsWith("/") ||
                refKey.includes("..") ||
                refKey.includes("\\")
              ) {
                throw new Error("INVALID_STORAGE_ASSET_REFERENCE");
              }
              if (refBucket === bucket) activeKeys.add(refKey);
            } catch {
              ambiguousReference = true;
              break;
            }
          }
        }

        if (ambiguousReference) {
          this.logger.warn("STORAGE_GC_SKIPPED_AMBIGUOUS_MEDIA_REFERENCE");
          continue;
        }

        // 3. Identificar y borrar huérfanos con más de 24h de antigüedad
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const orphans = files.filter((f) => {
          // Si es una carpeta (en Supabase list, las carpetas no tienen id o metadata regular)
          if (!f.id && !f.metadata) return false;

          const isOlderThanADay = f.created_at
            ? new Date(f.created_at) < dayAgo
            : false;
          return !activeKeys.has(f.name) && isOlderThanADay;
        });

        if (orphans.length > 0) {
          const keysToDelete = orphans.map((o) => o.name);
          const { error: delError } = await this.supabaseService
            .getClient()
            .storage.from(bucket)
            .remove(keysToDelete);

          if (delError) {
            this.logger.error(
              `Error borrando huérfanos en ${bucket}: ${delError.message}`,
            );
          } else {
            deletedCount += keysToDelete.length;
            this.logger.log(
              `✅ Borrados ${keysToDelete.length} archivos huérfanos en ${bucket}.`,
            );
          }
        }
      }

      this.logger.log(
        `🏁 Resumen de limpieza: ${deletedCount} archivos eliminados.`,
      );
    } catch (error) {
      this.logger.error(`❌ Fallo crítico en MediaScheduler: ${error.message}`);
    }
  }
}
