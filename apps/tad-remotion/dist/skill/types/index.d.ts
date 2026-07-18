export type Platform = 'tiktok' | 'instagram' | 'facebook' | 'linkedin' | 'youtube';
export declare const PLATFORM_CONFIG: Record<Platform, {
    ratio: string;
    width: number;
    height: number;
    fps: number;
    maxDurationSec: number;
    optimalDurationSec: [number, number];
    idealCutIntervalSec: [number, number];
    textDensity: 'high' | 'medium' | 'low';
}>;
export type ContentType = 'why-diesel' | 'attention-economy' | 'brain-ad' | 'dead-time' | 'impossible-to-ignore' | 'myth-busting' | 'explainer';
export interface SceneSpec {
    /** ID único incremental (0-indexado) */
    id: number;
    /** Segundos de inicio absolutos */
    startSec: number;
    /** Duración en segundos */
    durationSec: number;
    /** Función narrativa dentro del arco de la historia */
    narrativeFunction: 'hook' | 'open-loop' | 'revelation' | 'micro-reward' | 'cliffhanger' | 'proof' | 'calibration' | 'curiosity-gap' | 'emotion-build' | 'takeaway' | 'cta';
    /** Objetivo cognitivo principal */
    cognitiveGoal: 'capture-attention' | 'hold-attention' | 'processing-fluency' | 'mere-exposure' | 'priming' | 'reward-prediction' | 'peak-end' | 'social-proof' | 'authority' | 'curiosity-gap' | 'open-loop';
    /** Texto narrado palabra por palabra con timestamps */
    voiceover: VoiceoverSegment[];
    /** Texto en pantalla principal */
    onScreenText: string;
    /** Subtítulos palabra por palabra */
    subtitles: SubtitleCue[];
    /** Descripción visual de la escena */
    visualDescription: string;
    /** Categorías de assets necesarios */
    assetsNeeded: AssetNeed[];
    /** Efectos de motion design */
    motionEffects: MotionEffect[];
    /** Color de acento principal de la escena */
    accentColor: string;
    /**心理hock técnico de Remotion a aplicar */
    remotionTechnique: RemotionTechnique;
    /** Triggres emocionales objetivo */
    emotionTriggers: EmotionTrigger[];
    /** Copywriting framework aplicado */
    copyFramework?: 'hook' | 'open-loop' | 'pas' | 'aida' | 'before-after' | 'story-spine';
}
export interface VoiceoverSegment {
    /** Palabra o frase breve */
    word: string;
    /** Duración en segundos */
    durationSec: number;
    /** Timestamp de inicio (calculado) */
    startSec: number;
}
export interface SubtitleCue {
    text: string;
    startSec: number;
    endSec: number;
}
export interface AssetNeed {
    type: 'icon' | 'gradient' | 'particle' | 'shader' | 'svg' | 'text' | 'shape' | 'number';
    description: string;
    /** Librería Remotion utilizada */
    library: string;
}
export type MotionEffect = 'spring-enter' | 'parallax-y' | 'scale-pulse' | 'slide-in-left' | 'slide-in-right' | 'fade-in' | 'kinetic-text' | 'counter-anim' | 'glow-pulse' | 'particle-drift' | 'blur-reveal' | 'mask-reveal' | 'camera-zoom';
export type RemotionTechnique = 'AbsoluteFill' | 'Sequence' | 'spring' | 'interpolate' | 'AnimatedSVG' | 'useCurrentFrame' | 'useVideoConfig' | 'OffthreadVideo' | 'Img' | 'Audio';
export type EmotionTrigger = 'curiosity' | 'surprise' | 'aha-moment' | 'social-proof' | 'authority' | 'reciprocity' | 'scarcity' | 'fomo' | 'empowerment' | 'relief';
export interface VideoProject {
    /** ID único del proyecto */
    projectId: string;
    /** Theme detectado por el Research Agent */
    theme: ContentType;
    /** Plataforma objetivo */
    platform: Platform;
    /** Título optimizado */
    title: string;
    /** Duración total en segundos */
    totalDurationSec: number;
    /** FPS */
    fps: number;
    /** FPS objetivo real */
    actualFps: number;
    /** Título / headline principal del guión */
    headline: string;
    /** Resumen narrativo de 3 frases */
    narrativeSummary: string;
    /** Guión completo escena por escena */
    scenes: SceneSpec[];
    /** Datos verificados citables */
    citations: Citation[];
    /** Metadatos multi-plataforma */
    metadata: PlatformMetadata;
    /** Assets organizados */
    assetManifest: AssetManifest;
    /** Código Remotion completo (formato string) */
    remotionCode: string;
    /** Estado QA final */
    qaReport: QAReport;
    /** Cuándo fue generado */
    generatedAt: string;
    /** Nivel de engagement objetivo */
    engagementTier?: 'informative' | 'persuasive' | 'authority';
}
export type EngagementTier = VideoProject['engagementTier'];
export type { NarrativeBeat } from '../storytelling/engine';
export interface Citation {
    claim: string;
    source: string;
    studyTitle?: string;
    authors?: string;
    year: number;
    doiOrUrl?: string;
    verified: boolean;
}
export interface PlatformMetadata {
    title: string;
    description: string;
    hashtags: string[];
    /** Texto para publicar en cada red */
    postText: {
        instagram: string;
        tiktok: string;
        linkedin: string;
        facebook: string;
        youtube: string;
    };
    thumbnailPrompt: string;
}
export interface AssetManifest {
    icons: string[];
    gradients: string[];
    audioMusic?: string;
    audioVoiceover?: string;
    customAssets: Array<{
        id: string;
        description: string;
        type: string;
        source: 'generated' | 'library';
    }>;
}
export interface QAReport {
    passed: boolean;
    checks: QACheck[];
    warnings: string[];
    errors: string[];
}
export interface QACheck {
    name: string;
    passed: boolean;
    detail: string;
    severity: 'error' | 'warning' | 'info';
}
export interface SkillInput {
    /** Tema solicitado por el usuario */
    theme: ContentType | string;
    /** Plataforma de destino */
    platform?: Platform;
    /** Duración deseada (segundos) */
    durationSec?: number;
    /** Tono del contenido */
    tone?: 'professional' | 'educational' | 'curious' | 'provocative';
    /** Incluir datos verificados */
    requireCitations?: boolean;
    /** Información de marca opcional */
    brand?: {
        name: string;
        colorPrimary: string;
        colorSecondary?: string;
        tagline?: string;
        website?: string;
    };
}
//# sourceMappingURL=index.d.ts.map