// backend/src/modules/supabase/supabase.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    // 1. Leemos estrictamente usando ConfigService, que asegura la prioridad de inyección
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    // 2. Validación estricta - Crash temprano en lugar de error Unauthorized silencioso
    if (!url || !key) {
      this.logger.error('CRITICAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is undefined!');
      throw new Error('MISSING_SUPABASE_CREDENTIALS: El contenedor no tiene acceso a las credenciales necesarias.');
    }

    try {
      // 3. Inicialización optimizada
      this.supabase = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false, // Fundamental en backend NestJS (stateless)
        }
      });

      this.logger.log(`SupabaseService initialized | URL: ${url.substring(0, 30)}... | Key: ***${key.slice(-6)}`);
    } catch (error) {
      this.logger.error(`Error fatal instanciando cliente Supabase: ${error.message}`);
      throw error;
    }
  }

  // Genera una URL pública para el visualizador del Dashboard
  getPublicUrl(path: string, bucket: string = 'campaign-videos') {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // Listar archivos para la vista /media
  async listMediaFiles(bucket: string = 'campaign-videos') {
    const { data, error } = await this.supabase.storage.from(bucket).list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) throw error;

    return data.map(file => ({
      ...file,
      url: this.getPublicUrl(file.name, bucket)
    }));
  }

  getClient() {
    return this.supabase;
  }

  /**
   * REGLA SRE 04: Realtime Sync — Emite un comando por un canal de Supabase.
   * Usado para WAKE_UP_CALL y comandos instantáneos a la flota.
   */
  async broadcastEvent(channelName: string, eventName: string, payload: any) {
    this.logger.log(`[REALTIME] Broadcasting ${eventName} to channel: ${channelName}`);
    
    const channel = this.supabase.channel(channelName);
    
    return channel.send({
      type: 'broadcast',
      event: eventName,
      payload: {
        ...payload,
        timestamp: new Date().toISOString()
      },
    });
  }
}
