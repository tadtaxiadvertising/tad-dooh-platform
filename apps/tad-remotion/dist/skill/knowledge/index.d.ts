/**
 * Selective Attention: Cherry (1953) — los humanos filtran estímulos por
 * relevancia previa. En video, el primer frame debe activar un filtro de
 * relevancia para el espectador antes de que pierda interés.
 *
 * Bottom-Up vs Top-Down: La visión bottom-up reacciona a contrastes altos,
 * movimiento súbito y colores saturados. La top-down se activa cuando el
 * espectador anticipa contenido relevante.
 * → En redes sociales, bottom-up capta en <2s, top-down retiene.
 *
 * Cognitive Load Theory: Sweller (1988) — la memoria de trabajo humana solo
 * procesa 4±1 chunks de información simultáneos. Cada distractor visual
 * compite por estos recursos. Menos es exponencialmente mejor.
 *
 * Mere Exposure Effect: Zajonc (1968) — la repetición moderada (3-5
 * exposiciones) genera preferencia inconsciente en el espectador.
 *
 * Processing Fluency: Reber et al. (2004) — tu cerebro prefiere información
 * fácil de procesar. Tipografía legible + ritmo predecible = mayor confianza.
 *
 * Priming Effect: Bargh et al. (1996) — exponer a una persona a un
 * estímulo previo activa asociaciones en su memoria antes de ver el
 * estímulo objetivo. Usado para generar "aha-moments".
 *
 * Framing Effect: Tversky & Kahneman (1981) — la misma información
 * presentada como ganancia produce decisiones diferentes a cuando se
 * presenta como pérdida. En nuestro caso: siempre marcar ganancias.
 */
export declare const ATTENTION_KNOWLEDGE: {
    cherry1953: string;
    sweller1988: string;
    zajonc1968: string;
    reber2004: string;
    bargh1996: string;
    tversky1981: string;
    itti1998: string;
    desimone1995: string;
};
/**
 * Curiosity Gap Theory: Loewenstein (1994) — la brecha entre lo que sabemos
 * y lo que queremos saber genera un estado motivacional comparable a la
 * hambre física. Debe resolverse en el video mismo para ser satisfactoria.
 *
 * Zeigarnik Effect: Zeigarnik (1927); repl. por Wegge (2006) — las tareas
 * interrumpidas generan tensión cognitiva que se resuelve al completarse.
 * En video: preguntas abiertas (open loops) al inicio, cierre al final.
 *
 * Reward Prediction Error: Schultz et al. (1997) — la dopamina se libera
 * cuando el cerebro recibe una recompensa MEJOR de la esperada. Micro
 * recompensas cada 2-4 segundos maximizan retención.
 *
 * Peak-End Rule: Kahneman et al. (1993) — los humanos juzgan experiencias
 * por el pico más intenso y el estado final, no por el promedio total.
 * Cada video debe tener al menos 1 "pico emocional" y un final positivo.
 *
 * Information Gap Theory: Loewenstein (1994) — el mismo paper.
 */
export declare const MOTIVATION_KNOWLEDGE: {
    loewenstein1994: string;
    zeigarnik1927: string;
    schultz1997: string;
    kahneman1993: string;
};
/**
 * Robert Cialdini (2001, "Influence: Science and Practice") identifica 6
 * principios universales de persuasión. Todos aplican a contenido DOOH:
 *
 * 1. Reciprocidad: Dar valor educativo primero → genera deseo de devolver
 *    el favor (contacto, compra).
 * 2. Compromiso & Consistencia: un small yes inicial (like, comentario) →
 *    refuerza identidad → más probable la siguiente acción.
 * 3. Prueba Social: "X marcas ya confían" → validez social directa.
 * 4. Autoridad: Datos verificados, estudios citados, nombres profesionales.
 * 5. Simpatía: Similaridad + atractivo + halagos genuinos.
 * 6. Escasez: Plazos limitados, cupos exclusivos (15 slots por taxi).
 */
