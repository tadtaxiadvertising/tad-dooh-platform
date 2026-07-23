// ─────────────────────────────────────────────────────────────────────────────
//  TAD REMOTION SKILL — Export Agent
//  Genera todos los artefactos de publicación desde el proyecto aprobado.
//  Salida: SRT, ASS, JSON de metadata multi-plataforma, título, descripción, hashtags.
// ─────────────────────────────────────────────────────────────────────────────

import { Platform, VideoProject } from '../types';
import { factCheck } from './research-agent';
import { ContentType } from '../types';

// ─── Exportar subtítulos SRT ──────────────────────────────────────────────────

export function exportSRT(project: VideoProject): string {
  const lines: string[] = [];
  let index = 1;

  for (const scene of project.scenes) {
    if (scene.subtitles.length === 0) {
      // Generar subtítulos desde voiceover cuando no existen cues dedicados
      const words = scene.voiceover;
      let subStart = scene.startSec;
      for (let i = 0; i < words.length; i += 6) {
        const batch = words.slice(i, i + 6);
        const subText = batch.map((w) => w.word).join(' ');
        const subEnd = Math.min(subStart + batch.length * 0.38, scene.startSec + scene.durationSec);
        lines.push(`${index++}\n${toSRTTime(subStart)}\n${toSRTTime(subEnd)}\n${subText}\n`);
        subStart = subEnd;
      }
      continue;
    }
    for (const cue of scene.subtitles) {
      lines.push(
        `${index++}\n${toSRTTime(cue.startSec)}\n${toSRTTime(cue.endSec)}\n${cue.text}\n`,
      );
    }
  }
  return lines.join('\n');
}

// ─── Exportar subtítulos ASS (estilo TikTok/Reels) ────────────────────────────

