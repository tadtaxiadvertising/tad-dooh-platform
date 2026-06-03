import { MediaService } from './media.service';
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    getUploadUrl(fileName: string, fileType: string): Promise<{
        uploadUrl: any;
        path: string;
        publicUrl: string;
    }>;
    registerBypassed(body: any): Promise<{
        fileSize: number;
        id: string;
        name: string | null;
        status: string;
        createdAt: Date;
        filename: string | null;
        url: string | null;
        campaign_id: string | null;
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
    getMedia(): Promise<{
        id: string;
        url: string;
        filename: string;
        originalFilename: string;
        size: number;
        mime: string;
        qrUrl: string;
        createdAt: Date;
    }[]>;
    getStatus(id: string): Promise<{
        media_id: string;
        active_devices_count: number;
        active_devices: string[];
        last_activity: Date;
    }>;
    registerMockMedia(dto: {
        filename: string;
        mimetype: string;
        size: number;
    }): Promise<{
        id: string;
        url: string;
        size: number;
        mime: string;
    }>;
    deleteMedia(id: string): Promise<{
        success: boolean;
    }>;
    deleteMediaAlt(id: string): Promise<{
        success: boolean;
    }>;
    deleteMediaPost(id: string): Promise<{
        success: boolean;
    }>;
    updateMedia(id: string, dto: {
        qrUrl: string;
    }): Promise<{
        fileSize: number;
        id: string;
        name: string | null;
        status: string;
        createdAt: Date;
        filename: string | null;
        url: string | null;
        campaign_id: string | null;
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
}
