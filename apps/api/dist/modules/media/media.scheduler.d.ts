import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
export declare class MediaScheduler {
    private readonly prisma;
    private readonly supabaseService;
    private readonly logger;
    constructor(prisma: PrismaService, supabaseService: SupabaseService);
    handleOrphanCleanup(): Promise<void>;
}
