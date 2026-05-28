import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class VideoGeneratorService {
    private readonly supabaseService;
    private readonly prisma;
    private readonly logger;
    constructor(supabaseService: SupabaseService, prisma: PrismaService);
    generateAdVideo(campaignId: string, props: {
        logoUrl: string;
        brandColor: string;
        primaryText: string;
        secondaryText: string;
    }): Promise<{
        success: boolean;
        url: string;
        assetId: string;
    }>;
}
