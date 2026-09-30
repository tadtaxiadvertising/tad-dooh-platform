// backend/src/modules/supabase/supabase.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;
  private anonSupabase: SupabaseClient | undefined;

  constructor(private readonly configService: ConfigService) {
    // 1. Leemos estrictamente usando ConfigService, que asegura la prioridad de inyección
    const url = this.configService.get<string>("SUPABASE_URL");
    const key = this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY");

    // 2. Validación estricta - Crash temprano en lugar de error Unauthorized silencioso
    if (!url || !key) {
      this.logger.error(
        "CRITICAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is undefined!",
      );
      throw new Error(
        "MISSING_SUPABASE_CREDENTIALS: El contenedor no tiene acceso a las credenciales necesarias.",
      );
    }

    try {
      // 3. Inicialización optimizada
      this.supabase = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false, // Fundamental en backend NestJS (stateless)
        },
      });

      this.logger.log(
        `SupabaseService initialized | URL: ${url.substring(0, 30)}... | Key: ***${key.slice(-6)}`,
      );
    } catch (error) {
      this.logger.error(
        `Error fatal instanciando cliente Supabase: ${error.message}`,
      );
      throw error;
    }

    // 4. Cliente con clave pública (anon/publishable) para operaciones de login.
    //    GoTrue rechaza signInWithPassword cuando el request va firmado con la
    //    service_role key, por lo que el sign-in debe usar la clave anon.
    const anonKey =
      this.configService.get<string>("SUPABASE_ANON_KEY") ||
      this.configService.get<string>("SUPABASE_PUBLISHABLE_KEY");

    if (!anonKey) {
      this.logger.warn(
        "⚠️ SUPABASE_ANON_KEY no configurada — el login por password fallará.",
      );
    } else {
      try {
        this.anonSupabase = createClient(url, anonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
      } catch (error) {
        this.logger.error(
          `Error instanciando cliente anon de Supabase: ${error.message}`,
        );
      }
    }
  }

  // Genera una URL pública para el visualizador del Dashboard
  getPublicUrl(path: string, bucket: string = "campaign-videos") {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Sube un buffer (PDF, imagen, etc.) a un bucket privado/público y devuelve
   * la URL pública y el path almacenado. Regla SRE: crear bucket si no existe
   * (con fallback silencioso si ya existe) y nunca dejar el upload fallar
   * silenciosamente.
   */
  async uploadBuffer(params: {
    bucket: string;
    path: string;
    data: Buffer | Uint8Array;
    contentType?: string;
    upsert?: boolean;
  }): Promise<{ path: string; publicUrl: string; size: number }> {
    const {
      bucket,
      path,
      data,
      contentType = "application/pdf",
      upsert = false,
    } = params;

    // 0. Auto-create del bucket si no existe (SRE — nunca continuar con bucket ausente)
    const { error: bucketError } = await this.supabase.storage
      .createBucket(bucket, { public: true })
      .catch((err) => ({ error: err }));
    if (
      bucketError &&
      !String(bucketError.message || "").includes("already exists")
    ) {
      throw new Error(`FALLÓ_CREAR_BUCKET ${bucket}: ${bucketError.message}`);
    }

    // 1. Subida del buffer
    const { error: uploadError } = await this.supabase.storage
      .from(bucket)
      .upload(path, data, {
        contentType,
        upsert,
        cacheControl: "3600",
      });
    if (uploadError) {
      throw new Error(`FALLÓ_UPLOAD ${path}: ${uploadError.message}`);
    }

    // 2. URL pública
    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return { path, publicUrl: urlData.publicUrl, size: data.length };
  }

  // Listar archivos para la vista /media
  async listMediaFiles(bucket: string = "campaign-videos"): Promise<
    Array<{
      name: string;
      id?: string;
      cacheControl?: string;
      contentType?: string;
      metadata?: Record<string, unknown>;
      url: string;
    }>
  > {
    const { data, error } = await this.supabase.storage.from(bucket).list("", {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) throw error;

    return data.map((file) => ({
      ...file,
      url: this.getPublicUrl(file.name, bucket),
    }));
  }

  getClient() {
    return this.supabase;
  }

  getAnonClient() {
    return this.anonSupabase;
  }

  /**
   * REGLA SRE 04: Realtime Sync — Emite un comando por un canal de Supabase.
   * Usado para WAKE_UP_CALL y comandos instantáneos a la flota.
   */
  async broadcastEvent(channelName: string, eventName: string, payload: any) {
    this.logger.log(
      `[REALTIME] Broadcasting ${eventName} to channel: ${channelName}`,
    );

    const channel = this.supabase.channel(channelName);

    return channel.httpSend(eventName, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }
}