export declare const PERSUASION_KNOWLEDGE: {
    cialdini2001: string;
};
/**
 * AIDA (Lewis, 1898):
 *   Atención → Interés → Deseo → Acción
 *
 *   - Atención: hook en los primeros 2 segundos (frente a 8s de threshold)
 *   - Interés: dato sorprendente o historia personal
 *   - Deseo: visualizar el resultado positivo
 *   - Acción: CTA específico, no genérico
 *
 * PAS (Schwartz, 1954):
 *   Problema → Agitación → Solución
 *
 *   - Problema: identificar un dolor real ("tu publicidad se pierde en un mar de contenido")
 *   - Agitación: amplificar ese dolor ("inviertes sin saber quién la vio")
 *   - Solución: TAD como respuesta
 *
 * 4P (Perry, 1963; también Schiffman & Kanuk):
 *   Picture → Promise → Prove → Push
 *
 * BAB (Bodenmann):
 *   Before → After → Bridge
 *
 *   Visualizar el estado actual problemático, luego el estado ideal, y
 *   luego el puente (TAD) que lo conecta.
 */
export declare const COPYWRITING_KNOWLEDGE: {
    lewis1898: string;
    schwartz1954: string;
    perry1963: string;
};
/**
 * Pixar Story Spine (2000s, Emma Coats):
 *   "Once upon a time… Every day… One day… Because of that… Because of
 *   that… Because of that… Until finally…"
 *
 *   Aplica incluso en 15-30 segundos: 7 "beats" comprimidos.
 *
 * Hero's Journey (Campbell, 1949; Vogler, 1992):
 *   1. Ordinary World
 *   2. Call to Adventure
 *   3. Refusal of the Call
 *   4. Meeting the Mentor
 *   5. Crossing the First Threshold
 *   6. Tests, Allies, Enemies
 *   7. Approach
 *   8. Ordeal
 *   9. Reward
 *   10. The Road Back
 *   11. Resurrection
 *   12. Return with Elixir
 *
 * Story Arcs (Vonnegut, 1965):
 *   "Man in Hole" — empieza bien, cae, sale. Más compartible que el arco
 *   tradicional porque contiene Esperanza + Transformación.
 */
export declare const STORYTELLING_KNOWLEDGE: {
    campbell1949: string;
    vogler1992: string;
    vonnegut1965: string;
    coats2000: string;
};
/**
 * Disney's 12 Principles of Animation (Disney, 1930s; formalizados en
 * "The Illusion of Life" de Thomas & Johnston, 1981):
 *
 * 1. Squash & Stretch: da peso y elasticidad
 * 2. Anticipation: preparar al espectador (previene confusión)
 * 3. Staging: dirigir la mirada a un solo foco
 * 4. Straight Ahead / Pose to Pose
 * 5. Follow Through & Overlapping Action
 * 6. Slow In & Slow Out (ease-in/ease-out)
 * 7. Arcs
 * 8. Secondary Action
 * 9. Timing: 12 frames = 1 pose "hold"
 * 10. Exaggeration
 * 11. Solid Drawing
 * 12. Appeal
 *
 * Motion Curves: CSS/Remotion usa cubic-bezier;
 * para motion design, spring = físico más natural.
 */
export declare const MOTION_DESIGN_KNOWLEDGE: {
    thomasJohnston1981: string;
};
/**
 * NOTA: No hay un estudio científico único para estos números exactos.
 * Se derivan de análisis público de creadores verificado (Hootsuite 2024,
 * Buffer 2024, TikTok Creator Fund data) y recomendaciones oficiales.
 * Incluir en Citation como "Industry Analysis" cuando no haya DOI.
 */
export declare const RETENTION_DATA: {
    hookThreshold: {
        value: number;
        source: string;
    };
    idealCutInterval: {
        tiktok: number;
        instagram: number;
        linkedin: number;
        source: string;
    };
    textOnScreenRatio: {
        tiktok: number;
        instagram: number;
        linkedin: number;
    };
    optimalShortFormDuration: {
        tiktok: number[];
        instagram: number[];
        linkedin: number[];
    };
};
export declare function getResonanceScore(scene: {
    narrativeFunction: string;
    emotionTriggers: string[];
}): number;
//# sourceMappingURL=index.d.ts.map