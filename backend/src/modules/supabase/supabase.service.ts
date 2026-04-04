// backend/src/modules/supabase/supabase.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://ltdcdhqixvbpdcitthqf.supabase.co';
    // For server-side auth validation (getUser), we MUST use the service_role_key.
    // The anon_key can only validate its own session, not arbitrary user tokens.
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

    if (!url || !key) {
      this.logger.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set! Auth will fail.');
    }

    this.supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    this.logger.log(`SupabaseService initialized | URL: ${url ? url.substring(0, 30) + '...' : 'MISSING'} | Key: ${key ? '***' + key.slice(-6) : 'MISSING'}`);
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
