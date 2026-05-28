import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
export declare class AssetsService {
    private readonly prisma;
    private readonly supabase;
    private readonly http;
    private readonly logger;
    private readonly REMOTION_URL;
    constructor(prisma: PrismaService, supabase: SupabaseService, http: HttpService);
    getAssetManifest(deviceId: string): Promise<{
        manifest: {};
        version: number;
    }>;
    handleAssetWebhook(payload: any): Promise<{
        received: boolean;
    }>;
    private triggerFallbackRender;
}
