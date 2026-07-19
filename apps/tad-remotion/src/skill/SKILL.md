---
name: remotion-video-skill
description: Genera anuncios video DOOH de alta calidad para TAD Taxi Advertising combinando storytelling, neurociencia cognitiva, copywriting y motion design nativo Remotion. Toma un tema, produce un guión de 7 beats Pixar-spine comprimido a 15-45s, y lo renderiza como MP4 vertical (1080x1920) u horizontal (1920x1080) con motion profiles ejecutables por escena.
category: software-development
---

# Remotion Video Skill — TAD DOOH Platform

Skill de generación de anuncios video DOOH para taxis. Toma un `ContentType` (tema) + `Platform` + `totalSec` y produce un `VideoProject` con escenas listas para renderizar con Remotion.

## Estructura

```
src/skill/
├── types/              Contratos tipados (SceneSpec, VideoProject, MotionSceneProfile)
├── knowledge/          Conocimiento DOOH/TAD
├── psychology/         Modelos cognitivos (open-loop, peak-end, mere-exposure)
├── storytelling/       Engine: buildStory() → NarrativeBeat[] → beatsToSceneSpecs() → SceneSpec[]
├── copywriting/        Frameworks (PAS, AIDA, hook-open-loop)
├── visual/             Director visual por plataforma
├── agents/             Script writer agent
├── pipeline/           Orchestrator: input → story → scenes → render
├── remotion/
│   ├── components/     TadHook, KineticText, CounterAnim, GlowCard, TADCanonicalCaptionedScene
│   └── compositions/   TADCanonicalComposition, SceneCard, useSceneMotion
├── index.ts            API principal
└── storyteller.ts      Stub narrativo
```

## Pipeline

```
SkillInput → buildStory(theme, totalSec, platform) → NarrativeBeat[]
  → beatsToSceneSpecs(beats, fps) → SceneSpec[] (con motionProfile por escena)
  → Orchestrator → VideoProject
  → Remotion render → MP4
```

## Uso

```ts
import { buildStory, beatsToSceneSpecs } from './skill/storytelling/engine';

const beats = buildStory('why-diesel', 30, 'tiktok', 'persuasive');
const scenes = beatsToSceneSpecs(beats, 30);
// scenes[i].motionProfile = { component: 'TadHook', entrance: 'scale-spring', ... }
```

### Render

```bash
npx remotion render src/templates/index.tsx DynamicAd out/tad.mp4 --codec=h264 --fps=30
```

El `DEFAULT_PROJECT` en `compositions/tad-canonical.tsx` ya carga un seed con `buildStory('why-diesel', 30, 'tiktok')` para prueba inmediata.

## Motion Profiles por escena

Cada `SceneSpec.motionProfile` declara:
- `component`: TadHook | KineticText | CounterAnim | GlowCard | AcidAndGlowCard
- `entrance`: scale-spring | slide-in-right | blur-reveal | count-up | mask-reveal | spring-enter | zoom-in-spring | fade-in-up
- `sustain`: float | pulse-glow | parallax-y | tilt | drift
- `exit`: fade-out | slide-out-left | scale-out | mask-scale | mask-fade
- `timing`: snap | reveal | cinematic | data | message | scene
- `props`: pasa-through al componente Remotion

`useSceneMotion()` traduce los presets a `interpolate()` con `Easing.bezier()` clamp.

## Storytelling

7-beat Pixar Spine comprimido:
1. **hook** — captura atención (TadHook, scale-spring)
2. **open-loop** — pregunta abierta (KineticText, slide-in-right)
3. **revelation** — insight (GlowCard, blur-reveal)
4. **proof** — datos/counter (CounterAnim, count-up)
5. **calibration** — imagina (AcidAndGlowCard, spring-enter)
6. **takeaway** — mensaje final (KineticText, mask-reveal)
7. **cta** — call to action (GlowCard, zoom-in-spring)

Pacing por duración: `PIXAR_SPINE_TIMING = [0.10, 0.18, 0.30, 0.50, 0.70, 0.88, 1.00]`

## ContentTypes disponibles

- `why-diesel` — por qué DOOH genera recordación 3x
- `attention-economy` — economía de la atención
- `brain-ad` — neurociencia del DOOH
- `dead-time` — tiempo muerto como oportunidad
- `impossible-to-ignore` — 3 razones para no ignorar
- `myth-busting` — mitos del DOOH
- `explainer` — qué es DOOH

## Platforms

- `tiktok` 1080x1920 30fps 15-35s
- `instagram` 1080x1920 30fps 20-45s
- `facebook` 1080x1920 30fps 15-35s
- `linkedin` 1920x1080 30fps 40-90s
- `youtube` 1920x1080 30fps 15-35s

## Debug / Troubleshooting

- **TS2304 Cannot find name 'MotionSceneProfile'** → import desde `../types`
- **TS2559 entrance string incompatible con objeto** → usar presets string, no `{from,to}` ( compatibilidad futura)
- **`AcidAndGlowCard` no exportado** → importar `GlowCard` desde `AcidAndGlowCard.tsx`
- **TS1117 en `templates/tad-promo.tsx`** → template heredado, no bloquea `src/skill/**`
- **`npm run build` en OneDrive** → pausar sync o clonar fuera de OneDrive

## Verificación

```bash
cd apps/tad-remotion
npx tsc --noEmit          # typecheck
npm run -s build          # build completo
npx remotion render src/templates/index.tsx DynamicAd out/test.mp4 --codec=h264 --fps=30
```

## Próximos pasos

- [ ] Conexión TTS para voiceover sincronizado con captions
- [ ] Skia/Shapes para gráficos estadísticos (beat `proof`)
- [ ] Asset manifest real (íconos, partículas)
- [ ] Integración backend NestJS (`tad-api`) para render bajo demanda
- [ ] Multi-idioma (plantillas en EN)

## Convenciones

- TypeScript strict mode
- `interpolate` siempre con `extrapolateLeft/Right: 'clamp'` + `Easing.bezier()`
- Props nativas Remotion (`scale`, `translateY`) no strings CSS
- Estilo TAD: minimalista (Linear/Vercel), no cluttered
- Acentos de marca: `#e51636` (TAD red), `#fad400` (TAD yellow)
