import { Platform, VideoProject } from '../types';
export declare function exportSRT(project: VideoProject): string;
export declare function exportASS(project: VideoProject, platform: Platform): string;
export interface PlatformMetadata {
    title: string;
    description: string;
    hashtags: string[];
    postText: {
        instagram: string;
        tiktok: string;
        linkedin: string;
        facebook: string;
        youtube: string;
    };
    thumbnailPrompt: string;
}
export declare function exportMetadata(project: VideoProject, platform: Platform): PlatformMetadata;
export declare function exportMetadataJSON(project: VideoProject, platform?: Platform): string;
//# sourceMappingURL=export-agent.d.ts.map