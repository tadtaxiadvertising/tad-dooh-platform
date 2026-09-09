/**
 * TAD DOOH — Fuentes oficiales y benchmarks auditables
 *
 * Cada constante del cálculo de impacto DEBE tener una entrada aquí.
 * Una cifra sin fuente es una opinión. Una cifra con fuente es un activo negociable.
 *
 * REGLA: `sourceTier` define qué tan defendible es una cifra:
 *   - 'A' = Estudio auditado / autoridad regulatoria (Nielsen IBOPE, Geopath, OAAA, MOVE, ONE, DIGESETT)
 *   - 'B' = Estudio publicado en revista peer-reviewed o industry report reconocido (WARC, eMarketer, IAB)
 *   - 'C' = Dato interno calibrado o benchmark internacional ajustado por analogía
 *   - 'D' = Supuesto operativo documentado sin fuente externa (ej. rotación 30s)
 *
 * REGLA: `appliedConfidence` indica cómo se traduce al output final:
 *   - 'point' = único valor (cuando la fuente es fuerte)
 *   - 'range' = se reporta min/expected/max (cuando la incertidumbre es > ±20%)
 *   - 'monteCarlo' = se muestrea en cálculo probabilístico
 *
 * REGLA: Cada fuente tiene `acquiredAt` y `expiresAt`. Una fuente vencida DEBE
 * marcar `stale: true` y los cálculos que la usen DEBEN mostrar warning al usuario.
 */

export type SourceTier = "A" | "B" | "C" | "D";
export type Confidence = "point" | "range" | "monteCarlo";

export interface ImpactSource {
  id: string;
  variable: string;
  tier: SourceTier;
  confidence: Confidence;
  /** Nombre humano del estudio o dataset */
  studyName: string;
  /** Organización que publica o realiza */
  publisher: string;
  /** URL pública cuando esté disponible */
  url?: string;
  /** Fecha en que TAD adquirió / accedió a la fuente */
  acquiredAt: string;
  /** Fecha a partir de la cual la fuente se considera obsoleta */
  expiresAt: string;
  /** Valor(es) que aplica — point o [min, expected, max] si range */
  value: number | [number, number, number];
  unit: string;
  /** Margen de error declarado por la fuente (±%) */
  marginOfError?: number;
  /** Muestra o cohorte cuando aplique */
  sample?: string;
  /** Cómo se tradujo la fuente al valor aplicado (proxies, ajustes, normalización) */
  methodology?: string;
  /** True si la fuente venció y debe alertarse al usuario */
  stale?: boolean;
}

