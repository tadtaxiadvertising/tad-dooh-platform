// ─────────────────────────────────────────────────────────────────────────────
// TAD REMOTION SKILL — TikTok-style captioned scene alineado con @remotion/captions
// Sigue display-captions.md oficial: paginación, whitespace 'pre', highlight por palabra.
// ─────────────────────────────────────────────────────────────────────────────

import {
 AbsoluteFill,
 Sequence,
 useCurrentFrame,
 useVideoConfig,
 interpolate,
 Easing,
} from 'remotion';
import { createTikTokStyleCaptions } from '@remotion/captions';
import type { Caption, TikTokPage } from '@remotion/captions';

// ─── Ajustes visuales TAD (alineados a best practices Remotion) ──────────────

const FONT_FAMILY = "'Inter', 'Outfit', 'Segoe UI', sans-serif";

const HIGHLIGHT_COLOR = '#e51636'; // rojo TAD
const BASE_COLOR = '#ffffff';

const CAPTION_SWITCH_MS = 1100;

const CAPTIONS_BG =
 'linear-gradient(180deg, rgba(3,3,3,0.25) 0%, rgba(3,3,3,0.60) 55%, rgba(3,3,3,0.92) 100%)';

// ─── Página de subtítulo ────────────────────────────────────────────────────

const CaptionPage: React.FC<{ page: TikTokPage }> = ({ page }) => {
 const frame = useCurrentFrame();
 const { fps } = useVideoConfig();

 const currentTimeMs = (frame / fps) * 1000;
 const absoluteTimeMs = page.startMs + currentTimeMs;

 // Fade entrada palabra-activa con easing
 const wordHighlightOpacity = interpolate(
  absoluteTimeMs,
  [page.startMs, page.startMs + 80],
  [0.5, 1],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) },
 );

 return (
 <AbsoluteFill
 style={{
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: '0 64px 96px',
  pointerEvents: 'none',
 }}
>
 <div
 style={{
  fontSize: 46,
  fontWeight: 700,
  fontFamily: FONT_FAMILY,
  lineHeight: 1.25,
  textAlign: 'center',
  color: BASE_COLOR,
  whiteSpace: 'pre',
  maxWidth: 1140,
  width: '100%',
  padding: '18px 28px',
  borderRadius: 28,
  background: CAPTIONS_BG,
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
 }}
>
    {page.tokens.map((token) => {
     const isActive = token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;
     return (
      <span
       key={token.fromMs}
       style={{
        color: isActive ? HIGHLIGHT_COLOR : BASE_COLOR,
        opacity: isActive ? wordHighlightOpacity : 1,
        transition: 'color 80ms linear',
       }}
      >
       {token.text}
      </span>
     );
    })}
   </div>
  </AbsoluteFill>
 );
};

// ─── Escena con video fondo + subtítulos ────────────────────────────────────

interface CaptionedSceneProps {
 captions: Caption[];
 bgSrc?: string;
}

export const TADCanonicalCaptionedScene: React.FC<CaptionedSceneProps> = ({
 captions,
 bgSrc,
}) => {
 const { pages } = createTikTokStyleCaptions({
  captions,
  combineTokensWithinMilliseconds: CAPTION_SWITCH_MS,
 });

 return (
  <AbsoluteFill>
   {/* Fondo opcional (video o imagen) */}
   {bgSrc ? (
    <video
     src={bgSrc}
     style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }}
     muted
     playsInline
    />
   ) : (
    <AbsoluteFill
     style={{
      background:
       'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(229,22,54,0.08) 0%, transparent 60%)',
     }}
    />
   )}

   {/* Páginas de subtítulos alineadas al timeline */}
   {pages.map((page, index) => {
    const nextPage = pages[index + 1] ?? null;
    const { fps } = useVideoConfig();
    const startFrame = (page.startMs / 1000) * fps;
    const endFrame = nextPage
     ? (nextPage.startMs / 1000) * fps
     : startFrame + (CAPTION_SWITCH_MS / 1000) * fps;
    const durationInFrames = endFrame - startFrame;

    if (durationInFrames <= 0) return null;

    return (
     <Sequence
      key={page.startMs}
      from={startFrame}
      durationInFrames={durationInFrames}
     >
      <CaptionPage page={page as TikTokPage} />
     </Sequence>
    );
   })}
  </AbsoluteFill>
 );
};

export default TADCanonicalCaptionedScene;
