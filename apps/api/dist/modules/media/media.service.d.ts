import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
export declare class MediaService {
    private readonly config;
    private readonly prisma;
    private readonly supabaseService;
    private readonly logger;
    private supabase;
    constructor(config: ConfigService, prisma: PrismaService, supabaseService: SupabaseService);
    generateHash(buffer: Buffer): any;
    generateUploadUrl(fileName: string, fileType: string): Promise<{
        uploadUrl: any;
        path: string;
        publicUrl: string;
    }>;
    registerBypassedMedia(data: any): Promise<{
        fileSize: number;
        id: string;
        name: string | null;
        status: string;
        createdAt: Date;
        campaign_id: string | null;
        url: string | null;
        filename: string | null;
        originalFilename: string | null;
        mime_type: string | null;
        mimeType: string | null;
        size: bigint | null;
        durationSeconds: number | null;
        width: number | null;
        height: number | null;
        storageKey: string | null;
        cdnUrl: string | null;
        hash: string | null;
        hashMd5: string | null;
        hashSha256: string | null;
        qrUrl: string | null;
    }>;
    registerFileMock(dto: {
        originalname: string;
        mimetype: string;
        size: number;
    }): Promise<{
        id: string;
        url: string;
        size: number;
        mime: string;
    }>;
    listFiles(): Promise<{
        id: string;
        url: string;
        filename: string;
        originalFilename: string;
        size: number;
        mime: string;
        qrUrl: string;
        createdAt: Date;
    }[]>;
    getMediaStatus(mediaId: string): Promise<{
        media_id: string;
        active_devices_count: number;
        active_devices: string[];
        last_activity: Date;
    }>;
    updateMedia(id: string, data: {
        qrUrl?: string;
    }): Promise<{
        fileSize: number;
        id: string;
        name: string | null;
        status: string;
        createdAt: Date;
        campaign_id: string | null;
        url: string | null;
        filename: string | null;
        originalFilename: string | null;
        mime_type: string | null;
        mimeType: string | null;
        size: bigint | null;
        durationSeconds: number | null;
        width: number | null;
        height: number | null;
        storageKey: string | null;
        cdnUrl: string | null;
        hash: string | null;
        hashMd5: string | null;
        hashSha256: string | null;
        qrUrl: string | null;
    }>;
    deleteFile(id: string): Promise<{
        success: boolean;
    }>;
}