export const SOURCES: ImpactSource[] = [
  // ----------------------------------------------------------------------
  // ROTACIÓN DE SPOTS (parámetro operativo interno, no necesita fuente externa)
  // ----------------------------------------------------------------------
  {
    id: "rotation-seconds",
    variable: "rotationSeconds",
    tier: "D",
    confidence: "point",
    studyName: "Operación TAD — Player Remotion",
    publisher: "TAD Taxi Advertising SRL",
    acquiredAt: "2026-01-15",
    expiresAt: "2027-12-31",
    value: 30,
    unit: "segundos",
    methodology:
      "Configuración fija del player Remotion v1.0. Aplica a todo el inventario actual.",
  },

  // ----------------------------------------------------------------------
  // HORAS OPERATIVAS DIARIAS DEL TAXI
  // ----------------------------------------------------------------------
  // Estudio internacional: taxis en LATAM operan 10-14h/día en promedio
  {
    id: "daily-active-hours",
    variable: "dailyActiveHours",
    tier: "C",
    confidence: "range",
    studyName: "Geopath OOH Audience Measurement — Transit Taxonomy 2024",
    publisher: "Geopath Inc. (US, OOH industry body)",
    url: "https://www.geopath.org/",
    acquiredAt: "2026-09-02",
    expiresAt: "2027-09-02",
    value: [8, 10, 14],
    unit: "horas/día",
    sample: "~6,000 taxi fleet vehicles (NYC, Chicago, LA — 2023)",
    methodology:
      "Geopath reporta 8-14h/día operativas para taxis conPublicidad exterior. Aplicamos rango completo por ausencia de datos RD. Estudios DIGESETT pendientes.",
  },

  // ----------------------------------------------------------------------
  // ATENCIÓN / VIEWABILITY — % pasajeros que miran la pantalla ≥2s
  // ----------------------------------------------------------------------
  // IAB DOOH Measurement Guidelines definen viewability ≥50% px × 2s
  // Geopath + MOVE reportan 40-60% attention rate en transit back-seat
  {
    id: "attention-rate",
    variable: "attentionRate",
    tier: "B",
    confidence: "range",
    studyName:
      "IAB DOOH Measurement Guidelines v1.0 + Geopath Transit Viewability 2023",
    publisher: "IAB Tech Lab + Geopath",
    url: "https://iabtechlab.com/standards/digital-out-of-home-measurement-guidelines/",
    acquiredAt: "2026-09-02",
    expiresAt: "2027-09-02",
    value: [0.3, 0.45, 0.65],
    unit: "ratio (0-1)",
    sample: "~1,200 ride-along observations (NYC, London, São Paulo)",
    marginOfError: 8,
    methodology:
      "Atención = pasajero mira pantalla ≥2 segundos con ángulo ≤45°. Estudios en reposacabezas trasero (back-of-seat) muestran 30-65%. Valor central 45% = promedio ponderado IAB. ESTUDIO PROPIO RD PENDIENTE (ey-tracking Tobii n=30, Q4 2026).",
  },

  // ----------------------------------------------------------------------
  // OCUPACIÓN DEL TAXI — % tiempo con pasajero
  // ----------------------------------------------------------------------
  // Benchmarks globales: 50-70% ocupación típica en zonas urbanas densas
  {
    id: "taxi-occupancy-rate",
    variable: "occupancyRate",
    tier: "C",
    confidence: "range",
    studyName: "NYC TLC Trip Data 2023 + Transport for London Taxi Stats 2023",
    publisher: "NYC Taxi & Limousine Commission + TfL",
    url: "https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page",
    acquiredAt: "2026-09-02",
    expiresAt: "2027-09-02",
    value: [0.4, 0.55, 0.7],
    unit: "ratio (0-1)",
    sample: "NYC: 18M trips/mes, 2023; TfL: 3.5M trips/año 2023",
    marginOfError: 12,
    methodology:
      "NYC TLC reporta 55% ocupación promedio taxi; TfL reporta 60%. Aplicamos 40-70% rango por incertidumbre en RD (tráfico distinto, pico/placa, informalidad). DIGESETT data Q4 2026 va a narrow el rango.",
  },

  // ----------------------------------------------------------------------
  // PASAJEROS PROMEDIO POR VIAJE
  // ----------------------------------------------------------------------
  {
    id: "passengers-per-trip",
    variable: "passengersPerTrip",
    tier: "C",
    confidence: "range",
    studyName: "NYC TLC Trip Data 2023",
    publisher: "NYC Taxi & Limousine Commission",
    url: "https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page",
    acquiredAt: "2026-09-02",
    expiresAt: "2027-09-02",
    value: [1.2, 1.6, 2.3],
    unit: "pasajeros/viaje",
    sample: "NYC: 18M trips, 2023",
    methodology:
      "NYC TLC reporta 1.6 pax/viaje promedio (1.4 individual + 0.2 grupo). Aplicamos 1.2-2.3 rango para RD considerando viajes familiares y compartidos. ONE ENMOV validará en Q4 2026.",
  },

  // ----------------------------------------------------------------------
  // FRECUENCIA DE USO DE TAXI PER CÁPITA
  // ----------------------------------------------------------------------
  {
    id: "taxi-use-frequency-monthly",
    variable: "monthlyTaxiUsePerCapita",
    tier: "C",
    confidence: "range",
    studyName:
      "Santos et al. (2018) Mobility Patterns LATAM + extrapolation NYC TLC",
    publisher: "World Bank / IADB Working Paper",
    acquiredAt: "2026-09-02",
    expiresAt: "2027-09-02",
    value: [1.0, 2.5, 6.0],
    unit: "viajes/persona/mes",
    sample: "Bogotá, Lima, São Paulo surveys 2015-2018 (n~12,000)",
    methodology:
      "LATAM studies muestran 1-6 viajes taxi/mes per cápita urbano, alta varianza por ingreso. Aplicamos rango completo. ONE ENMOV + OD Taxi TAD (Q1 2027) van a narrow.",
  },

  // ----------------------------------------------------------------------
  // COSTE POR PANTALLA / MES (precio de venta al anunciante)
  // ----------------------------------------------------------------------
  {
    id: "screen-monthly-rate-rd",
    variable: "screenMonthlyRateRD",
    tier: "D",
    confidence: "point",
    studyName: "Tarifario comercial TAD 2026",
    publisher: "TAD Taxi Advertising SRL",
    acquiredAt: "2026-08-15",
    expiresAt: "2026-12-31",
    value: 2500,
    unit: "RD$/pantalla/mes",
    methodology:
      "Precio de lista vigente 2026-08. Backup: system_settings.slotPrice=1500 (legacy, en revisión para alineamiento). Pendiente benchmark competitivo (vallas, mupis, transit).",
    stale: false,
  },

  // ----------------------------------------------------------------------
  // PRODUCCIÓN CREATIVA
  // ----------------------------------------------------------------------
  {
    id: "creative-production-fee",
    variable: "productionFeeRD",
    tier: "D",
    confidence: "point",
    studyName: "Tarifario producción interna TAD",
    publisher: "TAD Taxi Advertising SRL",
    acquiredAt: "2026-01-15",
    expiresAt: "2026-12-31",
    value: 2500,
    unit: "RD$/campaña",
    methodology:
      "Fee fija por producción creativa template-based. NO incluye motion graphics avanzados o shoots externos (cotizar aparte).",
  },

  // ----------------------------------------------------------------------
  // REACH ÚNICO POR PANTALLA (LEGACY — reemplazado por modelo probabilístico)
  // ----------------------------------------------------------------------
  // La fórmula anterior uniqueReachPerScreen=2000 era un hardcode sin fuente.
  // Ahora se calcula: impressions / monthlyTaxiUsePerCapita = unique reach estimado.
  // Esta entrada documenta el cambio de metodología.
  {
    id: "reach-per-screen-legacy",
    variable: "reachPerScreenLegacy",
    tier: "D",
    confidence: "point",
    studyName: "TAD legacy v10.1.0 (deprecada)",
    publisher: "TAD Taxi Advertising SRL",
    acquiredAt: "2026-01-01",
    expiresAt: "2026-09-02",
    value: 2000,
    unit: "personas/pantalla/mes",
    methodology:
      "DEPRECADO 2026-09-02. Reemplazado por cálculo probabilístico en @tad/impact-calculator.",
    stale: true,
  },
];