export function exportASS(project: VideoProject, platform: Platform): string {
  const isVertical = platform === 'tiktok' || platform === 'instagram' || platform === 'facebook';
  const playResX = isVertical ? 1080 : 1920;
  const playResY = isVertical ? 1920 : 1080;
  const marginV = isVertical ? 80 : 40;
  const fontSize = isVertical ? 52 : 36;

  let s = `[Script Info]\nTitle: ${project.title}\nScriptType: v4.00+\nPlayResX: ${playResX}\nPlayResY: ${playResY}\n`;
  s += `Timer: 100.0000\n\n[V4+ Styles]\n`;
  s += `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`;
  s += `Style: Default,Inter,Bold,${encodeASSColor(0xFFFFFF)},${encodeASSColor(0x00FFFF)},${encodeASSColor(0x000000)},${encodeASSColor(0x80000000)},-1,0,0,0,100,100,0,0,1,3,2,2,10,10,${marginV},1\n\n[Events]\n`;
  s += `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

  for (const scene of project.scenes) {
    const cueTexts = scene.subtitles.map((c) => c.text).join('\n');
    if (cueTexts) {
      s += `Dialogue: 0,${toASSTime(scene.startSec)},${toASSTime(scene.startSec + scene.durationSec)},Default,,0,0,0,,${cueTexts.replace(/\n/g, '\\N')}\n`;
    }
  }
  return s;
}

// ─── Exportar metadata multi-plataforma (JSON) ───────────────────────────────

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

export function exportMetadata(project: VideoProject, platform: Platform): PlatformMetadata {
  const hashtags = generateHashtags(project.theme, platform);
  const description = buildDescription(project);
  const descFC = factCheck([description]);

  const safeDescription = descFC.passed
    ? description
    : description.split(' ').slice(0, 40).join(' ');

  return {
    title: project.title,
    description: safeDescription,
    hashtags,
    postText: generatePostTexts(project),
    thumbnailPrompt: generateThumbnailPrompt(project),
  };
}

export function exportMetadataJSON(project: VideoProject, platform: Platform = 'tiktok'): string {
  const meta = exportMetadata(project, platform);
  return JSON.stringify(meta, null, 2);
}

// ─── Helpers de formato ───────────────────────────────────────────────────────

function toSRTTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function toASSTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.round((sec % 1) * 100);
  return `${String(h).padStart(1, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function encodeASSColor(hex: number): string {
  const b = hex & 0xFF;
  const g = (hex >> 8) & 0xFF;
  const r = (hex >> 16) & 0xFF;
  const a = 0x00; // full opacity for legacy ASS
  return `&H${a.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}`;
}

function buildDescription(project: VideoProject): string {
  const lines = [
    `¿Sabías que ${project.headline.toLowerCase()}?`,
    `En este video exploramos la ciencia detrás de la publicidad en movimiento.`,
    project.citations.length > 0
      ? `Basado en: ${project.citations[0].source}`
      : 'Contenido educativo generado por TAD Remotion Skill.',
    `Más en tad.do — Publicidad Digital en Taxis, República Dominicana.`,
  ];
  return lines.join('\n\n');
}

// ─── Generación de textos por plataforma ─────────────────────────────────────

function generatePostTexts(project: VideoProject): {
  instagram: string;
  tiktok: string;
  linkedin: string;
  facebook: string;
  youtube: string;
} {
  const baseHook = project.headline;

  return {
    instagram: `${baseHook}\n\nEn este video te explico algo que probablemente no habías pensado sobre la publicidad DOOH.\n\n¿Te has preguntado por qué algunas marcas se quedan grabadas en tu mente y otras no? 👇\n\n${project.citations.length > 0 ? `📚 Fuente: ${project.citations[0].source}` : ''}\n.\n#DOOH #PublicidadDigital #TAD #RepublicaDominicana #Marketing`,
    tiktok: `${baseHook} 👀\n\nLa próxima vez que subas a un taxi, mira la pantalla. Lo que pasa ahí tiene explicación científica.\n\n#fyp #DOOH #marketingtips #publicidad #TAD`,
    linkedin: `${baseHook}\n\nEn el mundo de la publicidad DOOH (Digital Out of Home), la atención es el activo más escaso. Comparto un análisis basado en evidencia sobre cómo funciona la recordación publicitaria en entornos de movilidad.\n\n${project.citations.length > 0 ? `Fuente: ${project.citations[0].source}` : ''}\n\n¿Has considerado este canal para tu estrategia de marca?\n\n#DOOH #PublicidadDigital #MarketingEstratégico #TAD #LatAm`,
    facebook: `${baseHook}\n\nLa publicidad DOOH está transformando la manera en que las marcas llegan a su audiencia en República Dominicana.\n\nTe explico por qué funciona y por qué deberías considerarlo.\n\n${project.citations.length > 0 ? `Fuente: ${project.citations[0].source}` : ''}\n\nComenta abajo qué opinas 👇`,
    youtube: `${baseHook}\n\nEn este video corto analizamos:\n✅ La ciencia detrás de la recordación publicitaria\n✅ Por qué DOOH en taxis domina otros formatos\n✅ Qué significa para tu marca\n\nSuscríbete para más contenido sobre marketing y publicidad en RD.\n\nTimestamps:\n00:00 Intro\n00:08 El dato que cambiará tu perspectiva\n\n${project.citations.length > 0 ? `Referencias: ${project.citations[0].source}` : ''}`,
  };
}

// ─── Hashtags por plataforma ──────────────────────────────────────────────────

function generateHashtags(theme: ContentType, platform: Platform): string[] {
  const general = ['DOOH', 'PublicidadDigital', 'TAD', 'RepublicaDominicana', 'Marketing'];
  const themeSpecific: Record<ContentType, string[]> = {
    'why-diesel': ['NeuroMarketing', 'Recordacion', 'PsicologiaDelConsumidor'],
    'attention-economy': ['EconomiaDeAtencion', 'AtencionSelectiva', 'MarketingDigital'],
    'brain-ad': ['Neurociencia', 'BrainMarketing', 'PublicidadCientifica'],
    'dead-time': ['OOH', 'PublicidadOutOfHome', 'TaxiAdvertising'],
    'impossible-to-ignore': ['PsychologyOfAttention', 'AttentionCapture', 'DOOH2025'],
    'myth-busting': ['MitosDOOH', 'RealidadDOOH', 'PublicidadRD'],
    'explainer': ['QueEsDOOH', 'GuiaDOOH', 'DOOHSimple'],
     'driver-recruit': ['ConductoresRD', 'TADDriver', 'GanaConTuTaxi', 'EmpleoRD', 'OportunidadLaboral'],
    };
  const specific = themeSpecific[theme] ?? [];
  return [...general, ...specific].slice(0, 15);
}

// ─── Prompt para miniaturas / B-roll ─────────────────────────────────────────

function generateThumbnailPrompt(project: VideoProject): string {
  const hook = project.headline;
  return `YouTube thumbnail / TikTok cover (1080x1920, high contrast, premium quality). Dark background (#0a0a0b). A glowing smartphone/holographic screen centered. Text overlay: "${hook.toUpperCase()}" in bold white sans-serif with glowing accent. Taxi city silhouette visible through particles in background. Premium agency look. Apple / Stripe design aesthetic. --no ugly, no cartoon, no cheap`.trim();
}
