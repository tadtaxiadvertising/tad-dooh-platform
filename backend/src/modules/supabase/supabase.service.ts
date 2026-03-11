// backend/src/modules/supabase/supabase.service.ts
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
    );
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
}
