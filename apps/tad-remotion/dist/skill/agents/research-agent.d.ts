import { ContentType, Citation, VideoProject } from '../types';
export declare const VERIFIED_STATS: Record<string, {
    value: string;
    source: string;
    year: number;
}>;
export declare function getStatsForTheme(theme: ContentType): Citation[];
export interface FactCheck {
    passed: boolean;
    failedClaims: string[];
    warnings: string[];
}
export declare function factCheck(claims: string[]): FactCheck;
export declare function buildCitations(theme: ContentType): Citation[];
export declare function applyResearch(input: {
    project: VideoProject;
    theme: ContentType;
}): VideoProject;
//# sourceMappingURL=research-agent.d.ts.map