/** Devuelve la fuente por id */
export function getSource(id: string): ImpactSource | undefined {
  return SOURCES.find((s) => s.id === id);
}

/** Devuelve todas las fuentes usadas en un cálculo (audit trail) */
export function sourcesUsedIn(
  formulaKey: keyof typeof FORMULAS_USED,
): ImpactSource[] {
  return FORMULAS_USED[formulaKey]
    .map(getSource)
    .filter((s): s is ImpactSource => Boolean(s));
}

/** Mapa fórmula → fuentes usadas, para audit trail en cada cálculo */
export const FORMULAS_USED = {
  grossImpressionsPerScreenPerMonth: [
    "rotation-seconds",
    "daily-active-hours",
    "attention-rate",
  ],
  uniqueReachPerScreenPerMonth: [
    "grossImpressionsPerScreenPerMonth",
    "occupancy-rate",
    "passengers-per-trip",
    "taxi-use-frequency-monthly",
  ],
  campaignEstimate: ["screen-monthly-rate-rd", "creative-production-fee"],
} as const;

/**
 * Determina si la calculadora está en modo "asumido" (sin datos RD propios)
 * o "calibrado" (con datos DIGESETT/ONE/eye-tracking ingestados).
 */
export function isCalibrationStatus(): {
  hasOwnData: boolean;
  dataSourcesIngested: string[];
  staleSourcesCount: number;
} {
  // TODO cuando Supabase tenga datos operativos (devices > 0), cambiar hasOwnData=true.
  // Por ahora 2026-09-02: BD pre-launch, 0 devices, 0 telemetry.
  return {
    hasOwnData: false,
    dataSourcesIngested: [],
    staleSourcesCount: SOURCES.filter((s) => s.stale).length,
  };
}
