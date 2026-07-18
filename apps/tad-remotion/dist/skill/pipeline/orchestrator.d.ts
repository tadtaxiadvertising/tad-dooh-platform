import { VideoProject, Platform, ContentType } from '../types';
export interface SkillPipelineInput {
    theme: ContentType | string;
    platform?: Platform;
    durationSec?: number;
    tone?: 'professional' | 'educational' | 'curious' | 'provocative';
    brand?: {
        name: string;
        colorPrimary?: string;
        colorSecondary?: string;
        tagline?: string;
        website?: string;
    };
}
export declare function runPipeline(input: SkillPipelineInput): Promise<VideoProject>;
export declare function getPipelineSummary(project: VideoProject): string;
//# sourceMappingURL=orchestrator.d.ts.map