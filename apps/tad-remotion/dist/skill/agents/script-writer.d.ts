import { SceneSpec, NarrativeBeat, ContentType, Platform } from '../types';
import { ScriptQAReport } from '../storytelling/engine';
export interface ScriptWriterOutput {
    headline: string;
    scenes: SceneSpec[];
    narrativeSummary: string;
    scriptQA: ScriptQAReport;
    cta: string;
    citationsAdded: string[];
}
export declare function scriptWriterAgent(beats: NarrativeBeat[], theme: ContentType, platform: Platform, fps?: number): ScriptWriterOutput;
//# sourceMappingURL=script-writer.d.ts.map