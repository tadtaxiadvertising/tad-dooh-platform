import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private readonly configService;
    private readonly logger;
    private supabase;
    private anonSupabase;
    constructor(configService: ConfigService);
    getPublicUrl(path: string, bucket?: string): string;
    listMediaFiles(bucket?: string): Promise<{
        url: string;
        name: string;
        id: string | null;
        updated_at: string | null;
        created_at: string | null;
        last_accessed_at: string | null;
        metadata: import("@supabase/storage-js").FileMetadata | null;
        bucket_id?: string;
        owner?: string;
        buckets?: import("@supabase/storage-js").Bucket;
    }[]>;
    getClient(): SupabaseClient<any, "public", "public", any, any>;
    getAnonClient(): SupabaseClient<any, "public", "public", any, any>;
    broadcastEvent(channelName: string, eventName: string, payload: any): Promise<{
        success: true;
    } | {
        success: false;
        status: number;
        error: string;
    }>;
}
