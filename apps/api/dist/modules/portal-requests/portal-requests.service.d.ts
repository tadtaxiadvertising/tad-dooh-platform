import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
export declare class PortalRequestsService {
    private readonly prisma;
    private readonly supabase;
    private readonly logger;
    constructor(prisma: PrismaService, supabase: SupabaseService);
    create(data: {
        advertiserId?: string;
        driverId?: string;
        campaignId?: string;
        type: string;
        title: string;
        description?: string;
        data?: any;
    }): Promise<any>;
    findAll(): Promise<any>;
    findByAdvertiser(advertiserId: string): Promise<any>;
    findByDriver(driverId: string): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, updateData: {
        status?: string;
        adminNotes?: string;
    }): Promise<any>;
    remove(id: string): Promise<any>;
    private validateMediaUrl;
}
