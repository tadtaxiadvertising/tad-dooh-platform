import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient;

  constructor(private configService: ConfigService) {}

  getClient() {
    if (this.clientInstance) return this.clientInstance;

    const url = this.configService.get<string>('SUPABASE_URL') || 'https://ltdcdhqixvbpdcitthqf.supabase.co';
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || this.configService.get<string>('SUPABASE_KEY') || 'public-anon-key';

    this.clientInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('🚀 Supabase Client Initialized');
    return this.clientInstance;
  }
}
